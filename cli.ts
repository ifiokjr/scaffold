import { RepositoryCache } from "./src/cache.ts";
import { VERSION } from "./src/constants.ts";
import { colors, Command, EnumType } from "./src/deps/cli.ts";
import { wait } from "./src/deps/cli.ts";
import { isString } from "./src/deps/npm.ts";
import { path } from "./src/deps/path.ts";
import { LevelName } from "./src/deps/std.ts";
import { ScaffoldError } from "./src/errors.ts";
import { loadRepository } from "./src/load_repository.ts";
import { createLogger } from "./src/logger.ts";
import { ScaffoldPermissions } from "./src/template/define_template.ts";
import { loadWorker } from "./src/template/load_worker.ts";
import { readJson } from "./src/utils.ts";

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
    `Scaffold a new project from any GitHub, GitLab or BitBucket git repository. The repo can also point to a relative path if it begins with '${
      colors.gray.italic("./")
    }'`,
  )
  .type("logLevel", new EnumType(["debug", "info", "warn", "error", "fatal"]))
  .option(
    "-c, --cache [cache:string]",
    "Set the cache directory relative to the current directory.",
  )
  .option("--no-cache", "Disable the cache.")
  .option(
    "-l, --log-level=[level:logLevel]",
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
  .action(async (options, templateFolder, folder = "") => {
    const { logLevel = "fatal", debug = false, silent = false } = options;
    const levelName: LevelName = silent
      ? "NOTSET"
      : debug
      ? "DEBUG"
      : isString(logLevel)
      ? logLevelMap[logLevel]
      : "DEBUG";
    const log = createLogger({ name: "scaffold", levelName });
    const destination = path.resolve(folder);
    const spinner = wait({ enabled: levelName !== "NOTSET", text: "" })
      .start();
    const shouldCache = options.cache !== false;
    const cacheDirectory = isString(options.cache)
      ? path.resolve(options.cache)
      : undefined;
    const cache = new RepositoryCache({ directory: cacheDirectory, log });

    try {
      if (shouldCache) {
        spinner.text = "loading cache...";
        await cache.load();
        spinner.succeed("cache loaded");
      }

      let source: string;
      let permissions: Partial<ScaffoldPermissions> = {};

      if (["./", "../", "/"].some((p) => templateFolder.startsWith(p))) {
        source = path.resolve(templateFolder);
      } else {
        spinner.text = "loading repository...";
        const result = await loadRepository(templateFolder, { log });
        source = result.directory;
        spinner.succeed(
          `repository loaded from: ${colors.gray.italic(result.repo.url)}`,
        );
        spinner.text = "checking for saved permissions...";
        permissions = await readJson(cache.permissions(result.key));
        spinner.succeed("cached permissions loaded");
      }

      spinner.text = "preparing scaffold...";
      const processor = await loadWorker({
        source,
        destination,
        interactive: true,
        name: "scaffold",
        variables: {},
        permissions,
      });
      spinner.succeed("worker loaded");

      // check if this should be called.
      await processor.getVariables();
      permissions = await processor.getPermissions() ?? permissions;

      spinner.text = "processing template...";
      await processor.processTemplate();
      spinner.succeed("done");

      spinner.text = "completing installation";
      await processor.install();
      spinner.succeed("installed!");
    } catch (error) {
      spinner.fail("something went wrong 😢");

      if (ScaffoldError.is(error)) {
        log.critical(error.message);
      } else {
        log.critical(error);
      }

      // Provide the full error stack trace.
      log.debug(error);

      Deno.exit(1);
    }
  });

await command.parse(Deno.args);
