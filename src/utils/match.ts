interface MatchResult<Names extends string = string> {
  /**
   * The named specifiers within the captured match result.
   */
  named: Record<Names, string | undefined>;

  /**
   * The unnamed specifiers within the captured match result. The first unnamed
   * capture has an index of 0.
   */
  unnamed: string[];

  /**
   * The full match result.
   */
  match: string;

  /**
   * The starting index of the matching result.
   */
  start: number;

  /**
   * The ending index of the matching result.
   */
  end: number;
}

/**
 * Find every named capture group and unnamed capture group in the given string.
 *
 * @param content the content to search for matches.
 * @param regex the regex which determines the matches. It must include a global `g` flag.
 */
export function* matchAll<Names extends string = string>(
  content: string,
  regex: RegExp,
): Generator<MatchResult<Names>, void, unknown> {
  for (const contentMatch of content.matchAll(regex)) {
    yield getResult(contentMatch);
  }
}

/**
 * Get the first match from the provided content.
 */
export function matchOne<Names extends string = string>(
  content: string,
  regex: RegExp,
): MatchResult<Names> | undefined {
  const contentMatch = content.match(regex);

  if (!contentMatch) {
    return;
  }

  return getResult(contentMatch);
}

function getResult<Named extends string = string>(
  value: RegExpMatchArray,
): MatchResult<Named> {
  const [match = "", ...unnamed] = value;
  const start = value.index ?? 0;
  const end = start + match.length;
  const named = value.groups ?? Object.create(null);

  return { match, unnamed, start, end, named };
}
