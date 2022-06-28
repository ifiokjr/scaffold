import { ensureDir } from "../src/deps/fs.ts";
import { path } from "../src/deps/path.ts";
import { writeJson } from "../src/utils.ts";
import { assertEquals, assertStringIncludes } from "./deps.ts";
import { runWithStdin, snapshotDirectory } from "./helpers.ts";

const cwd = new URL("../", import.meta.url).pathname;
const template = { deno: "ifiokjr/templates/deno#9fdf5e0" };
const ignore = !Deno.env.get("INTEGRATION");

Deno.test({
  name: `${template.deno} passes without permissions`,
  ignore,
}, async (t) => {
  const cacheDirectory = path.join(
    cwd,
    "tests/fixtures/tmp/deno-cache",
    crypto.randomUUID(),
  );
  const outputDirectory = await Deno.makeTempDir();
  const cmd = [
    "--debug",
    `--cache-dir=${cacheDirectory}`,
    template.deno,
    outputDirectory,
  ];
  const stdin = ["Awesome\r", "Brilliant\r", "\r", "\r"];
  // const { status, output, bytesCopied } =
  await runWithStdin(cmd, stdin);
  // assertEquals(status.success, true);

  await snapshotDirectory({ t, cwd: outputDirectory, dot: true, junk: true });

  // cleanup
  await Deno.remove(outputDirectory, { recursive: true });
  await Deno.remove(cacheDirectory, { recursive: true });
});

Deno.test({
  name: `${template.deno} passes with permissions`,
  ignore,
}, async (t) => {
  const cacheDirectory = path.join(
    cwd,
    "tests/fixtures/tmp/deno-cache",
    crypto.randomUUID(),
  );
  await ensureDir(cacheDirectory);
  const outputDirectory = await Deno.makeTempDir();
  await writeJson(
    path.join(
      cacheDirectory,
      "ifiokjr-templates-github---deno-9fdf5e0037d3f705c9d432bb76247c3fdf3611d9.json",
    ),
    { "env": [], "ffi": [], "read": [], "run": ["git", "deno"], "write": [] },
  );
  const cmd = [`--cache-dir=${cacheDirectory}`, template.deno, outputDirectory];

  const stdin = [
    "WithPermissions\r",
    "This is the best thing to know!\r",
    "\r",
    "\r",
  ];
  const { status } = await runWithStdin(cmd, stdin);
  assertEquals(status.success, true);

  await snapshotDirectory({
    t,
    cwd: outputDirectory,
    dot: true,
    junk: true,
    exclude: ["**/.git/", "!**/.git/COMMIT_EDITMSG", "!.git/HEAD"],
  });

  // cleanup
  await Deno.remove(outputDirectory, { recursive: true });
  await Deno.remove(cacheDirectory, { recursive: true });
});

Deno.test({
  name: `can create aliases`,
  ignore,
}, async (t) => {
  const cacheDirectory = path.join(
    cwd,
    "tests/fixtures/tmp/deno-cache",
    crypto.randomUUID(),
  );
  await ensureDir(cacheDirectory);
  const outputDirectory = await Deno.makeTempDir();
  await writeJson(
    path.join(
      cacheDirectory,
      "ifiokjr-templates-github---deno-9fdf5e0037d3f705c9d432bb76247c3fdf3611d9.json",
    ),
    { "env": [], "ffi": [], "read": [], "run": ["git", "deno"], "write": [] },
  );
  const alias = "deno";
  let cmd = ["alias", `--cache-dir=${cacheDirectory}`, alias, template.deno];
  const successResult = await runWithStdin(cmd, []);
  assertStringIncludes(successResult.output, "Alias created");
  assertEquals(successResult.status.success, true);

  const failureResult = await runWithStdin(cmd, []);
  assertStringIncludes(failureResult.output, "Alias already exists");
  assertEquals(failureResult.status.success, false);

  cmd = [`--cache-dir=${cacheDirectory}`, alias, outputDirectory];

  const stdin = [
    "WithPermissions\r",
    "This is the best thing to know!\r",
    "\r",
    "\r",
  ];
  const { status } = await runWithStdin(cmd, stdin);
  assertEquals(status.success, true);

  await snapshotDirectory({
    t,
    cwd: outputDirectory,
    dot: true,
    junk: true,
    exclude: ["**/.git/", "!**/.git/COMMIT_EDITMSG", "!.git/HEAD"],
  });

  // cleanup
  await Deno.remove(outputDirectory, { recursive: true });
  await Deno.remove(cacheDirectory, { recursive: true });
});
