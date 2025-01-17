import { existsSync, mkdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Tree } from "dependency-tree";
import { printMessage, printSuccess } from './output';
import { flatten } from "./tree";

const DEFAULT_CACHE_DIRECTORY = '.rsckit';

type DependencySet = Set<string>;
type DependencyTree = Tree;
type DependencyTrees = Record<string, DependencyTree>;

type SerializedCache = {
  dependencies: string | null;
  dependencyTrees: string | null;
};

function isSerializedCache(obj: unknown): obj is SerializedCache {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "dependencies" in obj &&
    typeof (obj as any).dependencies === "string" &&
    "dependencyTrees" in obj &&
    typeof (obj as any).dependencyTrees === "string"
  );
}

export class ModuleCache {
  private static instance: ModuleCache;
  private _location: string;
  private _dependencies: DependencySet;
  private _dependencyTrees: DependencyTrees;

  private constructor(location: string) {
    this._location = path.resolve(process.cwd(), location, "module-cache.json");
    mkdirSync(this._location, { recursive: true });

    if (existsSync(this._location)) {
      this.restoreFromDisk();
    } else {
      printMessage('No existing module cache data to restore, creating a fresh instance');
      this._dependencies = new Set();
      this._dependencyTrees = {};
    }
  }

  public static init(location?: string) {
    if (!ModuleCache.instance) {
      ModuleCache.instance = new ModuleCache(location ? location : DEFAULT_CACHE_DIRECTORY);
    }
    return ModuleCache.instance;
  }

  public static get(): ModuleCache {
    if (!ModuleCache.instance) {
      throw new Error('Module cache has not been initialized yet');
    }
    return ModuleCache.instance;
  }

  public getDependencySet(): DependencySet {
    return this._dependencies;
  }

  private computeUniqueDependencies(tree: DependencyTree): void {
    const separator = "..";
    const deps = flatten(tree, separator);
    const uniqueDeps = [];

    for (const filePath of Object.keys(deps)) {
      const nestedLayers = filePath.split(separator);
      uniqueDeps.push(nestedLayers[nestedLayers.length - 1]);
    }

    uniqueDeps.forEach(dep => this._dependencies.add(dep));
  }

  public getDependencyTree(filePath: string): DependencyTree {
    try {
      return this._dependencyTrees[filePath];
    } catch (error) {
      throw new Error(`No dependency tree found for ${filePath}`, {
        cause: error
      });
    }
  }

  public addDependencyTree(tree: DependencyTree) {
    try {
      const filePath = Object.keys(tree)[0];
      this._dependencyTrees[filePath] = tree;
    } catch (error) {
      throw new Error('Could not add dependency tree', {
        cause: error
      });
    }
  };

  public getDependencyTrees(): DependencyTrees {
    try {
      return this._dependencyTrees;
    } catch (error) {
      throw new Error("No dependency trees in cache", {
        cause: error
      });
    }
  }

  private serialize(): SerializedCache {
    return {
      dependencies: JSON.stringify(Array.from(this._dependencies)),
      dependencyTrees: JSON.stringify(this._dependencyTrees)
    };
  }

  public async writeToDisk(): Promise<void> {
    try {
      await fs.writeFile(this._location, JSON.stringify(this.serialize()));
      printSuccess(`Successfully flushed module cache to disk: ${this._location}`);
    } catch (error) {
      throw new Error('Unable to write cache to disk', {
        cause: error
      });
    }
  }

  public async restoreFromDisk() {
    try {
      const fileContent = await fs.readFile(this._location, 'utf-8');
      const parsedContent = JSON.parse(fileContent) as SerializedCache;

      if (!isSerializedCache(parsedContent)) {
        throw new Error('Cache data does not match the expected serialization format');
      }

      const { dependencies, dependencyTrees } = parsedContent;
      JSON.parse(dependencies).forEach(dep => this._dependencies.add(dep));
      Object.assign(this._dependencyTrees, dependencyTrees);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error('Unable to restore cache from disk', {
          cause: error
        });
      }
    }
  }
}
