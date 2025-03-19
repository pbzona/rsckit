import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { deserializeMap, Serializable, serializeMap } from "@/lib/serialize";
import { Config } from "@/config";
import { printMessage } from "@/lib/output";

// Don't be fancy
type Store<T> = Map<string, T>;

// Todo: support multiple stores
// right now just proving out concept w dependencies
export class Cache<T> implements Serializable {
  public static instance: Cache<any>;
  // weird typing on store because of how I wrote serialize functions
  // iniitially, need to fix this
  private store: Store<T> = new Map<string, T>();
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

  get(key: string): T {
    return this.store.get(key)
  }

  set(key: string, value: T) {
    return this.store.set(key, value);
  }

  has(key: string) {
    return this.store.has(key);
  }

  serialize(): string {
    return serializeMap(this.store)
  }

  async writeToStorage() {
    try {
      await fs.mkdir(Config.outputDirectory, { recursive: true });
      const cachedContent = this.serialize();
      await fs.writeFile(path.resolve(Config.outputDirectory, this.cacheFile), cachedContent);

      // Separate this out into some kind of structured report 
      printMessage(`Wrote dependency data for ${this.store.size} source files`)
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
      this.store = deserializeMap<T>(serializedContent.toString());
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      console.error("Unable to read cache from disk:", error)
    }
  }
}

