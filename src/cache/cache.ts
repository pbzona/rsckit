import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { deserializeMap, Serializable, serializeMap } from "@/lib/serialize";
import { Config } from "@/config";
import { Dependency } from "@/file-objects/dependencies";

type Store<T> = Map<string, T>;

type CacheData = {
  dependencies: Store<Dependency[]>;
  clientDirective: Store<boolean>;
}

// Todo: support multiple stores
// right now just proving out concept w dependencies
export class Cache implements Serializable {
  static instance: Cache;
  private data: CacheData = {
    dependencies: new Map<string, Dependency[]>(),
    clientDirective: new Map<string, boolean>()
  };
  private cacheFile: string = "cache.json";

  constructor() {
    if (!Cache.instance) {
      Cache.instance = this;
    }

    return Cache.instance
  }

  static use() {
    if (!Cache.instance) {
      throw new Error("Cache must be initialized before it can be used")
    }
    return Cache.instance
  }

  static useData(store: keyof CacheData) {
    return {
      get: (key: string) => this.instance.get(key, store),
      set: (key: string, value) => this.instance.set(key, value, store),
      has: (key: string) => this.instance.has(key, store),
      store: this.instance.data[store]
    }
  }

  get(key: string, store: keyof CacheData) {
    return this.data[store].get(key)
  }

  set(key: string, value, store: keyof CacheData) {
    return this.data[store].set(key, value);
  }

  has(key: string, store: keyof CacheData) {
    return this.data[store].has(key);
  }

  serialize(): string {
    return JSON.stringify({
      dependencies: serializeMap(this.data.dependencies),
      clientDirective: serializeMap(this.data.clientDirective)
    });
  }

  async writeToStorage() {
    try {
      await fs.mkdir(Config.outputDirectory, { recursive: true });
      const cachedContent = this.serialize();
      await fs.writeFile(path.resolve(Config.outputDirectory, this.cacheFile), cachedContent);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      console.error("Unable to write cache to disk:", error)
    }
  }

  async restoreFromStorage() {
    try {
      // If cache file does not exist return early to prevent error on read
      if (!existsSync(
        path.resolve(Config.outputDirectory, this.cacheFile)
      )) return;

      const serializedContent = await fs.readFile(
        path.resolve(Config.outputDirectory, this.cacheFile)
      );
      const { dependencies, clientDirective } = JSON.parse(serializedContent.toString())
      this.data.dependencies = deserializeMap<Dependency[]>(
        dependencies.toString()
      );
      this.data.clientDirective = deserializeMap<boolean>(
        clientDirective.toString()
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      console.error("Unable to read cache from disk:", error)
    }
  }
}

