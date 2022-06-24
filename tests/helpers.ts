import { assertSnapshot } from "./deps.ts";

export const cwd = new URL("..", import.meta.url).pathname;

export function run(
  args: string[],
  options: Pick<Deno.RunOptions, "stderr" | "stdout" | "stdin"> = {},
) {
  return Deno.run({
    cmd: [
      "deno",
      "run",
      "--unstable",
      "--allow-env",
      "--allow-net",
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "cli.ts",
      ...args,
    ],
    ...options,
    cwd,
  });
}

export function snapshot<Content>(t: Deno.TestContext, content: Content) {
  return assertSnapshot(t, content, {
    dir: "./snapshots",
    serializer: (actual) =>
      typeof actual === "string"
        ? actual
        : Deno.inspect(Array.isArray(actual) ? actual.sort() : actual, {
          colors: false,
          depth: 100,
          iterableLimit: Infinity,
          strAbbreviateSize: 100_000,
          trailingComma: true,
          sorted: true,
        }),
  });
}
