import { ensureFile } from "../../src/deps/fs.ts";
import { path } from "../../src/deps/path.ts";
import { copy, iterateReader, readerFromIterable } from "../../src/deps/std.ts";
import { glob } from "../../src/glob.ts";
import { stringToUint8Array, uint8ArrayToString } from "../../src/utils.ts";

const cwd = new URL("../..", import.meta.url).pathname;
console.log(cwd);

const iterator = glob({ cwd, include: ["**/*.ts"], includeDirectories: false });

const remotes = {
  first: {
    cmd: [
      "deno",
      "task",
      "run",
      "--cache-dir=./tests/fixtures/tmp/remote/first",
      "ifiokjr/templates/deno",
      "tests/fixtures/tmp/first",
    ],
    stdin: [
      "AwesomeProject\r\n",
      "Brilliant Description\r\n",
      "y\r\n",
      "y\r\n",
    ],
    stdout: "something here",
  },
};

for (const [name, data] of Object.entries(remotes)) {
  const process = Deno.run({
    cwd,
    cmd: data.cmd,
    stdin: "piped",
    stdout: "piped",
  });
  // if (process.stdin) {
  //   console.log("stdin exists!");
  // }

  const reader = readerFromIterable(
    data.stdin.map((value) => stringToUint8Array(value)),
  );

  // const stdin = path.join(cwd, "tests/integration/simple.txt");
  // await ensureFile(stdin);
  // const writer = await Deno.open(stdin, { write: true });
  // const [r1, r2] = Deno.stdin.readable.tee();
  // await Promise.all([
  //   r1.pipeTo(writer.writable),
  //   // r2.pipeTo(process.stdout!),
  // ]);

  // for await (const array of iterateReader(Deno.stdin)) {
  //   console.log(uint8ArrayToString(array));
  // }

  const [output, bytesCopied] = await Promise.all([
    process.output(),
    copy(reader, process.stdin),
  ]);

  // await process.status();
  console.log(uint8ArrayToString(output), bytesCopied);
}
