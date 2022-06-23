import { parseGitUrl } from "../src/parse.ts";
import { assertSnapshot, describe, it } from "./deps.ts";

describe("parseGitUrl", () => {
  // Tests taken from https://github.com/Rich-Harris/degit/blob/64b80577acf3313b669840f7452800ee8d09fbf3/test/test.js#L43-L121
  const urls = {
    github: [
      "ifiokjr/scaffold#main",
      "test_org/test_repo",
      "github:test_org/test_repo",
      "git@github.com:test_org/test_repo",
      "https://github.com/test_org/test_repo.git",
    ],
    gitlab: [
      "gitlab:Rich-Harris/degit-test-repo",
      "git@gitlab.com:Rich-Harris/degit-test-repo",
      "https://gitlab.com/Rich-Harris/degit-test-repo.git",
    ],
    bitbucket: [
      "bitbucket:Rich_Harris/degit-test-repo",
      "git@bitbucket.org:Rich_Harris/degit-test-repo",
      "https://bitbucket.org/Rich_Harris/degit-test-repo.git",
    ],
    sourcehut: [
      "git.sr.ht/~satotake/degit-test-repo",
      "https://git.sr.ht/~satotake/degit-test-repo",
      "git@git.sr.ht:~satotake/degit-test-repo",
      "Rich-Harris/degit-test-repo/subdir",
    ],
    subdirectories: [
      "test_org/scaffold/subdir#v2.0.0",
      "Rich-Harris/degit-test-repo/subdir",
      "github:Rich-Harris/degit-test-repo/subdir",
      "git@github.com:Rich-Harris/degit-test-repo/subdir",
      "https://github.com/Rich-Harris/degit-test-repo.git/subdir",
    ],
  };

  for (const [name, namedUrls] of Object.entries(urls)) {
    for (const url of namedUrls) {
      it(`should parse ${name} url: ${url}`, async (t) => {
        await assertSnapshot(t, parseGitUrl(url));
      });
    }
  }
});
