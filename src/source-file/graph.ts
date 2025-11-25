import type { Cache } from "@/cache";
import { SourceFile } from "./source-file";

type ClientBoundary = {
  serverComponent: GraphNode;
  clientComponent: GraphNode;
};

export class GraphNode {
  dependencies: GraphNode[] = [];

  constructor(
    public filePath: string,
    public useClient: boolean,
  ) {}

  static fromSourceFile(file: SourceFile) {
    return new GraphNode(file.filePath, file.useClient);
  }

  addDependency(dep: GraphNode) {
    this.dependencies.push(dep);
  }
}

export class Graph {
  graph: GraphNode;
  // Map filePath to GraphNode to ensure reference equality and handle cycles
  nodes: Map<string, GraphNode> = new Map();
  clientBoundaries: ClientBoundary[] = [];

  constructor(
    root: SourceFile,
    private cache: Cache<SourceFile>,
  ) {
    this.graph = GraphNode.fromSourceFile(root);
    this.nodes.set(root.filePath, this.graph);
  }

  build() {
    // console.log("Building graph for", this.graph.filePath);
    this.traverse(this.graph);
    return this.graph;
  }

  private traverse(node: GraphNode) {
    const sourceFile = this.cache.get(node.filePath);
    if (!sourceFile) return;

    for (const depPath of sourceFile.dependencies) {
      let depNode = this.nodes.get(depPath);
      let isNew = false;

      // If we haven't seen this node before, create it
      if (!depNode) {
        const depFile = this.cache.get(depPath);
        if (!depFile) continue; // Skip if not in cache (e.g. external lib ignored by parser)

        depNode = GraphNode.fromSourceFile(depFile);
        this.nodes.set(depPath, depNode);
        isNew = true;
      }

      // Detect Client Boundary: Server -> Client
      if (!node.useClient && depNode.useClient) {
        this.clientBoundaries.push({
          serverComponent: node,
          clientComponent: depNode,
        });
      }

      // Add dependency edge
      node.addDependency(depNode);

      // Recurse only if this is a new node (avoid infinite loops)
      if (isNew) {
        this.traverse(depNode);
      }
    }
  }

  getClientBoundaries() {
    return this.clientBoundaries;
  }
}
