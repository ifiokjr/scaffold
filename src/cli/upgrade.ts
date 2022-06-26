const CDN_ENDPOINT = "https://cdn.deno.land/";
const SCAFFOLD_CLI_ENDPOINT = "https://deno.land/x/scaffold/scaffold.ts";
import { VERSION } from "../constants.ts";
import { colors, Command, Table } from "../deps/cli.ts";
import { stringToUint8Array, wait } from "../utils.ts";

export interface VersionInfo {
  latest: string;
  versions: string[];
  isLegacy: true;
}

/**
 * Get the versions of a deno module from the https://deno.land registry.
 */
export async function getDenoLandVersions(
  module: string,
): Promise<VersionInfo | undefined> {
  const url = `${CDN_ENDPOINT}${module}/meta/versions.json`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });

  if (res.status === 403 || res.status === 404) {
    await res.body?.cancel();
    return;
  }

  if (res.status !== 200) {
    throw Error(
      `Got an error (${res.status}) while getting the version list:\n${await res
        .text()}`,
    );
  }

  return res.json();
}

/**
 * Upgrade a the scaffold cli to the latest version by running the global
 * installation command.
 */
export function updateToLatest() {
  return Deno.run({
    cmd: [
      "deno",
      "install",
      "--unstable",
      "-Af",
      "-n",
      "scaffold",
      SCAFFOLD_CLI_ENDPOINT,
    ],
    stdout: "piped",
  }).output();
}

export async function shouldUpgrade() {
  const result = await getDenoLandVersions("scaffold");

  // avoid a semver check for now since there won't be any pre-releases.
  if (!result || result.latest === VERSION) {
    return { upgrade: false, version: VERSION };
  }

  return { upgrade: true, version: result.latest };
}

export const upgradeCommand = new Command().name("upgrade").action(async () => {
  const spinner = wait({ text: "Checking for updates..." });
  const result = await shouldUpgrade();

  if (!result.upgrade) {
    spinner.warn(`You are already on the latest version. ${result.version}`);
    Deno.exit(0);
  }

  await updateToLatest();

  spinner.succeed(`Successfully upgraded to ${result.version}`);
  Deno.exit(0);
});

export async function showUpgrade() {
  const result = await shouldUpgrade();

  if (!result.upgrade) {
    return;
  }

  Deno.stdout.write(stringToUint8Array("\n\n"));

  new Table().header([
    `Update available! ${colors.red(VERSION)} → ${
      colors.green(result.version)
    }.`,
  ]).body([[
    `Run \`${colors.gray("scaffold upgrade")}\` to update.`,
  ]]).border(true).padding(5).align("center").indent(2).render();
}
