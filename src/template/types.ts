import { SUPPORTED_EXTENSIONS } from "../constants.ts";
import { path } from "../deps/path.ts";

interface GetPatternProps {
  name: string;
  extension: string;
  directory: string;
}
export function getPattern(props: GetPatternProps) {
  return [
    path.join(props.directory, `${props.name}.config${props.extension}`),
  ];
}
/**
 * Generate the files to load the configuration from.
 */
export function generateLookupFiles(name: string): string[] {
  const files: string[] = [];

  for (const directory of ["", ".config"]) {
    for (const extension of SUPPORTED_EXTENSIONS) {
      files.push(...getPattern({ name, extension, directory }));
    }
  }

  return files;
}
export const DEFAULT_GET_ARGUMENT = () => {};

export type GetPattern = typeof getPattern;
/**
 * The configuration as a function.
 */
type ConfigAsFunction<Config extends object, Argument = unknown> = (
  argument: Argument,
) => Config | Promise<Config>;
/**
 * The exported configuration type.
 */

export type ExportedConfig<Config extends object, Argument = unknown> =
  | Config
  | Promise<Config>
  | ConfigAsFunction<Config, Argument>;
/**
 * @template Config - the type of configuration that will be loaded.
 * @template Argument - the argument that is passed to the configuration if is
 * supports being called.
 */

export interface LoadConfigOptions {
  /**
   * The name of the configuration object to search for.
   *
   * ### Example
   *
   * The following will search for the files from the provided current working
   * directory.
   *
   * - `scaffold.template.js`
   * - `scaffold.template.ts`
   *
   * ```
   * await loadEsmConfig({name: 'monots'});
   * ```
   */
  name: string;

  /**
   * The directory to search from.
   *
   * @default Deno.cwd()
   */
  cwd?: string | URL;
}
/**
 * @template Config - the type of configuration that will be loaded.
 */

// deno-lint-ignore no-explicit-any ban-types
export interface LoadConfigResult<Config extends object = any> {
  /**
   * The absolute path to the resolved configuration file.
   */
  path: string;

  /**
   * The configuration object that was loaded.
   */
  config: Config;
}
