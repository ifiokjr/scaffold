import { createMatcher } from "../src/utils/create_matcher.ts";
import { assertEquals, describe, it } from "./deps.ts";

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
