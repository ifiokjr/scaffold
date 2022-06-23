import { RepositoryCache } from "./src/cache.ts";
import { VERSION } from "./src/constants.ts";
import { colors, Command, EnumType } from "./src/deps/cli.ts";
import { isString } from "./src/deps/npm.ts";
import { path } from "./src/deps/path.ts";
import { LevelName } from "./src/deps/std.ts";
import { ScaffoldError } from "./src/errors.ts";
import { loadRepository } from "./src/load_repository.ts";
import { createLogger } from "./src/logger.ts";
import { ScaffoldPermissions } from "./src/template/define_template.ts";
import { loadWorker } from "./src/template/load_worker.ts";
import { readJson, wait, writeJson } from "./src/utils.ts";

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
    `Scaffold a new project from any GitHub, GitLab or BitBucket git repository.`,
  )
  .type("logLevel", new EnumType(["debug", "info", "warn", "error", "fatal"]))
  .option(
    "-c, --cache [cache:string]",
    "Set the cache directory relative to the current directory.",
  )
  .option("--no-cache", "Disable the cache.")
  .option(
    "-l, --log-level [level:logLevel]",
    "Set the log level.",
  )
  .option("-s, --silent", "Disable all logging.")
  .option(
    "-d, --debug",
    `Enable debug logging (shorthand for ${
      colors.gray.italic("--log-level=debug")
    }`,
  )
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
  .action(async (options, templateFolder, folder = "") => {
    const { logLevel = "error", debug = false, silent = false } = options;
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
        source = path.resolve(templateFolder);
      } else {
        spinner.text("loading repository...");
        const result = await loadRepository(templateFolder, { log, cache });
        source = result.directory;
        key = result.key;
        spinner.succeed(
          `Repository loaded from: ${colors.gray.italic(result.repo.url)}`,
        );
        spinner.text("Checking for saved permissions...");
        permissions = await readJson(cache.permissions(result.key));
        spinner.succeed("Cached permissions loaded");
      }

      spinner.text("Preparing scaffold...");
      const processor = await loadWorker({
        source,
        destination,
        interactive: true,
        name: "scaffold",
        variables: {},
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
      if (ScaffoldError.is(error)) {
        spinner.fail(`Something went wrong ${error.message}`);
      }

      // Provide the full error stack trace.
      log.warning("The full error stack", error);
      exit = 1;
    } finally {
      Deno.exit(exit);
    }
  });

await command.parse(Deno.args);
