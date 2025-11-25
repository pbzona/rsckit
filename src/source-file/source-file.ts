import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Cache } from "@/cache/cache";
import { hashString } from "@/lib/hash";
import { printMessage } from "@/lib/output";
import { findParentPackage } from "@/lib/package";
import { Serializable } from "@/lib/serialize";
import { displayName, fileNameFromPath } from "@/lib/utils";
import { getImports, hasUseClientDirective } from "@/parser/operations";
import { Parser } from "@/parser/parser";
import { ParserService } from "@/parser/service";
import chalk from "chalk";

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

export class SourceFileImpl implements Serializable {
  dependencies: string[] = [];
  useClient = false;
  packageName?: string;
  hash = "";
  parser: Parser | null = null;

  constructor(
    public filePath: string,
    private parserService: ParserService,
    private cache: Cache<SourceFile>,
  ) {
    this.cache.set(filePath, this);

    if (this.isNodeModule()) {
      this.getPackage();
    }

    if (this.isPage) {
      printMessage(
        `${chalk.green.bold("Creating page")} ${displayName(filePath)}`,
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
    if (this.cache.has(this.filePath)) {
      const { hash } = this.cache.get(this.filePath);
      if (hash !== this.hash) {
        this.cache.set(this.filePath, this);
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

  async analyze(): Promise<void> {
    this.parser = await this.parserService.parse(this);

    // Get dependencies recursively
    this.dependencies = await getImports(this.parser);
    // Note to future self - don't create these concurrently
    for (const dep of this.dependencies) {
      if (!this.cache.has(dep)) {
        printMessage(`Creating source file object for ${displayName(dep)}`);
        await createSourceFile(dep, this.parserService, this.cache);
      }
    }

    // Check to see if the file contains a use client directive
    this.useClient = await hasUseClientDirective(this.parser);

    // Update the cache if necessary
    this.maybeUpdateCache();
  }

  serialize(): string {
    const data = {
      filePath: this.filePath,
      dependencies: this.dependencies,
      useClient: this.useClient,
      packageName: this.packageName,
      hash: this.hash,
    };
    return JSON.stringify(data);
  }
}

export async function createSourceFile(
  file: string,
  parserService: ParserService,
  cache: Cache<SourceFile>,
) {
  // Check the cache first
  if (cache.has(file)) {
    const cached = cache.get(file);
    // If the cached value is just raw data, reconstruct it
    if (!("analyze" in cached)) {
      const sourceFile = new SourceFileImpl(file, parserService, cache);
      Object.assign(sourceFile, cached);
      await sourceFile.analyze();
      cache.set(file, sourceFile);
      return sourceFile;
    }
    return cached;
  }

  const sourceFile = new SourceFileImpl(file, parserService, cache);
  await sourceFile.analyze();

  cache.set(sourceFile.filePath, sourceFile);

  return sourceFile;
}
