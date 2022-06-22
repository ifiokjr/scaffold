import { path } from "./deps/path.ts";
import { GlobError } from "./errors.ts";
import {
  getPath,
  normalize,
  normalizeDirectory,
  removeUndefined,
} from "./utils.ts";
import {
  createMatcher,
  CreateMatcherOptions,
  Match,
  MatchFunction,
} from "./utils/create_matcher.ts";

export interface GlobProps extends CreateMatcherOptions, BaseGlobProps {
  /**
   * The search will be resolved from this directory and relative paths in the
   * GlobEntry are relative to this path.
   *
   * @default process.cwd()
   */
  cwd: string | URL;

  /**
   * Provide matchers to match by the file / directory name relative to the
   * `cwd`.
   *
   * If left undefined, all files and directories will be matched. This is the
   * equivalent of setting
   *
   * ```ts
   * matches: ['**']
   * ```
   *
   * In order to ignore files lead the glob with a `!`.
   *
   * ```ts
   * matches: ['!node_modules/**', '**']
   * ```
   *
   * The above will ignore all files and directories in the `node_modules`
   * directory.
   *
   * @default ['**']
   */
  include?: Match | Match[];

  /**
   * Any matching patterns will be excluded from the results.
   *
   * @default []
   */
  exclude?: Match | Match[];
}

/**
 * An async iterable for searching through the provided patterns relative to the
 * `cwd`.
 *
 * ```ts
 * import { glob } from '@monots/glob';
 *
 * for await (const entry of glob('packages', { matches: ['*.package.json'] })) {
 *   const contents = await fs.readFile(entry, 'utf8');
 *   const json = JSON.parse(contents);
 *
 *   if (json.name === "@monots/target") {
 *     // do something
 *     break;
 *   }
 * }
 * ```
 */
export async function* glob(options: GlobProps) {
  const props = { ...DEFAULT_OPTIONS, ...removeUndefined(options) };
  const cwd = getPath(props.cwd);
  const includer = createMatcher(props.include, props);
  const excluder = createMatcher(props.exclude, props);
  const extra = { cwd, includer, excluder };
  const directory = normalizeDirectory(cwd);

  yield* walkDirectory(directory, props.maxDepth, { ...props, ...extra });
}

const DEFAULT_OPTIONS: Required<GlobProps> = {
  include: ["**/*"],
  exclude: [],
  extensions: null,
  cwd: Deno.cwd(),
  maxDepth: Number.POSITIVE_INFINITY,
  includeFiles: true,
  includeDirectories: true,
  followSymlinks: true,
  dot: false,
  junk: false,
  expandGlobs: true,
  disableNegation: false,
  emptyDirectories: false,
  trailingSlash: true,
  caseInsensitive: false,
  concurrent: false,
};

/** Create WalkEntry for the `path` asynchronously */
async function createGlobEntry(
  absolute: string,
  cwd: string,
  trailingSlash?: boolean,
): Promise<GlobEntry> {
  absolute = normalize(absolute);
  const { isDirectory, isFile, isSymlink } = await Deno.stat(absolute);
  absolute = isDirectory
    ? normalizeDirectory(absolute, trailingSlash)
    : absolute;
  const name = isDirectory
    ? normalizeDirectory(path.basename(absolute), trailingSlash)
    : path.basename(absolute);
  const relative = isDirectory
    ? normalizeDirectory(path.relative(cwd, absolute), trailingSlash)
    : path.relative(cwd, absolute);

  return { absolute, relative, name, isFile, isDirectory, isSymlink };
}

interface ShouldExcludeProps {
  path: string;
  includer?: MatchFunction;
  excluder?: MatchFunction;
}

/**
 * Determine whether an entry should be excluded from the results.
 */
function shouldInclude(props: ShouldExcludeProps): boolean {
  if (props.excluder?.(props.path) === true) {
    return false;
  }

  return props.includer?.(props.path) !== false;
}

export interface GlobEntry extends Deno.DirEntry {
  /**
   * The basename of the entry.
   */
  name: string;
  /**
   * The absolute path on the file system.
   */
  absolute: string;
  /**
   * The path relative to the provided `cwd`.
   */
  relative: string;
}

interface WalkDirectoryOptions extends Required<BaseGlobProps> {
  includer: MatchFunction;
  excluder: MatchFunction;
  cwd: string;
}

async function* walkDirectory(
  root: string,
  depth: number,
  options: WalkDirectoryOptions,
): AsyncGenerator<GlobEntry, void> {
  if (depth < 0) {
    return;
  }

  const relativeDirectory = path.relative(options.cwd, root);

  const includeProps = {
    excluder: options.excluder,
    includer: options.includer,
  };

  if (
    options.includeDirectories &&
    shouldInclude({ path: relativeDirectory, ...includeProps })
  ) {
    yield await createGlobEntry(root, options.cwd, options.trailingSlash);
  }

  if (
    depth < 1 ||
    !shouldInclude({ path: root, excluder: options.excluder })
  ) {
    return;
  }

  try {
    for await (const entry of Deno.readDir(root)) {
      let resolvedRoot = path.resolve(root, entry.name);
      let relativeRoot = path.relative(options.cwd, resolvedRoot);
      let { isSymlink, isDirectory } = entry;

      if (isSymlink) {
        if (!options.followSymlinks) {
          continue;
        }

        resolvedRoot = await Deno.realPath(resolvedRoot);
        relativeRoot = path.relative(options.cwd, resolvedRoot);
        ({ isSymlink, isDirectory } = await Deno.lstat(resolvedRoot));
      }

      if (isSymlink || isDirectory) {
        yield* walkDirectory(resolvedRoot, depth - 1, options);
      } else if (
        options.includeFiles &&
        shouldInclude({ path: relativeRoot, ...includeProps })
      ) {
        yield {
          name: path.basename(resolvedRoot),
          absolute: resolvedRoot,
          relative: relativeRoot,
          isDirectory: false,
          isSymlink: false,
          isFile: true,
        };
      }
    }
  } catch (error) {
    throw GlobError.wrap(error, root);
  }
}

interface BaseGlobProps {
  /**
   * Use this to limit the maximum depth `@monots/glob` will crawl to before
   * stopping.
   *
   * > By default, `@monots/glob` crawls recursively until the last directory.
   *
   * @default Infinity
   */
  maxDepth?: number;

  /**
   * Use this to resolve and recurse over all symlinks.
   *
   * > NOTE: This will affect crawling performance so use only if required.
   *
   * @default false
   */
  followSymlinks?: boolean;

  /**
   * Use this to include directories in the output.
   *
   * @default true
   */
  includeDirectories?: boolean;

  /**
   * Include files in the output.
   *
   * @default true
   */
  includeFiles?: boolean;

  /**
   * Mark directories with a trailing slash.
   *
   * @default true
   */
  trailingSlash?: boolean;

  /**
   * Match empty directories. This is not active when `onlyFiles` is `true`.
   */
  emptyDirectories?: boolean;

  /**
   * By default the async iterator is sequentially iterated. Setting this to
   * true will concurrently over the sub directories.
   *
   * @default false
   *
   * TODO add support for setting a number to denote the maximum number of
   * concurrent operations.
   *
   * @notYetImplemented
   */
  concurrent?: boolean;
}
