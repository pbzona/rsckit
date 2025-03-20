import { Cache } from "@/cache/cache"
import { Dependency } from "@/file-objects/dependencies";
import { SourceFile } from "@/file-objects/source-file";

export class DependencyGraph {
  constructor(public root: string) { }

  async traverse(dependencies: Dependency[]) {
    if (dependencies.length === 0) {
      return;
    }

    const depCache = Cache.useData("dependencies")

    for (const dep of dependencies) {
      const cached = depCache.get(dep.filePath)

      // Create a cache entry if it doesn't already exist so that 
      // future traversals can use it
      if (!cached) {
        const f = new SourceFile(dep.filePath);
        const fdeps = await f.getDependencies();
        depCache.set(f.filePath, fdeps)
        return await this.traverse(fdeps);
      }

      // Continue depth first traversal
      return await this.traverse(cached as Dependency[]);
    }
  }

  async build() {
    const depCache = Cache.useData("dependencies");
    const rootImports = depCache.get(this.root);

    if (!rootImports) {
      const f = new SourceFile(this.root);
      const deps = await f.getDependencies();
      depCache.set(f.filePath, deps);
      return await this.build()
    }

    await this.traverse(rootImports as Dependency[])
  }
}

