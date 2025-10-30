import { createCache } from "./cache";
import { SourceFile } from "@/source-file/source-file";
import { Config } from "@/config";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileNameFromPath } from "@/lib/utils";

// Mock the source file implementation
class MockSourceFile implements SourceFile {
  constructor(public filePath: string) {}
  
  get fileName(): string {
    return fileNameFromPath(this.filePath);
  }
  
  dependencies: string[] = [];
  useClient: boolean = false;
  packageName?: string;
  hash: string = "mock-hash";
  
  serialize() {
    return JSON.stringify({ filePath: this.filePath });
  }
  
  async read(): Promise<string> {
    return "mock content";
  }
  
  analyze(): Promise<void> {
    return Promise.resolve();
  }
  
  getDependencies() {
    return this.dependencies;
  }
}

describe("Cache", () => {
  const testCacheFile = "test-cache.json";
  let cache: ReturnType<typeof createCache<MockSourceFile>>;
  
  beforeEach(() => {
    // Create a new cache instance for each test
    cache = createCache<MockSourceFile>(testCacheFile);
  });
  
  afterEach(async () => {
    // Clean up the test cache file after each test
    try {
      await fs.unlink(path.join(Config.outputDirectory, testCacheFile));
    } catch (error) {
      // Ignore errors if file doesn't exist
    }
  });
  
  it("should store and retrieve values", () => {
    const sourceFile = new MockSourceFile("test.ts");
    cache.set("test.ts", sourceFile);
    
    expect(cache.has("test.ts")).toBe(true);
    expect(cache.get("test.ts")).toBe(sourceFile);
  });
  
  it("should serialize and deserialize data", async () => {
    const sourceFile = new MockSourceFile("test.ts");
    cache.set("test.ts", sourceFile);

    // Write to file
    await cache.writeToFile();

    // Create a new cache instance and restore from file
    const newCache = createCache<MockSourceFile>(testCacheFile);
    await newCache.restoreFromFile();

    expect(newCache.has("test.ts")).toBe(true);
    const restored = newCache.get("test.ts");
    expect(restored).toBeDefined();
    // Without a parser service, the cache restores plain objects from JSON
    expect((restored as any).filePath).toBe("test.ts");
  });
  
  it("should handle non-existent cache file", async () => {
    const newCache = createCache<MockSourceFile>("non-existent.json");
    await expect(newCache.restoreFromFile()).resolves.not.toThrow();
    expect(newCache.has("test.ts")).toBe(false);
  });
}); 