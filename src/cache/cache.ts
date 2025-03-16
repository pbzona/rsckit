import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Serializable, serializeMap } from "@/lib/serialize";

interface Store<T> {
  get: (k: string) => T;
  set: (k: string, v: T) => Map<string, T>;
  has: (k: string) => boolean;
}

// Todo: support multiple stores
// right now just proving out concept w dependencies
export class Cache<T> implements Serializable {
  public static instance: Cache<any>;
  // weird typing on store because of how I wrote serialize functions
  // iniitially, need to fix this
  private store: Store<T> = new Map<string, T>();

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
    // weird, will fix when I figure out how Store works 
    return serializeMap(this.store as Map<string, T>)
  }

  writeToStorage() {

  }

  restoreFromStorage() { }
}

//type Segments = Map<string, CacheSegment<any>>
//
//export class Cache implements Serializable {
//  private static instance: Cache;
//  public segments: Segments = new Map();
//
//  constructor(private fileName: string, private location: string) {
//    if (!Cache.instance) {
//      this.initializeSegments();
//      Cache.instance = this;
//    }
//
//    return Cache.instance;
//  }
//
//  static getInstance() {
//    return Cache.instance;
//  }
//
//  private initializeSegments() {
//    this.segments.set(
//      "dependencies", new DependencyMap()
//    )
//  }
//
//  // This is a mess
//  static deserialize(serializedCache: string): Cache {
//    printWarning("Not implemented")
//    if (!Cache.instance) {
//      throw new Error("Cache must be instantiated before calling deserialize")
//    }
//    //const cacheSegments: Segments = new Map();
//    //const parsed = JSON.parse(serializedCache);
//    //for (const [k, v] of Object.entries(parsed)) {
//    //  cacheSegments.set(k as string, v);
//    //}
//    //Cache.instance.segments = cacheSegments;
//    return Cache.instance
//  }
//
//  public serialize(): string {
//    const serialized: { [key: string]: string } = {};
//    for (const segment of this.segments.keys()) {
//      serialized[segment] = this.serializeSegment(segment);
//    }
//    return JSON.stringify(serialized);
//  }
//
//  public serializeSegment(target: string): string {
//    if (!this.segments.has(target)) {
//      throw new Error(`Cache segment ${target} does not exist`)
//    }
//
//    return this.segments.get(target).serialize();
//  }
//
//  public async write() {
//    try {
//      await fs.mkdir(this.location, { recursive: true });
//      const cachedContent = this.serialize();
//      await fs.writeFile(path.resolve(this.location, this.fileName), cachedContent);
//    } catch (error) {
//      if (error instanceof Error) {
//        throw error;
//      }
//
//      console.error("Unable to write cache to disk:", error)
//    }
//  }
//
//  public async read() {
//    try {
//      const serializedContent = await fs.readFile(
//        path.resolve(this.location, this.fileName)
//      );
//      Cache.deserialize(serializedContent.toString());
//    } catch (error) {
//      if (error instanceof Error) {
//        throw error;
//      }
//
//      console.error("Unable to read cache from disk:", error)
//    }
//  }
//}
