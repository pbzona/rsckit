import * as fs from "node:fs/promises";
import * as path from "node:path";
import chalk from "chalk";
import { Parser, ParserFactory } from "@/parser/parser";
import { findParentPackage } from "@/lib/package";
import { hashString } from "@/lib/hash";
import { displayName, fileNameFromPath } from "@/lib/utils";
import { Serializable } from "@/lib/serialize";
import { sourceFileCache } from "@/cache";
import { getImports, hasUseClientDirective } from "@/parser/operations";
import { printMessage } from "@/lib/output";

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

export async function createSourceFile(
  file: string,
  parserFactory: ParserFactory,
) {
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

    constructor(public filePath: string) {
      sourceFileCache.set(filePath, this);

      if (this.isNodeModule()) {
        this.getPackage();
      }

      if (this.isPage) {
        printMessage(
          `${chalk.green.bold("Creating page")} ${displayName(file)}`,
        );
      }
    }

    get fileName(): string {
      return fileNameFromPath(this.filePath);
    }

    get isPage(): boolean {
      // Good enough
      return this.fileName === "page";
    }

    maybeUpdateCache(): void {
      if (inCache(this.filePath)) {
        const { hash } = sourceFileCache.get(this.filePath);
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

    isNodeModule(): boolean {
      return this.filePath.split("/").includes("node_modules");
    }

    // This is synchronous!!!
    // Will change later when perf becomes a bigger concern
    getPackage(): string {
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
      await this.parse();

      // Get dependencies recursively
      this.dependencies = await getImports(this.parser);
      // Note to future self - don't create these concurrently
      for (const dep of this.dependencies) {
        if (!inCache(dep)) {
          printMessage(`Creating source file object for ${displayName(dep)}`);
          await createSourceFile(dep, parserFactory);
        }
      }

      // Check to see if the file contains a use client directive
      this.useClient = await hasUseClientDirective(this.parser);

      // Update the cache if necessary
      this.maybeUpdateCache();
    }

    serialize(): string {
      const { filePath, dependencies, useClient, hash, packageName } = this;
      return JSON.stringify({
        filePath,
        dependencies,
        useClient,
        hash,
        packageName,
      });
    }
  }

  const sourceFile = new SourceFileImpl(file);
  await sourceFile.analyze();

  sourceFileCache.set(sourceFile.filePath, sourceFile);

  return sourceFile;
}
