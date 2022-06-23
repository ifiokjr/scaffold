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
