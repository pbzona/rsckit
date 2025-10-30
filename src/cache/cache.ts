import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { deserializeMap, Serializable } from "@/lib/serialize";
import { Config } from "@/config";
import { z } from 'zod';
import { ParserService } from "@/parser/service";

type CacheData<T extends Serializable> = Map<string, T>;

export interface Cache<T> {
  get: (key: string) => T;
  set: (key: string, val: T) => T;
  has: (key: string) => boolean;
  serialize: () => string;
  writeToFile: () => void;
  restoreFromFile: (parserService?: ParserService, factory?: SourceFileFactory<T>) => Promise<void>;
}

type SourceFileFactory<T> = (filePath: string, parserService: ParserService) => Promise<T>;

export function createCache<T extends Serializable>(
  filename?: string,
  parserService?: ParserService,
  sourceFileFactory?: SourceFileFactory<T>
) {
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

    async restoreFromFile(parserServiceArg?: ParserService, factory?: SourceFileFactory<T>) {
      try {
        if (!existsSync(
          path.resolve(Config.outputDirectory, this.cacheFile)
        )) return;
        this.data.clear();
        // If cache file does not exist return early to prevent error on read file
        const serializedContent = await fs.readFile(
          path.resolve(Config.outputDirectory, this.cacheFile)
        );
        const parsed = JSON.parse(serializedContent.toString());

        // If factory is provided (e.g. for SourceFile cache), use it to reconstruct instances
        if (factory && parserServiceArg) {
          for (const [key, value] of Object.entries(parsed)) {
            const sourceFile = await factory(key, parserServiceArg);
            this.data.set(key, sourceFile as unknown as T);
          }
        } else {
          // For simple caches, just restore the plain objects
          for (const [key, value] of Object.entries(parsed)) {
            // Value is a serialized string, parse it back to an object
            const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
            this.data.set(key, parsedValue as T);
          }
        }
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
