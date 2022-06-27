import { colors, Spinner, type SpinnerOptions } from "./deps/cli.ts";
import { normalizePath, path } from "./deps/path.ts";

/**
 * Removes all undefined values from an object. Neither Firestore nor the
 * RealtimeDB allow `undefined` as a value.
 *
 * @param data The object to clean
 * @param nullish Set to true to clean null and undefined values
 */
export function removeUndefined<Shape extends object>(
  data: Shape,
  nullish = false,
) {
  const transformed = Object.create({});

  for (const [key, value] of Object.entries(data)) {
    if (nullish ? value == null : value === undefined) {
      continue;
    }

    transformed[key] = value;
  }

  return transformed;
}

const encoder = new TextEncoder();

/**
 * Encode a string for passing through to an anchor program.
 */
export function stringToUint8Array(text: string): Uint8Array {
  return encoder.encode(text);
}

const decoder = new TextDecoder();

/**
 * Decode a Uint8Array to a string.
 */
export function uint8ArrayToString(input: Uint8Array): string {
  return decoder.decode(input);
}

/**
 * Normalize a path to it's posix form.
 *
 * @param filePath The path to normalize
 * @param [stripTrailing=false] When set to true any trailing slashes will be
 * removed.
 *
 * @returns a normalized path with posix style separators
 */
export function normalize(filePath: string, stripTrailing?: boolean): string {
  return path.normalize(normalizePath(filePath, stripTrailing ?? false));
}

/**
 * Normalize a path as a directory with a trailing slash.
 *
 * @param directory The directory to normalize
 * @param [trailingSlash=true] When set to true a trailing slash will be added.
 */
export function normalizeDirectory(directory: string, trailingSlash = true) {
  return `${normalize(directory, true)}${trailingSlash ? "/" : ""}`;
}

/**
 * Get the normalized path of the provided `path`.
 */
export function getPath(filepath: string | URL): string {
  return filepath instanceof URL
    ? filepath.pathname
    : filepath.startsWith("file:")
    ? new URL(filepath).pathname
    : normalize(filepath);
}

interface ReadJsonOptions {
  /**
   * When set to true, the file with the default data will be created if it does
   * not exist.
   */
  create?: boolean;

  /**
   * The default data to use when the file does not exist.
   *
   * @default {}
   */
  defaultData?: object;
}

export async function readJson(path: string, options: ReadJsonOptions = {}) {
  const { create = false, defaultData = Object.create(null) } = options;

  try {
    return JSON.parse(await Deno.readTextFile(path));
  } catch {
    if (create) {
      await Deno.writeTextFile(path, JSON.stringify(defaultData));
    }

    return defaultData;
  }
}

export async function writeJson(path: string, json: object) {
  try {
    const content = JSON.stringify(json);
    await Deno.writeTextFile(path, content, { create: true });
  } catch {
    return {};
  }
}

export function wait(options: SpinnerOptions) {
  let spinner: Spinner;
  const getSpinner = () => {
    return spinner ??= new Spinner({
      text: options.text,
      prefix: options.prefix ?? "",
      color: options.color ?? colors.cyan,
      spinner: options.spinner ?? "dots",
      hideCursor: options.hideCursor ?? true,
      indent: options.indent ?? 0,
      interval: options.interval ?? 100,
      stream: options.stream ?? Deno.stdout,
      enabled: true,
      discardStdin: true,
    }).start();
  };

  const proxy = {
    text: (text: string) => {
      if (options.enabled === false) return;
      getSpinner().text = text;
      return proxy;
    },
    info: (text: string) => {
      if (options.enabled === false) return;
      getSpinner().info(text);
      return proxy;
    },
    fail: (text: string) => {
      if (options.enabled === false) return;
      getSpinner().fail(text);
      return proxy;
    },
    succeed: (text: string) => {
      if (options.enabled === false) return;
      getSpinner().succeed(text);
      return proxy;
    },
    warn: (text: string) => {
      if (options.enabled === false) return;
      getSpinner().warn(text);
      return proxy;
    },
    stop: () => {
      if (options.enabled === false) return;
      getSpinner().stop();
      return proxy;
    },
  };

  return proxy;
}
