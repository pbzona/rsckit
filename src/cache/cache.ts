import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { deserializeMap, Serializable } from "@/lib/serialize";
import { Config } from "@/config";

type CacheData<T extends Serializable> = Map<string, T>;

export interface Cache<T> {
  get: (key: string) => T;
  set: (key: string, val: T) => T;
  has: (key: string) => boolean;
  serialize: () => string;
  writeToFile: () => void;
  restoreFromFile: () => void;
}

export function createCache<T extends Serializable>(filename?: string) {
  class CacheImpl<T extends Serializable> implements Serializable, Cache<T> {
    data: CacheData<T> = new Map();
    cacheFile: string;

    constructor(file?: string) {
      this.cacheFile = file || "cache.json"
    }

    get(key: string) {
      return this.data.get(key)
    }

    set(key: string, value: T) {
      this.data.set(key, value);
      return value;
    }

    has(key: string) {
      return this.data.has(key);
    }

    serialize() {
      const serializable = {};
      for (const [k, v] of this.data.entries()) {
        serializable[k] = v.serialize();
      }
      return JSON.stringify(serializable);
    }

    async writeToFile() {
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

    async restoreFromFile() {
      try {
        // If cache file does not exist return early to prevent error on read
        if (!existsSync(
          path.resolve(Config.outputDirectory, this.cacheFile)
        )) return;

        // Clear the cache before restoring
        this.data.clear();

        const serializedContent = await fs.readFile(
          path.resolve(Config.outputDirectory, this.cacheFile)
        );
        const restore = serializedContent.toString()
        this.data = deserializeMap<T>(
          restore.toString()
        );
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }

        console.error("Unable to read cache from disk:", error)
      }
    }
  }

  return new CacheImpl<T>(filename)
}

