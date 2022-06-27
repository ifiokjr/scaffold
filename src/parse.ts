import { LiteralUnion } from "./deps/types.ts";
import { matchOne } from "./utils/match.ts";

export interface GitRepository {
  site: string;
  user: string | undefined;
  name: string | undefined;
  ref: LiteralUnion<"HEAD", string>;
  url: string;
  ssh: string;
  subdirectory: string | undefined;
  mode: "tar" | "git";
}
const GIT_URL_REGEX =
  /^(?:(?:https:\/\/)?(?<urlSite>[^/:]+\.[^/:]+)\/|git@(?<gitSite>[^/:]+)[/:]|(?<namedSite>[^/]+):)?(?<user>[^\s/]+)\/(?<name>[^\s#/]+)(?:(?<subdirectory>(?:\/[^\s#/]+)+))?\/?(?:#(?<ref>.+))?/;

/**
 * From the provided string, extract the hostname and the path.
 *
 * Adapted from https://github.com/Rich-Harris/degit/blob/64b80577acf3313b669840f7452800ee8d09fbf3/src/index.js#L327-L364
 */
export function parseGitUrl(source: string): GitRepository | undefined {
  const match = matchOne(source, GIT_URL_REGEX);

  if (!match) {
    return;
  }

  const { unnamed } = match;

  const site = (unnamed[0] || unnamed[1] || unnamed[2] || "github").replace(
    /\.(com|org)$/,
    "",
  );

  if (!SUPPORTED.has(site)) {
    return;
  }

  const user = unnamed[3];
  const name = unnamed[4]?.replace(/\.git$/, "");
  const subdirectory = unnamed[5];
  const ref = unnamed[6] || "HEAD";

  const domain = `${site}.${
    site === "bitbucket" ? "org" : site === "git.sr.ht" ? "" : "com"
  }`;
  const url = `https://${domain}/${user}/${name}`;
  const ssh = `git@${domain}:${user}/${name}`;
  const mode = SUPPORTED.has(site) ? "tar" : "git";

  return { site, user, name, ref, url, ssh, subdirectory, mode };
}

const SUPPORTED = new Set(["github", "gitlab", "bitbucket", "git.sr.ht"]);
