import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Parser, ParserFactory } from "@/parser/parser";
import { DependencyGraph } from "@/parser/dependency-graph";
import { findParentPackage } from "@/lib/package";
import { hashString } from "@/lib/hash";
import { fileNameFromPath } from "@/lib/utils";
import { Serializable } from "@/lib/serialize";
import { sourceFileCache } from "@/cache";
import { getImports, hasUseClientDirective } from "@/parser/operations";

export interface SourceFile {
  filePath: string;
  fileName: string;
  dependencies: string[];
  useClient: boolean;
  packageName?: string;
  hash: string;
  serialize: () => string;
  read: () => Promise<string>;
  analyze: () => Promise<void>;
}

function inCache(filePath: string): boolean {
  return sourceFileCache.has(filePath);
}

export async function createSourceFile(file: string, parserFactory: ParserFactory): Promise<SourceFile> {
  // Check the cache first
  if (inCache(file)) {
    return sourceFileCache.get(file);
  }

  class SourceFileImpl implements Serializable {
    dependencies: string[];
    useClient: boolean;
    packageName?: string;
    hash: string; // Eventually use this for caching
    parser: Parser;
    private depGraph: DependencyGraph;

    constructor(public filePath: string) {
      this.depGraph = new DependencyGraph(this.filePath);

      if (this.isNodeModule()) {
        this.getPackage();
      }

    }

    get fileName(): string {
      return fileNameFromPath(this.filePath)
    }

    get isPage(): boolean {
      // Good enough 
      return this.fileName === "page";
    }

    maybeUpdateCache(): void {
      if (inCache(this.filePath)) {
        const { hash } = sourceFileCache.get(this.filePath)
        if (hash !== this.hash) {
          sourceFileCache.set(this.filePath, this);
        }
      }
    }

    async read(): Promise<string> {
      const fileContent = await fs.readFile(this.filePath, "utf8");
      const str = fileContent.toString();
      this.hash = hashString(str);
      return str;
    }

    private isNodeModule(): boolean {
      return this.filePath.split("/").includes("node_modules");
    }

    // This is synchronous!!!
    // Will change later when perf becomes a bigger concern
    private getPackage(): string {
      if (this.packageName) {
        return this.packageName;
      }

      // Assumes that the package name is the same as the directory
      // as package.json - this isn't always the case but it's good
      // enough for now
      this.packageName = findParentPackage(path.dirname(this.filePath))
        .split("/")
        .slice(-1)[0];
      return this.packageName;
    }

    async parse(): Promise<void> {
      this.parser = await parserFactory(this);
    }

    async analyze(): Promise<void> {
      if (!this.parser) {
        await this.parse();
      }

      // Get dependencies
      this.dependencies = await getImports(this.parser);

      // Check to see if the file contains a use client directive
      this.useClient = await hasUseClientDirective(this.parser);

      // Update the cache if necessary
      this.maybeUpdateCache()
    }

    serialize(): string {
      const { filePath, dependencies, useClient, hash, packageName } = this;
      return JSON.stringify({
        filePath, dependencies, useClient, hash, packageName
      })
    }

    async buildGraph() {
      return await this.depGraph.build();
    }
  }

  const sourceFile = new SourceFileImpl(file);
  await sourceFile.parse();
  sourceFileCache.set(sourceFile.filePath, sourceFile);
  return sourceFile as SourceFile;
}
