import { glob } from "../mod.ts";
import { path } from "../src/deps/path.ts";
import { describe, it } from "./deps.ts";
import { snapshot } from "./helpers.ts";

const cwd = path.fromFileUrl(new URL("fixtures/glob/", import.meta.url));

describe("glob", () => {
  it("should return all entries by default", async (t) => {
    const gathered: string[] = [];

    for await (const entry of glob({ cwd })) {
      gathered.push(entry.relative);
    }

    await snapshot(t, gathered);
  });

  it("should accept a function as a matcher", async (t) => {
    const gathered: string[] = [];

    for await (
      const entry of glob({
        include: (p) => !p.startsWith("first"),
        cwd,
        includeDirectories: false,
      })
    ) {
      gathered.push(entry.relative);
    }

    await snapshot(t, gathered);
  });

  it("should return no entries with empty array", async (t) => {
    const gathered: string[] = [];

    for await (const entry of glob({ include: [], cwd })) {
      gathered.push(entry.relative);
    }

    await snapshot(t, gathered);
  });

  it("returns the filtered entries when `include` option provided", async (t) => {
    const gathered: string[] = [];
    const include = ["**/*/*.md"];

    for await (
      const entry of glob({ include, cwd, includeDirectories: false })
    ) {
      gathered.push(entry.relative);
    }

    await snapshot(t, gathered);
  });

  it("should support returning `onlyDirectories`", async (t) => {
    const gathered: string[] = [];

    for await (const entry of glob({ includeFiles: false, cwd })) {
      gathered.push(entry.relative);
    }

    await snapshot(t, gathered);
  });
});
