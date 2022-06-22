import { isFunction, isString } from "../deps/npm.ts";
import { isJunk, path } from "../deps/path.ts";
import { globToRegExp, isGlob } from "../deps/std.ts";

export type MatchFunction = (source: string) => boolean;
export type Match = string | MatchFunction | RegExp;

export interface CreateMatcherOptions {
  /**
   * When a glob begins with `!` and the glob matches the source, the match will
   * be negated. Set this to `true` to disable the behavior.
   *
   * @default false
   */
  disableNegation?: boolean;

  /**
   * Expand the glob when it ends with `/`.
   *
   * @default false
   */
  expandGlobs?: boolean;

  /**
   * Set to true to make globs case insensitive.
   *
   * @default false
   */
  caseInsensitive?: boolean;

  /**
   * When true will match dot files and folders.
   *
   * @default false
   */
  dot?: boolean;

  /**
   * When true will match junk files
   *
   * @default false
   */
  junk?: boolean;

  /**
   * The extensions that can be matched. Setting this to anything other than an
   * empty array / or null will prevent matches on directories. Unless the
   * directory has an extension 🤷‍♀️.
   *
   * @default undefined
   */
  extensions?: string[] | null;
}
/**
 * Transform a pattern into a matching function.
 */

export function createMatcher(
  pattern: Match | Match[],
  options: CreateMatcherOptions = {},
): MatchFunction {
  const { disableNegation = false, expandGlobs = false } = options;
  const matchers = Array.isArray(pattern) ? pattern : [pattern].filter(Boolean);

  return (source) => {
    if (
      // Exit early if no matchers are provided.
      matchers.length === 0 ||
      // Exit early if the source is a dot file / folder.
      (
        !options.dot &&
        source.split(path.sep).some((part) => part.startsWith("."))
      ) ||
      // Exit early if the source is a junk file / folder.
      (
        !options.junk && (isJunk(source) || isJunk(path.basename(source)))
      ) ||
      // Exit early if not a valid extension.
      (
        options.extensions &&
        !options.extensions.some((extension) => source.endsWith(extension))
      )
    ) {
      return false;
    }

    let anyMatch = false;

    for (const matcher of matchers) {
      let match = false;
      // True when this is a string glob starting with `!`.
      let negated = false;

      if (isFunction(matcher)) {
        match = matcher(source) || match;
      } else if (isString(matcher) && !isGlob(matcher)) {
        match = matcher === source || match;
      } else {
        let regex: RegExp;

        if (isString(matcher)) {
          negated = disableNegation || matcher[0] === "!";
          regex = globToRegExp(
            `${negated ? matcher.slice(1) : matcher}${
              matcher.endsWith("/") && expandGlobs ? "**/*" : ""
            }`,
            { caseInsensitive: options.caseInsensitive },
          );
        } else {
          regex = matcher;
        }

        match = regex.test(source) || match;
      }

      if (match && disableNegation) {
        // exit early when a match is found and if negated return false.
        return true;
      }

      if (match && negated) {
        return false;
      }
      anyMatch = match || anyMatch;
    }

    return anyMatch;
  };
}
