import { Cache } from "@/cache/cache"
import { Dependency } from "@/file-objects/dependencies";
import { SourceFile } from "@/file-objects/source-file";

export class DependencyGraph {
  public usesClientSideRendering: boolean = false;

  constructor(public root: string) { }

  async traverse(dependencies: Dependency[]) {
    if (dependencies.length === 0) {
      return;
    }

    const cache = Cache.use();

    for (const dep of dependencies) {
      const cached = cache.get(dep.filePath)

      // Create a cache entry if it doesn't already exist so that 
      // future traversals can use it
      if (!cached) {
        const f = new SourceFile(dep.filePath);
        const fdeps = await f.getDependencies();
        cache.set(f.filePath, fdeps)

        // Sets to true if false but doesn't set false to true 
        this.usesClientSideRendering = this.usesClientSideRendering || await f.checkForUseClient();

        return await this.traverse(fdeps);
      }

      // Continue depth first traversal
      return await this.traverse(cached as Dependency[]);
    }
  }

  async build() {
    const cache = Cache.use();
    const rootImports = cache.get(this.root);

    if (!rootImports) {
      const f = new SourceFile(this.root);
      const deps = await f.getDependencies();
      cache.set(f.filePath, deps);
      return await this.build()
    }

    await this.traverse(rootImports as Dependency[])
  }
}

