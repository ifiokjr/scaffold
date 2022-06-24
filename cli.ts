import { RepositoryCache } from "./src/cache.ts";
import { VERSION } from "./src/constants.ts";
import { colors, Command, EnumType } from "./src/deps/cli.ts";
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
import { directoryIsEmpty } from "./src/utils/directory-is-empty.ts";

if (!import.meta.main) {
  throw new ScaffoldError("The cli should not be imported as a module");
}

const LogLevelEnum = new EnumType([
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "none",
]);
type Extract<Type> = Type extends EnumType<infer Enum> ? Enum : never;

type ScaffoldActionOptions = Parameters<
  Parameters<typeof command["action"]>[0]
>[0];
const logLevelMap: Record<Extract<typeof LogLevelEnum>, LevelName> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
  none: "NOTSET",
};

const command = new Command()
  .name("scaffold")
  .version(VERSION)
  .arguments("<repo:string> [folder:string]")
  .description(
    `🏗️ Scaffold a new project from any GitHub, GitLab or BitBucket git repository.`,
  )
  .type("logLevel", new EnumType(["debug", "info", "warn", "error", "fatal"]))
  .option(
    "-c, --cache [cache:string]",
    "Set the cache directory relative to the current directory.",
  )
  .option("--no-cache", "Disable the cache.")
  .option(
    "-d, --debug",
    `Enable debug logging (shorthand for ${
      colors.gray.italic("--log-level=debug")
    }`,
  )
  .option("-f, --force", "Overwrite files even if they already exist.")
  .option(
    "-l, --log-level [level:logLevel]",
    "Set the log level.",
  )
  .option("-s, --silent", "Disable all logging.")
  .option(
    "--no-template",
    `Disable loading the ${colors.gray.italic("template.config.ts")} file.`,
  )
  .option(
    "-n,--name [name:string]",
    `Set the name to be used in the template`,
  )
  .option(
    "--description [name:string]",
    `Set the description to be used in the template`,
  )
  .option(
    "-y, --no-interactive",
    `Disable the interactive prompt.`,
  )
  .option(
    "--use-temp-source",
    `Copy local files to a temporary directory before scaffolding. This might break local imports.`,
  )
  .action(scaffoldAction);

await command.parse(Deno.args);

/**
 * The action to be performed by the scaffold command.
 */
async function scaffoldAction(
  options: ScaffoldActionOptions,
  templateFolder: string,
  folder = "",
) {
  const {
    logLevel = "error",
    debug = false,
    silent = false,
    force = false,
  } = options;
  const levelName: LevelName = silent
    ? "CRITICAL"
    : debug
    ? "DEBUG"
    : isString(logLevel)
    ? logLevelMap[logLevel]
    : "DEBUG";
  const log = createLogger({ name: "scaffold", levelName });
  const destination = path.resolve(folder);
  const spinner = wait({
    enabled: !silent || levelName !== "CRITICAL",
    text: `Scaffolding the project ${colors.gray.italic(templateFolder)}`,
  });
  const shouldCache = options.cache !== false;
  const cacheDirectory = isString(options.cache)
    ? path.resolve(options.cache)
    : undefined;
  const cache = new RepositoryCache({ directory: cacheDirectory, log });
  let exit = 0;
  const temporary: string[] = [];

  try {
    if (shouldCache) {
      log.info("Loading cache...", cache.directory());
      await cache.load();
      log.info("Cache successfully loaded");
    }

    let source: string;
    let permissions: Partial<ScaffoldPermissions> = {};
    let key: string | undefined;

    if (["./", "../", "/"].some((p) => templateFolder.startsWith(p))) {
      spinner.text("Loading local folder...");
      source = path.resolve(templateFolder);

      if (options.useTempSource) {
        source = await Deno.makeTempDir();
        temporary.push(source);
        await copy(path.resolve(templateFolder), source, { overwrite: true });
      }
    } else {
      spinner.text("Loading repository...");
      const result = await loadRepository(templateFolder, { log, cache });
      source = result.directory;
      key = result.key;

      if (!shouldCache) {
        temporary.push(source);
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
      name: options.name ?? path.basename(folder),
      description: options.description,
    };

    const processor = await loadWorker({
      source,
      destination,
      interactive: options.interactive !== false,
      name: "scaffold",
      variables,
      permissions,
    });

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
      message = Deno.inspect(error, { colors: true });
    }

    log.warning("The full error stack", error);
    spinner.fail(`Something went wrong: ${message}`);
    exit = 1;
  } finally {
    // Remove all directories that were created.
    for (const temp of temporary) {
      await Deno.remove(temp, { recursive: true });
    }

    Deno.exit(exit);
  }
}
