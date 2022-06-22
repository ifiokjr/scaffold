import { parseGitUrl } from "../src/parse.ts";
import { createMatcher } from "../src/utils/create_matcher.ts";
import { assertEquals, assertSnapshot, describe, it } from "./deps.ts";

describe("parseGitUrl", () => {
  const urls = [
    "ifiokjr/scaffold#main",
    "test_org/scaffold/subdir#v2.0.0",
    "test_org/test_repo",
    "github:test_org/test_repo",
    "git@github.com:test_org/test_repo",
    "https://github.com/test_org/test_repo.git",
  ];

  for (const url of urls) {
    it(`should parse url: ${url}`, async (t) => {
      await assertSnapshot(t, parseGitUrl(url));
    });
  }
});

describe("createMatcher", () => {
  it("supports functions", () => {
    const matcher1 = createMatcher((filename) => filename.endsWith(".txt"));
    assertEquals(matcher1("awesome.txt"), true);

    const matcher2 = createMatcher([(f) => f.endsWith("awesome.ts")]);
    assertEquals(matcher2("hello/awesome.ts"), true);

    const matcher3 = createMatcher([(f) => f == "awesome.ts"]);
    assertEquals(matcher3("hello/awesome.ts"), false);
  });

  it("supports globs", () => {
    const matcher1 = createMatcher("*.ts");
    assertEquals(matcher1("awesome.ts"), true);

    const matcher2 = createMatcher("**/*.ts");
    assertEquals(matcher2("hello/awesome.ts"), true);

    const matcher3 = createMatcher(["**/*.ts", "!**/*.d.ts"]);
    assertEquals(matcher3("hello/this/is/file.d.ts"), false);

    const matcher4 = createMatcher(["**/*.ts", "!**"], {
      disableNegation: true,
    });
    assertEquals(matcher4("hello/this/is/file.d.ts"), true);
  });

  it("supports regex", () => {
    const matcher1 = createMatcher(/\.ts$/);
    assertEquals(matcher1("awesome.ts"), true);
  });
});
