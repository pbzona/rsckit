import * as path from "node:path"
import { findParentPackage } from "@/lib/package";
import { Serializable } from "@/lib/serialize";
import { isDeclarationFile } from "@/lib/parser-utils";

export type DependencyObj = {
  name: string;
  path: string;
  package?: string;
}

export const createDependency = (filePath: string) => {
  if (isDeclarationFile(filePath)) {
    return;
  }
  return new Dependency(filePath).init();
}

export class Dependency implements Serializable {
  public fileName: string;
  public package?: string;

  constructor(public filePath: string) {
    this.fileName = path.basename(this.filePath);
  }

  public init(): Dependency {
    this.getPackage();
    return this;
  }

  public isNodeModule(): boolean {
    return this.filePath.split("/").includes("node_modules");
  }

  // This is synchronous!!!
  // Will change later when perf becomes a bigger concern
  public getPackage(): string {
    if (!this.isNodeModule()) {
      return undefined;
    }

    if (this.package) {
      return this.package;
    }

    // Assumes that the package name is the same as the directory
    // containing package.json - this isn't always the case but it's good
    // enough for now
    this.package = findParentPackage(path.dirname(this.filePath))
      .split("/")
      .slice(-1)[0];
    return this.package;
  }

  public toObject(): DependencyObj {
    const obj: DependencyObj = {
      name: this.fileName,
      path: this.filePath
    }

    if (this.getPackage()) {
      Object.assign(obj, {
        package: this.package
      })
    }

    return obj;
  }

  public serialize(): string {
    const s = {
      fileName: this.fileName,
      filePath: this.filePath,
      package: this.getPackage() ? this.package : null
    };
    return JSON.stringify(s);
  }
}
