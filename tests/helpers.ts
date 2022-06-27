import { copy, readerFromIterable } from "../src/deps/std.ts";
import { glob, GlobProps } from "../src/glob.ts";
import { stringToUint8Array, uint8ArrayToString } from "../src/utils.ts";
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
      "scaffold.ts",
      ...args,
    ],
    ...options,
    cwd,
    env: { NO_COLOR: "1" },
  });
}

export async function runWithStdin(args: string[], stdin: string[]) {
  const process = Deno.run({
    cmd: ["deno", "task", "run", ...args],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
    env: { NO_COLOR: "1" },
    cwd,
  });

  const reader = readerFromIterable(
    stdin.map((value) => stringToUint8Array(value)),
  );

  const [output, error, bytesCopied, status] = await Promise.all([
    process.output(),
    process.stderrOutput(),
    copy(reader, process.stdin),
    process.status(),
  ]);
  process.stdin.close();
  process.close();

  return {
    output: uint8ArrayToString(output),
    error: uint8ArrayToString(error),
    bytesCopied,
    status,
  };
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

interface SnapshotFolderProps extends GlobProps {
  t: Deno.TestContext;
}

export async function snapshotDirectory(props: SnapshotFolderProps) {
  const { t, ...rest } = props;

  const iterator = glob(rest);
  const files: Record<string, string> = Object.create(null);

  for await (const file of iterator) {
    if (file.isDirectory) continue;
    files[file.relative] = await Deno.readTextFile(file.absolute);
  }

  await snapshot(t, files);
}
