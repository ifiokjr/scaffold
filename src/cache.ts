import {} from "./utils/get_temp_directory.ts";
import { path } from "./deps/path.ts";
import { Logger } from "./deps/std.ts";
import { CacheError } from "./errors.ts";
import { createLogger } from "./logger.ts";
import { getPath } from "./utils.ts";
import { getHomeDirectory } from "./utils/get_home_directory.ts";

export abstract class Cache {
  /**
   * Provide a key to get the cached directory.
   */
  abstract get(key: string): string | undefined;
  abstract has(key: string): boolean;
  abstract set(key: string, value: string): void;
  abstract directory(key: string): string;

  abstract getKey(
    hash: string,
    object: object,
  ): string;
}

/**
 * A cache that does nothing.
 */
export class EmptyCache extends Cache {
  directory(key: string): string {
    return getPath(path.join(getTempDirectory(), key));
  }

  getKey(): string {
    return crypto.randomUUID();
  }

  get(key: string): string | undefined {
    return;
  }
  has(key: string): boolean {
    return false;
  }
  set(key: string, value: string): void {
    return;
  }
}

export interface RepositoryCacheProps {
  /**
   * @default "$HOME/.scaffold/cache"
   */
  directory?: string;
  log?: Logger;
}

/**
 * Get the repository from the cache
 */
export class RepositoryCache extends Cache {
  #directory: string;
  #log: Logger;

  /**
   * The hash of the repository and the absolute path to the hashed path.
   */
  #entries = new Map<string, string>();

  constructor(props: RepositoryCacheProps) {
    super();
    const directory = props.directory ?? getDefaultCache();

    if (!directory) {
      throw new CacheError(
        "Could not determine home directory for this operating system.",
      );
    }

    this.#log = props.log ??
      createLogger({ name: "cache", levelName: "CRITICAL" });
    this.#directory = directory;
  }

  /**
   * Load all the repository directories. This should be called before any thing
   * else.
   */
  async load() {
    this.#log.debug("loading cache", { directory: this.#directory });

    for await (const entry of Deno.readDir(this.#directory)) {
      if (!entry.isDirectory) {
        continue;
      }

      this.#entries.set(entry.name, path.join(this.#directory, entry.name));
    }

    this.#log.debug("every cache item", this.#entries.keys());
  }

  /**
   * Get the directory for the hashed repository.
   */
  directory(key: string) {
    return getPath(path.join(this.#directory, key));
  }

  /**
   * The path to the permissions file for the repository.
   */
  permissions(key: string): string {
    return path.join(this.#directory, `${key}.json`);
  }

  /**
   * Get the cached directory for the repository if it exists.
   */
  get(hash: string) {
    return this.#entries.get(hash);
  }

  /**
   * Check whether the cache contains the repository hash.
   */
  has(hash: string): boolean {
    return this.#entries.has(hash);
  }

  set(key: string, value: string): void {}

  getKey(hash: string, object: Record<string, string | undefined>): string {
    const { user = "", name = "", site = "", subdirectory = "" } = object;
    const parts = [user, name, site, subdirectory, hash];
    let key = "";

    for (let part of parts) {
      part = clean(part, key ? "-" : "");
      key += part;
    }

    return key;
  }
}

function clean(value: string | undefined, prefix = "") {
  return value
    ? `${prefix}${value.replace(/\//g, "--").replace(/[^a-zA-Z0-9_-]/g, "")}`
    : "";
}

function getDefaultCache() {
  const homeDirectory = getHomeDirectory();

  if (!homeDirectory) {
    return;
  }

  return path.join(homeDirectory, ".scaffold", "cache");
}

function getTempDirectory() {
  if (Deno.build.os === "windows") {
    return Deno.env.get("TMP") || Deno.env.get("TEMP") ||
      Deno.env.get("USERPROFILE") || Deno.env.get("SystemRoot") || "";
  }

  return Deno.env.get("TMPDIR") || "/tmp";
}