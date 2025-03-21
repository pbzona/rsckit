import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { deserializeMap, Serializable, serializeMap } from "@/lib/serialize";
import { Config } from "@/config";
import { Dependency } from "@/file-objects/dependencies";

// Todo: support multiple stores
// right now just proving out concept w dependencies
export class Cache implements Serializable {
  static instance: Cache;
  private data: Map<string, Dependency[]> = new Map();
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

  get(key: string) {
    return this.data.get(key)
  }

  set(key: string, value: Dependency[]) {
    return this.data.set(key, value);
  }

  has(key: string) {
    return this.data.has(key);
  }

  serialize(): string {
    return serializeMap(this.data);
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
      const restore = serializedContent.toString()
      this.data = deserializeMap<Dependency[]>(
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

