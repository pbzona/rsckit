import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ProjectFile } from "./project/file";
import { printMessageListItem } from "@/lib/output";
import { FileImports } from "./project/types";

class Cache {
  private fileName: string;
  private location: string;

  constructor(fileName: string, location: string) {
    this.fileName = fileName;
    this.location = location;
  }

  public serialize(): string {
    throw new Error("Serialization must be implemented on the subclass");
  }

  public deserialize(content: string): void {
    throw new Error("Deserialization must be implemented on the subclass");
  }

  public async write() {
    try {
      await fs.mkdir(this.location, { recursive: true });
      const cachedContent = this.serialize();
      await fs.writeFile(path.resolve(this.location, this.fileName), cachedContent);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      console.error("Unable to write cache to disk:", error)
    }
  }

  public async read() {
    try {
      const serializedContent = await fs.readFile(
        path.resolve(this.location, this.fileName)
      );
      this.deserialize(serializedContent.toString());
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      console.error("Unable to read cache from disk:", error)
    }
  }
}

export class DependencyCache extends Cache {
  private static instance: DependencyCache;
  private fileDeps: Map<string, FileImports>;

  constructor(fileName: string, location: string) {
    super(fileName, location);
    if (!DependencyCache.instance) {
      this.fileDeps = new Map<string, FileImports>();
      DependencyCache.instance = this;
    }

    return DependencyCache.instance;
  }

  static getInstance() {
    if (!DependencyCache.instance) {
      throw new Error("DependencyCache must be instantiated before it can be accessed");
    }

    return DependencyCache.instance;
  }

  public addEntry(file: ProjectFile) {
    this.fileDeps.set(file.filePath, file.imports)
    console.log(this.fileDeps)
  }

  public getEntry(fileName: string): Set<string> | null {
    return this.fileDeps.has(fileName) ?
      this.fileDeps.get(fileName) :
      null;
  }

  public serialize() {
    const deps: Record<string, string[]> = {};
    for (const [k, v] of this.fileDeps.entries()) {
      deps[k] = Array.from(v);
    }
    return JSON.stringify({
      fileDeps: deps
    });
  }

  public debug() {
    this.fileDeps.forEach(dep => {
      printMessageListItem(Array.from(dep).join('::'))
    })
  }
}


