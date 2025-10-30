import { sourceFileCache } from "@/cache";
import { Stack } from "@/lib/stack";
import { SourceFile } from "./source-file";

type ClientBoundary = {
  serverComponent: GraphNode;
  clientComponent: GraphNode;
};

class GraphNode {
  dependencies: GraphNode[] = [];

  private constructor(
    public filePath: string,
    public useClient: boolean,
  ) { }

  static fromSourceFile(file: SourceFile) {
    return new GraphNode(file.filePath, file.useClient);
  }

  addDependency(dep: GraphNode) {
    this.dependencies.push(dep);
  }
}

export class Graph {
  graph: GraphNode;
  current: GraphNode;
  ancestors: Stack<GraphNode>;
  visited: Set<string> = new Set();
  clientBoundaries: ClientBoundary[];

  constructor(root: SourceFile) {
    this.current = GraphNode.fromSourceFile(root);

    this.graph = this.current;
    this.ancestors = new Stack(this.current);
  }

  build() {
    console.log("Building graph");
    if (
      this.current.dependencies.length === 0 ||
      this.visited.has(this.current.filePath)
    ) {
      this.current = this.ancestors.pop();
      return this.build();
    }

    const sourceFile = sourceFileCache.get(this.current.filePath);
    const parent = this.ancestors.peek();

    for (const dep of sourceFile.dependencies) {
      const file = sourceFileCache.get(dep);
      const node = GraphNode.fromSourceFile(file);

      if (!parent.useClient && node.useClient) {
        this.clientBoundaries.push({
          serverComponent: parent,
          clientComponent: node,
        });
      }

      parent.addDependency(node);
      this.ancestors.push(node);
      this.current = node;
      this.visited.add(this.current.filePath);
      return this.build();
    }

    return this.current;
  }

  getClientBoundaries() {
    return this.clientBoundaries;
  }
}
