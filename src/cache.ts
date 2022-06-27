import {} from "./utils/get_temp_directory.ts";
import { ensureDir } from "./deps/fs.ts";
import { path } from "./deps/path.ts";
import { Logger } from "./deps/std.ts";
import { CacheError } from "./errors.ts";
import { createLogger } from "./logger.ts";
import { Store } from "./store.ts";
import { getPath } from "./utils.ts";
import { getHomeDirectory } from "./utils/get_home_directory.ts";

export interface Cache {
  /**
   * Check whether the cache already has an entry for the given key.
   */
  hasKey(key: string): boolean;

  /**
   * Get the path to the cached download.
   */
  getDownloadPath(key: string): string;

  /**
   * Create a unique key for the provided data.
   */
  getKey(hash: string, object: object): string;
}

/**
 * A cache that does nothing.
 */
export class EmptyCache implements Cache {
  getDownloadPath(key: string): string {
    return getPath(path.join(getTempDirectory(), ".scaffold", key));
  }

  getKey(_: string, _object: object): string {
    return crypto.randomUUID();
  }

  hasKey(_: string): boolean {
    return false;
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
 * Get the repository from the cache.
 *
 * This also provides the store.
 */
export class RepositoryCache extends EmptyCache {
  readonly #directory: string;
  readonly #log: Logger;
  readonly #store: Store;

  /**
   * The hash of the repository and the absolute path to the hashed path.
   */
  #entries = new Map<string, string>();

  /**
   * The store for configuration and the cache.
   */
  get store(): Store {
    return this.#store;
  }

  constructor(props: RepositoryCacheProps) {
    super();
    const directory = props.directory ?? getDefaultCache();

    if (!directory) {
      throw new CacheError(
        "Could not determine home directory for this operating system.",
      );
    }

    this.#log = props.log ??
      createLogger({ name: "scaffold:cache", levelName: "CRITICAL" });
    this.#directory = directory;
    this.#store = new Store(path.join(directory, "store.json"));
  }

  /**
   * Load all the repository directories. This should be called before any thing
   * else.
   */
  async load() {
    this.#log.debug("loading cache", { directory: this.#directory });
    await ensureDir(this.#directory);

    for await (const entry of Deno.readDir(this.#directory)) {
      console.log(entry);
      if (!entry.isDirectory) {
        continue;
      }

      this.#entries.set(entry.name, path.join(this.#directory, entry.name));
    }

    await this.#store.load();

    console.log(this.#directory);
    this.#log.debug("Every cache item", ...this.#entries.keys());
  }

  /**
   * Get the directory for the hashed repository.
   */
  override getDownloadPath(key = "") {
    return getPath(path.join(this.#directory, key));
  }

  async reset() {
    this.#entries.clear();
    await Deno.remove(this.#directory, { recursive: true });
    await this.store.reset();
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
  override hasKey(hash: string): boolean {
    return this.#entries.has(hash);
  }

  override getKey(
    hash: string,
    object: Record<string, string | undefined>,
  ): string {
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

export function getTempDirectory() {
  if (Deno.build.os === "windows") {
    return Deno.env.get("TMP") || Deno.env.get("TEMP") ||
      Deno.env.get("USERPROFILE") || Deno.env.get("SystemRoot") || "";
  }

  return Deno.env.get("TMPDIR") || "/tmp";
}
