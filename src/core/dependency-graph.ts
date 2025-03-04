import { DependencyCache } from "./cache";
import { ProjectFile } from "./project/file";

export class DependencyGraph {
  private root: string;
  private cache: DependencyCache = DependencyCache.getInstance();

  constructor(root: string) {
    this.root = root;
  }

  public async buildGraph() {
    // Build the root (this will be the owner of the graph)
    const rootImports = this.cache.getEntry(this.root);

    if (!rootImports) {
      const f = new ProjectFile(this.root);
      this.cache.addEntry(f);
      await f.parseFile();
      return await this.buildGraph();
    }

    await this.traverse(rootImports);
    console.log(this.cache);
  }

  private async traverse(dependencies: Set<string>) {
    if (dependencies.size === 0) {
      return;
    }

    for (const dep of dependencies) {
      const cached = this.cache.getEntry(dep);

      if (!cached) {
        // Parse and then cache if entry does not exist, then continue traversal
        const f = new ProjectFile(dep);
        this.cache.addEntry(f);
        await f.parseFile();

        return await this.traverse(f.imports);
      } else {
        // ..otherwise continue DFS 
        return await this.traverse(cached);
      }
    }
  }
}
