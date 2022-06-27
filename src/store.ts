import { ensureFile } from "./deps/fs.ts";
import { ScaffoldError } from "./errors.ts";
import { readJson, writeJson } from "./utils.ts";

/**
 * Store the configuration.
 */
export class Store {
  static VERSION = 0;
  #path: string;
  #data: StoreDataV0;

  get data(): StoreDataV0 {
    return this.#data;
  }

  /**
   * Create a new store.
   */
  constructor(path: string) {
    this.#path = path;
    this.#data = DEFAULT_DATA;
  }

  async load() {
    let data = await readJson(this.#path, {
      create: true,
      defaultData: DEFAULT_DATA,
    });

    if (data.version < Store.VERSION) {
      data = migrate(data);
    }

    this.#data = data;
  }

  getAlias(name: string): string | undefined {
    return this.data.aliases[name];
  }

  setAlias(alias: string, repo: string) {
    this.data.aliases[alias] = repo;
    return this;
  }

  getRecent(repo: string) {
    return this.data.recent[repo];
  }

  setRecent(repo: string, key: string) {
    this.data.recent[repo] = key;
    return this;
  }

  async save() {
    await ensureFile(this.#path);
    await writeJson(this.#path, this.data);
  }

  async reset() {
    this.#data = DEFAULT_DATA;
    await Deno.remove(this.#path);
  }
}

interface StoreDataV0 {
  /**
   * The migration version.
   */
  version: number;

  /**
   * The name of the alias and the source path it points to.
   */
  aliases: Record<string, string>;

  /**
   * The identifier for the repository as a key and the most recent directory.
   *
   * This is used to run the cli with no cache.
   */
  recent: Record<string, string>;
}

type StoreData = StoreDataV0;

type Migrations = Record<
  number,
  (data: StoreData | undefined) => StoreData
>;

const DEFAULT_DATA: StoreData = {
  version: Store.VERSION,
  aliases: {},
  recent: {},
};

const migrations: Migrations = {
  0: (_) => {
    return DEFAULT_DATA;
  },
};

function migrate(data: StoreData) {
  let store: StoreData | undefined;
  const version = data.version as number;

  for (const [key, migration] of Object.entries(migrations)) {
    if (+key > version) {
      store = migration(data);
    }
  }

  return store ?? DEFAULT_DATA;
}
