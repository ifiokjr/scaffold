import { VERSION } from "../src/constants.ts";
import { path } from "../src/deps/path.ts";
import { uint8ArrayToString } from "../src/utils.ts";
import {
  afterAll,
  assertEquals,
  assertStringIncludes,
  describe,
  it,
} from "./deps.ts";
import { cwd, run, snapshotDirectory } from "./helpers.ts";

const needsRemoval: string[] = [];

afterAll(async () => {
  for (const file of needsRemoval) {
    try {
      await Deno.remove(file, { recursive: true });
    } catch {
      // ignore
    }
  }
});

describe("scaffold", () => {
  it("can display help", async () => {
    const command = run(["--help"], { stdout: "piped" });
    const output = uint8ArrayToString(await command.output());
    command.close();

    assertStringIncludes(output, "scaffold <repo> [folder]");
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

    const [_output, _error] = await Promise.all([
      command.output(),
      command.stderrOutput(),
    ]);
    command.close();

    await snapshotDirectory({ t, cwd: target, dot: true, junk: true });
  });

  it("fails when run with too many arguments", async () => {
    const target = path.join(
      cwd,
      "tests/fixtures/tmp",
      crypto.randomUUID(),
    );
    needsRemoval.push(target);
    const command = run(["./tests/fixtures/base", target, "one-too-many"], {
      stdout: "piped",
      stderr: "piped",
    });

    const [_, status, error] = await Promise.all([
      command.output(),
      command.status(),
      command.stderrOutput(),
    ]);
    command.close();

    assertStringIncludes(
      uint8ArrayToString(error),
      "error: Too many arguments: one-too-many",
    );

    assertEquals(status.code, 1);
  });
});
