import { normalizePath, path } from "./deps/path.ts";

/**
 * Removes all undefined values from an object. Neither Firestore nor the
 * RealtimeDB allow `undefined` as a value.
 *
 * @param data The object to clean
 */
export function removeUndefined<Shape extends object>(data: Shape) {
  const transformed = Object.create({});

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
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
export function uint8ArrayToString(input: Uint8Array) {
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

export async function readJson(path: string) {
  try {
    return JSON.parse(await Deno.readTextFile(path));
  } catch {
    return {};
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
