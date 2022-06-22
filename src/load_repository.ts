import { Cache, EmptyCache, RepositoryCache } from "./cache.ts";
import { ensureDir, ensureFile, move } from "./deps/fs.ts";
import { isString } from "./deps/npm.ts";
import { path } from "./deps/path.ts";
import {
  copy,
  type Logger,
  readerFromStreamReader,
  readLines,
  Untar,
} from "./deps/std.ts";
import type { LiteralUnion } from "./deps/types.ts";
import { LoadRepositoryError } from "./errors.ts";
import { createLogger } from "./logger.ts";
import { GitRepository, parseGitUrl } from "./parse.ts";
import { uint8ArrayToString } from "./utils.ts";
import { matchOne } from "./utils/match.ts";

/**
 * This is the default logger which only logs critical errors.
 */
const defaultLogger = createLogger({ name: "scaffold", levelName: "CRITICAL" });

export interface LoadRepositoryOptions {
  /** Provide a custom logger. This is the same logger that is used by the CLI.
   */
  log?: Logger;

  /**
   * A cache object which provides access to the directory.
   */
  cache?: Cache;
}

/**
 * Throws an error if the url can't be parsed.
 *
 * TODO(ifiokjr): add caching support
 * TODO(ifiokjr): add logging via deno std logging library
 */
export async function loadRepository(
  source: string,
  options: LoadRepositoryOptions = {},
) {
  const log = options.log ?? defaultLogger;
  // first: parse the provided source to get the full url
  const repo = parseGitUrl(source);
  const cache = options.cache ?? new EmptyCache();

  if (!repo) {
    throw new LoadRepositoryError(`could not parse ${source}`);
  }

  const hash = await getHash(repo);
  log.info("hash retrieved", hash);

  if (!hash) {
    log.warning("No hash found!");
    // TODO(ifiokjr): `did you mean to use...`
    throw new LoadRepositoryError(
      `the requested reference ${repo.ref} does not exist on the requested repository: ${repo.url}`,
    );
  }

  const key = cache.getKey(hash, repo);
  const hasCache = cache.has(key);
  const destination = cache.directory(key);

  log.debug("all the details", { key, hasCache, destination, repo });

  if (!hasCache) {
    log.info("download the directory to the temporary cache");

    if (repo.mode === "tar") {
      await getTar({ destination, hash, log, repo });
    } else {
      await gitClone({ destination, hash, log, repo });
    }
  }

  return { directory: destination, key, repo };
}

interface GetTarProps {
  destination: string;
  repo: GitRepository;
  hash: string;
  log: Logger;
}

async function gitClone(props: GetTarProps) {
  const { repo, destination, log, hash } = props;
  let tmp = destination;

  if (repo.subdirectory) {
    log.info("creating temporary directory", { tmp });
    tmp = await Deno.makeTempDir();
  }

  log.debug("cloning repository", repo);
  const cloneOutput = await Deno.run({
    cmd: ["git", "clone", repo.ssh, tmp],
    cwd: tmp,
    stdout: "piped",
  }).output();

  log.debug("successfully cloned", uint8ArrayToString(cloneOutput));

  const checkoutOutput = await Deno.run({
    cmd: ["git", "checkout", hash],
    cwd: tmp,
    stdout: "piped",
  }).output();
  log.debug(`checkout branch ${hash}`, uint8ArrayToString(checkoutOutput));

  log.debug("removing the .git directory", cloneOutput);
  await Deno.remove(path.join(tmp, ".git"), { recursive: true });

  if (repo.subdirectory) {
    const source = path.join(tmp, repo.subdirectory);
    log.info("moving subdirectory to destination", { source, destination });
    await move(source, destination, { overwrite: true });

    if (tmp !== destination) {
      await Deno.remove(tmp);
    }
  }
}

async function getTar(props: GetTarProps): Promise<void> {
  const { destination, repo, hash, log } = props;
  const url = repo.site === "gitlab"
    ? `${repo.url}/repository/archive.tar.gz?ref=${hash}`
    : repo.site === "bitbucket"
    ? `${repo.url}/get/${hash}.tar.gz`
    : `${repo.url}/archive/${hash}.tar.gz`;

  const subdirectory = `${repo.name}-${hash}${repo.subdirectory ?? ""}`;
  log.info("the subdirectory within the tar", { subdirectory });

  log.info("fetching the compressed tar", { url });
  const response = await fetch(url);
  const decompressedStream = response.body?.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const streamReader = decompressedStream?.getReader();

  if (!streamReader) {
    throw new LoadRepositoryError(`could not download ${url}`);
  }

  const tarballEntries = new Untar(readerFromStreamReader(streamReader));
  const promises: (() => Promise<void>)[] = [];

  for await (const entry of tarballEntries) {
    log.debug("processing the tarball entry", entry);
    const relative = path.relative(subdirectory, entry.fileName);
    log.debug("relative path:", { relative });

    if (relative.startsWith("..")) {
      log.debug("ignoring entry outside of subdirectory");
      continue;
    }

    const absolutePath = path.join(
      destination,
      relative,
    );

    if (entry.type === "directory") {
      promises.push(async () => {
        await ensureDir(absolutePath);
      });

      continue;
    }

    promises.push(async () => {
      log.debug("ensure that path exists", { absolutePath });
      await ensureFile(absolutePath);
      const file = await Deno.open(absolutePath, { write: true });
      log.debug("copying from", entry.fileName, "to", absolutePath);
      await copy(entry, file);
    });
  }

  await Promise.all(promises.map((fn) => fn()));
  log.debug("successfully downloaded and extracted the tarball", url);
}

async function getHash(repo: GitRepository): Promise<string | undefined> {
  for await (const reference of getGitReferences(repo)) {
    if (
      (repo.ref === "HEAD" && reference.type === "HEAD") ||
      repo.ref === reference.name ||
      repo.ref === reference.hash
    ) {
      return reference.hash;
    }
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
