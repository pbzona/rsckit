import { Cache } from "@/cache/cache"
import { Dependency } from "@/file-objects/dependencies";
import { SourceFile } from "@/file-objects/source-file";

export class DependencyGraph {
  private cache: Cache<Dependency[]>

  constructor(public root: string) {
    this.cache = Cache.use()
  }

  async traverse(dependencies: Dependency[]) {
    if (dependencies.length === 0) {
      return;
    }

    for (const dep of dependencies) {
      const cached = this.cache.get(dep.filePath)

      // Create a cache entry if it doesn't already exist so that 
      // future traversals can use it
      if (!cached) {
        const f = new SourceFile(dep.filePath);
        const fdeps = await f.getDependencies();
        this.cache.set(f.filePath, fdeps)
        return await this.traverse(fdeps);
      }

      // Continue depth first traversal
      return await this.traverse(cached);
    }
  }

  async build() {
    const rootImports = this.cache.get(this.root);

    if (!rootImports) {
      const f = new SourceFile(this.root);
      const deps = await f.getDependencies();
      this.cache.set(f.filePath, deps);
      return await this.build()
    }

    await this.traverse(rootImports)
  }
}
//export class DependencyGraph {
//  private root: string;
//  private cache: CacheSegment<DependencyMap> = Cache.getInstance().segments.get("dependencies");
//
//  constructor(root: string) {
//    this.root = root;
//  }
//
//  public async buildGraph() {
//    // Build the root (this will be the owner of the graph)
//    const rootImports = this.cache.get(this.root);
//
//    if (!rootImports) {
//      const f = new ProjectFile(this.root);
//      await f.parseFile();
//      this.cache.add(f.filePath, f.dependencies);
//      return await this.buildGraph();
//    }
//
//    await this.traverse(rootImports);
//  }
//
//  private async traverse(dependencies: Set<string>) {
//    if (dependencies.size === 0) {
//      return;
//    }
//
//    for (const dep of dependencies) {
//      const cached = this.cache.getEntry(dep);
//
//      if (!cached) {
//        // Parse and then cache if entry does not exist, then continue traversal
//        const f = new ProjectFile(dep);
//        this.cache.addEntry(f);
//        await f.parseFile();
//
//        return await this.traverse(f.imports);
//      } else {
//        // ..otherwise continue DFS 
//        return await this.traverse(cached);
//      }
//    }
//  }
//}
