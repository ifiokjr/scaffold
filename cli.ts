import { RepositoryCache } from "./src/cache.ts";
import { VERSION } from "./src/constants.ts";
import {
  colors,
  Command,
  CompletionsCommand,
  DenoLandProvider,
  HelpCommand,
  UpgradeCommand,
} from "./src/deps/cli.ts";
import { copy, emptyDir, ensureDir } from "./src/deps/fs.ts";
import { isError, isString } from "./src/deps/npm.ts";
import { path } from "./src/deps/path.ts";
import { LevelName } from "./src/deps/std.ts";
import { ScaffoldError } from "./src/errors.ts";
import { loadRepository } from "./src/load_repository.ts";
import { createLogger } from "./src/logger.ts";
import { ScaffoldPermissions } from "./src/template/define_template.ts";
import { loadWorker } from "./src/template/load_worker.ts";
import { readJson, wait, writeJson } from "./src/utils.ts";
import { directoryIsEmpty } from "./src/utils/directory_is_empty.ts";
import { getUserDetails } from "./src/utils/get_user_details.ts";
import { isColorSupported } from "./src/utils/is_color_supported.ts";

type ScaffoldActionOptions = Parameters<
  Parameters<typeof main["action"]>[0]
>[0];

const main = new Command()
  .globalOption(
    "--cache-dir [cacheDir:string]",
    "Set a custom cache directory.",
  )
  .name("scaffold")
  .version(VERSION)
  .arguments("<repo:string> [folder:string]")
  .description(
    `🏗️ Scaffold a new project from any GitHub, GitLab or BitBucket git repository.`,
  )
  .option(
    "--cache-only [cacheOnly:string]",
    "Only use the cache (no network requests).",
  )
  .option("--no-cache", "Disable the cache.")
  .option("--reset-cache", "Reset the cache before the download.")
  .option(
    "-d, --debug",
    `Enable debug logging.`,
  )
  .option("-f, --force", "Overwrite files even if they already exist.")
  .option("-s, --silent", "Disable all logging.")
  .option(
    "--no-template",
    `Disable loading the ${colors.gray.italic("scaffold.config.ts")} file.`,
  )
  .option(
    "-y, --no-interactive",
    `Disable the interactive prompt. Might break permission requests.`,
  )
  .option(
    "--use-temporary-source",
    `Copy local files to a temporary directory.`,
  )
  .example(
    "GitHub",
    `${
      colors.yellow("scaffold ifiokjr/templates/deno my-project")
    }\nThis will use the deno directory within the repository https://github.com/ifiokjr/templates`,
  )
  .example(
    "GitLab",
    `${
      colors.yellow("scaffold gitlab:ifiokjr/scaffold-test my-project")
    }\nThis will pull directly from https://gitlab.com/ifiokjr/scaffold-test`,
  )
  .example(
    "Local",
    `${
      colors.yellow("scaffold ./path/to/local/directory my-project")
    }\nThe path must start with './' to be recognized as a local directory.`,
  )
  .action(mainAction);

const invalidAlias = new Set([
  "help",
  "version",
  "completions",
  "upgrade",
  "alias",
  "cache",
]);

main
  .command("alias")
  .arguments("<alias:string> <repo:string>")
  .description(
    "Create an alias for a template repository",
  ).action(async (options, alias, repo) => {
    const spinner = wait({
      text: `Creating alias: ${alias} for repo: ${repo}`,
    });
    const log = createLogger({ name: "scaffold", levelName: "WARNING" });
    const directory = isString(options.cacheDir)
      ? path.resolve(options.cacheDir)
      : undefined;
    const cache = new RepositoryCache({ directory, log });

    await cache.store.load();

    if (cache.store.getAlias(alias)) {
      spinner.fail(`Alias already exists.`);
      Deno.exit(1);
    }

    if (invalidAlias.has(alias)) {
      spinner.fail(
        `The provided alias name is invalid. These names are reserved: ${
          [...invalidAlias].join(", ")
        }`,
      );
      Deno.exit(1);
    }

    await cache.store.setAlias(alias, repo).save();
    spinner.succeed(`Alias created.`);
  });

const upgrade = new UpgradeCommand({
  main: "scaffold.ts",
  provider: new DenoLandProvider(),
  args: ["--unstable", "-A", "-n", "scaffold"],
});

// Additional commands
main
  .command("upgrade", upgrade)
  .command("help", new HelpCommand().global())
  .command("completions", new CompletionsCommand());
// .command("alias", alias);

await main.parse(Deno.args);

/**
 * The action to be performed by the scaffold command.
 */
