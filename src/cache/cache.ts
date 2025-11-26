import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Config } from "@/config";
import { Serializable } from "@/lib/serialize";
import { ParserService } from "@/parser/service";

// The user wants the cache to be a "Big JS Object"
// So we use a Map for the underlying storage for performance
// but it serializes to a big JS object
type CacheData<T extends Serializable> = Map<string, T>;

export interface Cache<T> {
  get: (key: string) => T | undefined;
  set: (key: string, val: T) => T;
  has: (key: string) => boolean;
  values: () => IterableIterator<T>;
  serialize: () => string;
  writeToFile: () => Promise<void>;
  restoreFromFile: (
    parserService?: ParserService,
    factory?: SourceFileFactory<T>,
  ) => Promise<void>;
  // We add quiet state here as requested to avoid brittle global state
  isQuiet: boolean;
  setQuiet: (quiet: boolean) => void;
}

type SourceFileFactory<T> = (
  filePath: string,
  parserService: ParserService,
) => Promise<T>;

export function createCache<T extends Serializable>(filename?: string) {
  class CacheImpl<T extends Serializable> implements Serializable, Cache<T> {
    data: CacheData<T> = new Map();
    cacheFile: string;
    isQuiet = false;

    constructor(file?: string) {
      this.cacheFile = file || "cache.json";
    }

    setQuiet(quiet: boolean) {
      this.isQuiet = quiet;
    }

    get(key: string) {
      return this.data.get(key);
    }

    set(key: string, value: T) {
      this.data.set(key, value);
      return value;
    }

    has(key: string) {
      return this.data.has(key);
    }

    values() {
      return this.data.values();
    }

    serialize() {
      const serializable: Record<string, unknown> = {};
      for (const [k, v] of this.data.entries()) {
        serializable[k] = v.serialize ? JSON.parse(v.serialize()) : v;
      }
      return JSON.stringify(serializable);
    }

    async writeToFile() {
      try {
        await fs.mkdir(Config.outputDirectory, { recursive: true });
        const cachedContent = this.serialize();
        await fs.writeFile(
          path.resolve(Config.outputDirectory, this.cacheFile),
          cachedContent,
        );
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }

        console.error("Unable to write cache to disk:", error);
      }
    }

    async restoreFromFile(
      parserServiceArg?: ParserService,
      factory?: SourceFileFactory<T>,
    ) {
      try {
        const fullPath = path.resolve(Config.outputDirectory, this.cacheFile);
        if (!existsSync(fullPath)) return;

        this.data.clear();

        const serializedContent = await fs.readFile(fullPath, "utf8");
        const parsed = JSON.parse(serializedContent);

        if (factory && parserServiceArg) {
          await Promise.all(
            Object.entries(parsed).map(async ([key, value]) => {
              // Temporarily set raw data so the factory (if it checks cache) finds it
              // This allows the factory to hydrate the object instead of creating a new one from scratch
              this.data.set(key, value as T);

              // Use the factory to reconstruct/hydrate the instance
              const sourceFile = await factory(key, parserServiceArg);

              // Replace the raw data with the fully hydrated instance
              this.data.set(key, sourceFile);
            }),
          );
        } else {
          // For simple caches, just restore the plain objects
          for (const [key, value] of Object.entries(parsed)) {
            this.data.set(key, value as T);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }

        console.error("Unable to read cache from disk:", error);
      }
    }
  }

  return new CacheImpl<T>(filename);
}
