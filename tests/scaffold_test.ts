import { uint8ArrayToString } from "../src/utils.ts";
import { assertSnapshot, describe, it } from "./deps.ts";
import { run } from "./helpers.ts";

describe("scaffold", () => {
  it("can display help", async (t) => {
    const command = run(["--help"], { stdout: "piped" });
    const output = uint8ArrayToString(await command.output());
    command.close();

    await assertSnapshot(t, output);
  });
});