async function mainAction(
  options: ScaffoldActionOptions,
  templateFolder: string,
  folder = "",
) {
  // keep track of the exit code
  let exit = 0;
  const { debug = false, silent = false, force = false } = options;
  const levelName: LevelName = silent
    ? "CRITICAL"
    : debug
    ? "DEBUG"
    : "WARNING";
  const log = createLogger({ name: "scaffold", levelName });
  const destination = path.resolve(folder);
  const spinner = wait({
    enabled: !silent || levelName !== "CRITICAL",
    text: `Scaffolding the project ${colors.gray.italic(templateFolder)}`,
  });
  const shouldCache = options.cache !== false;
  const cacheDirectory = isString(options.cacheDir)
    ? path.resolve(options.cacheDir)
    : undefined;
  const cache = new RepositoryCache({ directory: cacheDirectory, log });
  const temporary: string[] = [];

  try {
    if (shouldCache) {
      log.info("Loading store and cache...", cache.getDownloadPath());
      await cache.load();
      log.info("Store and cache successfully loaded");
    }

    if (options.resetCache === true) {
      await cache.reset();
    }

    let source: string;
    let permissions: Partial<ScaffoldPermissions> = {};
    let key: string | undefined;
    const alias = cache.store.getAlias(templateFolder);

    if (alias) {
      templateFolder = alias;
    }

    if (options.cacheOnly === true) {
      const recent = cache.store.getRecent(templateFolder);

      if (!recent) {
        throw new ScaffoldError(
          `--cache-only was used but there is no recent cache entry for ${templateFolder}`,
        );
      }

      key = recent;
      source = cache.getDownloadPath(key);
    } else if (
      ["./", "../", "/"].some((p) => templateFolder.startsWith(p)) ||
      path.isAbsolute(templateFolder)
    ) {
      spinner.text("Loading local folder...");
      source = path.resolve(templateFolder);

      if (options.useTemporarySource) {
        source = await Deno.makeTempDir();
        temporary.push(source);
        await copy(path.resolve(templateFolder), source, { overwrite: true });
      }
    } else {
      spinner.text("Loading repository...");
      const result = await loadRepository(templateFolder, { cache });
      source = result.directory;
      key = result.key;

      if (!shouldCache) {
        temporary.push(source);
      } else {
        // save this as the most recent cache entry
        await cache.store.setRecent(templateFolder, key).save();
      }

      spinner.succeed(
        `Repository loaded from: ${colors.gray.italic(result.repo.url)}`,
      );
      spinner.text("Checking for saved permissions...");
      permissions = await readJson(cache.permissions(result.key));
      spinner.succeed("Cached permissions loaded");
    }

    if (!force && !(await directoryIsEmpty(destination))) {
      throw new ScaffoldError(
        `The destination folder is not empty: \`${
          colors.gray.italic(destination)
        }\`. Use \`${colors.blue("--force")}\` to overwrite files.`,
      );
    }

    if (force) {
      spinner.text("Removing existing files...");
      await ensureDir(destination);
      await emptyDir(destination);
    }

    spinner.text("Preparing scaffold...");
    const variables = {
      ...await getUserDetails(),
      name: path.basename(folder),
    };

    for (const [name, granted] of Object.entries(permissions)) {
      if (granted.length === 0) {
        continue;
      }

      log.info(
        `${name} permissions automatically granted for "${granted.join(", ")}"`,
      );
    }

    const processor = await loadWorker({
      source,
      destination,
      interactive: options.interactive !== false,
      name: "scaffold",
      variables,
      permissions,
    });
    spinner.succeed("Scaffold fully loaded.");

    // check if this should be called.
    await processor.getVariables();
    permissions = await processor.getPermissions() ?? permissions;
    await processor.processTemplate();
    await processor.install();

    if (shouldCache && key) {
      await writeJson(cache.permissions(key), permissions);
    }

    spinner.succeed("Scaffolding completed!");
  } catch (error) {
    let message = "";

    if (isError(error)) {
      message = error.message;
    } else if (isString(error)) {
      message = error;
    } else {
      message = Deno.inspect(error, { colors: isColorSupported() });
    }

    log.info("The full error stack", error);
    spinner.fail(`Something went wrong: ${message}`);
    exit = 1;
  } finally {
    let removed = false;
    // Remove all directories that were created.
    for (const temp of temporary) {
      removed = true;
      log.debug("Removing temporary directory:", temp);
      await Deno.remove(temp, { recursive: true });
    }

    if (removed) {
      log.debug("Successfully removed temporary directories.");
    }

    Deno.exit(exit);
  }
}
