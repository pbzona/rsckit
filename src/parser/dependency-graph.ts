
export class DependencyGraph {
  public usesClientSideRendering: boolean = false;

  constructor(public root: FilePath) { }

  async traverse(dependencies: Set<SourceFile>) {
    if (dependencies.size === 0) {
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
        cache.set(f.filePath, { src: f })

        // Sets to true if false but doesn't set false to true 
        this.usesClientSideRendering = this.usesClientSideRendering || await f.checkForUseClient();

        return await this.traverse(fdeps);
      }

      // Continue depth first traversal
      return await this.traverse(cached as Set<SourceFile>);
    }
  }

  async build() {
    const cache = Cache.use();
    const entry = cache.get(this.root);
    const { src } = entry;

    if (!src.dependencies) {
      const f = new SourceFile(this.root);
      await f.getDependencies();
      return await this.build()
    }

    await this.traverse(src.dependencies)
  }
}

