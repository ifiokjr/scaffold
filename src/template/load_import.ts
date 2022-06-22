import { AnyFunction, isFunction } from "../deps/npm.ts";
import { path } from "../deps/path.ts";
import { generateLookupFiles, LoadConfigResult } from "./types.ts";

/**
 * Load the import dynamically.
 *
 * @param source The source directory to load the template configuration from.
 */
export async function loadImport<
  Config extends object = any,
>(
  source: string,
  name: string,
): Promise<LoadConfigResult<Config> | undefined> {
  const now = Date.now();
  let found = false;
  // lookup the configuration file from the provided `cwd`.
  const files = generateLookupFiles(name);

  // only do it this way if not being invoked in a worker
  for (const file of files) {
    const filePath = path.join(source, file);

    try {
      const url = new URL(`?now=${now}`, path.toFileUrl(filePath));
      const exported = await import(url.href);
      found = true;

      if (!exported?.default) {
        return;
      }

      const config = await (
        isFunction(exported.default) ? exported.default() : exported.default
      );

      if (!config) {
        return;
      }

      return { config, path: filePath };
    } catch {
      if (found) {
        break;
      }

      continue;
    }
  }

  return;
}
