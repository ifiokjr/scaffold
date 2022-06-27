import { Cache, EmptyCache } from "./cache.ts";
import { ensureDir, ensureFile, move } from "./deps/fs.ts";
import { path } from "./deps/path.ts";
import { copy, readerFromStreamReader, readLines, Untar } from "./deps/std.ts";
import type { LiteralUnion } from "./deps/types.ts";
import { LoadRepositoryError } from "./errors.ts";
import { GitRepository, parseGitUrl } from "./parse.ts";
import { matchOne } from "./utils/match.ts";

export interface LoadRepositoryOptions {
  /**
   * A cache object which provides access to the directory.
   */
  cache?: Cache;
}

export interface HashedGitRepository extends GitRepository {
  /**
   * The commit hash that this repository used.
   */
  hash: string;
}

interface LoadRepositoryReturn {
  /**
   * The absolute path to the repository in the cache folder.
   */
  directory: string;

  /**
   * The key used to identify the repository in the cache.
   */
  key: string;

  /**
   * The parsed repository with the latest commit hash.
   */
  repo: HashedGitRepository;

  /**
   * When `true` this is the first time this specific hash was downloaded.
   */
  isNew: boolean;
}

/**
 * Throws an error if the url can't be parsed.
 */
export async function loadRepository(
  source: string,
  options: LoadRepositoryOptions = {},
): Promise<LoadRepositoryReturn> {
  // first: parse the provided source to get the full url
  const repo = parseGitUrl(source);
  const cache = options.cache ?? new EmptyCache();

  if (!repo) {
    throw new LoadRepositoryError(`could not parse ${source}`);
  }

  const hash = await getHash(repo);

  if (!hash) {
    throw new LoadRepositoryError(
      `the requested reference ${repo.ref} does not exist on the requested repository: ${repo.url}`,
    );
  }

  const key = cache.getKey(hash, repo);
  const hasCache = cache.hasKey(key);
  const destination = cache.getDownloadPath(key);
  let isNew = false;

  if (!hasCache) {
    isNew = true;

    if (repo.mode === "tar") {
      await getTar({ destination, hash, repo });
    } else {
      await gitClone({ destination, hash, repo });
    }
  }

  return { directory: destination, key, repo: { ...repo, hash }, isNew };
}

interface GetTarProps {
  destination: string;
  repo: GitRepository;
  hash: string;
}

async function gitClone(props: GetTarProps) {
  const { repo, destination, hash } = props;
  let tmp = destination;

  if (repo.subdirectory) {
    tmp = await Deno.makeTempDir();
  }

  await Deno.run({
    cmd: ["git", "clone", repo.ssh, tmp],
    cwd: tmp,
    stdout: "piped",
  }).output();

  await Deno.run({
    cmd: ["git", "checkout", hash],
    cwd: tmp,
    stdout: "piped",
  }).output();

  await Deno.remove(path.join(tmp, ".git"), { recursive: true });

  if (repo.subdirectory) {
    const source = path.join(tmp, repo.subdirectory);
    await move(source, destination, { overwrite: true });

    if (tmp !== destination) {
      await Deno.remove(tmp);
    }
  }
}

async function getTar(props: GetTarProps): Promise<void> {
  const { destination, repo, hash } = props;
  const url = repo.site === "gitlab"
    ? `${repo.url}/repository/archive.tar.gz?ref=${hash}`
    : repo.site === "bitbucket"
    ? `${repo.url}/get/${hash}.tar.gz`
    : `${repo.url}/archive/${hash}.tar.gz`;

  const subdirectory = `${repo.name}-${hash}${repo.subdirectory ?? ""}`;

  const response = await fetch(url);
  const decompressedStream = response.body?.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const streamReader = decompressedStream?.getReader();

  if (!streamReader) {
    throw new LoadRepositoryError(`could not download ${url}`);
  }

  const tarballEntries = new Untar(readerFromStreamReader(streamReader));

  for await (const entry of tarballEntries) {
    const relative = path.relative(subdirectory, entry.fileName);

    if (relative.startsWith("..")) {
      continue;
    }

    const absolutePath = path.join(
      destination,
      relative,
    );

    if (entry.type === "directory") {
      await ensureDir(absolutePath);
      continue;
    }

    await ensureFile(absolutePath);
    const file = await Deno.open(absolutePath, { write: true });
    await copy(entry, file);
  }

  streamReader.releaseLock();
}

async function getHash(repo: GitRepository): Promise<string | undefined> {
  // shortened hashes that match are added here. If there is more than one
  // shortened match then this is an ambiguous reference. Throw an error.
  const shortened: string[] = [];

  for await (const reference of getGitReferences(repo)) {
    if (
      (repo.ref === "HEAD" && reference.type === "HEAD") ||
      repo.ref === reference.name ||
      repo.ref === reference.hash
    ) {
      return reference.hash;
    }

    if (
      reference.type !== "HEAD" &&
      reference.hash.length > 4 &&
      reference.hash.startsWith(repo.ref)
    ) {
      shortened.push(reference.hash);

      if (shortened.length > 1) {
        throw new LoadRepositoryError(
          `An ambiguous reference was provided: ${repo.ref}, which which matches multiple commits: ${
            shortened.join(", ")
          }`,
        );
      }
    }
  }

  const hash = shortened[0];

  if (hash) {
    return hash;
  }
}

const GITHUB_REFS_REGEX = /refs\/(?<type>\w+)\/(?<name>.+)/;

type GitReference = MainGitReference | NamedGitReference;

interface MainGitReference {
  type: "HEAD";
  name?: never;
  hash: string;
}

interface NamedGitReference {
  /**
   * The type of reference.
   *
   * This can be a branch / tag / pr or other type defined as part of the git
   * hosting provider.
   */
  type: LiteralUnion<"tag" | "pull" | "branch", string>;

  /**
   * The name of the reference.
   */
  name: string;

  /**
   * The hash of the reference.
   */
  hash: string;
}

/**
 * Get the git references from the provided git repository.
 */
export async function* getGitReferences(
  repo: GitRepository,
): AsyncGenerator<GitReference, void, unknown> {
  const stdout = Deno.run({
    cmd: ["git", "ls-remote", repo.url],
    stdout: "piped",
  }).stdout;

  try {
    for await (const line of readLines(stdout)) {
      const [hash, ref] = line.split("\t");

      if (!ref || !hash) {
        throw new LoadRepositoryError(
          `invalid hash: ${hash} and ref: ${ref} found for ${repo.url}`,
        );
      }

      if (ref === "HEAD") {
        yield { type: "HEAD", hash };
        continue;
      }

      const match = matchOne<"type" | "name">(ref, GITHUB_REFS_REGEX);

      if (!match?.named.type || !match?.named.name) {
        throw new LoadRepositoryError(
          `could not parse ref: ${ref} for ${repo.url}`,
        );
      }

      const name = match.named.name;
      const type = match.named.type === "heads"
        ? "branch"
        : match.named.type === "refs"
        ? "ref"
        : match.named.type === "tags"
        ? "tag"
        : match.named.type;

      yield { type, name, hash };
    }
  } catch (error) {
    throw new LoadRepositoryError(
      `could not fetch from the remote url: ${repo.url}`,
      [error],
    );
  }
}
