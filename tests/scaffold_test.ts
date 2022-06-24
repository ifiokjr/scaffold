import { glob } from "../mod.ts";
import { VERSION } from "../src/constants.ts";
import { path } from "../src/deps/path.ts";
import { uint8ArrayToString } from "../src/utils.ts";
import { afterAll, assertEquals, describe, it } from "./deps.ts";
import { cwd, run, snapshot } from "./helpers.ts";

const needsRemoval: string[] = [];

afterAll(async () => {
  for (const file of needsRemoval) {
    await Deno.remove(file, { recursive: true });
  }
});

describe("scaffold", () => {
  it("can display help", async (t) => {
    const command = run(["--help"], { stdout: "piped" });
    const output = uint8ArrayToString(await command.output());
    command.close();

    await snapshot(t, output);
  });

  it("can display the version", async () => {
    const command = run(["-V"], { stdout: "piped" });
    const output = uint8ArrayToString(await command.output()).trim();
    command.close();

    assertEquals(output, VERSION);
  });

  it("can create templates from local folders", async (t) => {
    const target = path.join(
      cwd,
      "tests/fixtures/tmp",
      crypto.randomUUID(),
    );
    needsRemoval.push(target);
    const command = run(["./tests/fixtures/base", target], {
      stdout: "piped",
      stderr: "piped",
    });

    const [_, __] = await Promise.all([
      command.output(),
      command.stderrOutput(),
    ]);
    command.close();
    const iterator = glob({ cwd: target, dot: true, junk: true });
    const files: Record<string, string> = Object.create(null);

    for await (const file of iterator) {
      if (file.isDirectory) continue;
      files[file.relative] = await Deno.readTextFile(file.absolute);
    }

    await snapshot(t, files);
  });
});
