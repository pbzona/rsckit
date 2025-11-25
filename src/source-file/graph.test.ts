import { Cache } from "@/cache/cache";
import { Graph, GraphNode } from "./graph";
import { SourceFile } from "./source-file";

// Mock classes
class MockSourceFile implements SourceFile {
  filePath: string;
  fileName: string;
  dependencies: string[];
  useClient: boolean;
  hash = "123";
  size = 0;
  packageName?: string;
  isPage = false;

  constructor(path: string, deps: string[] = [], useClient = false) {
    this.filePath = path;
    this.fileName = path.split("/").pop() || "";
    this.dependencies = deps;
    this.useClient = useClient;
  }

  serialize = () => "";
  read = async () => "";
  analyze = async () => {};
}

describe("Graph", () => {
  let cache: Cache<SourceFile>;

  beforeEach(() => {
    // Simple in-memory mock cache
    const data = new Map<string, SourceFile>();
    cache = {
      get: (key: string) => data.get(key),
      set: (key: string, val: SourceFile) => data.set(key, val),
      has: (key: string) => data.has(key),
      restoreFromFile: async () => {},
      writeToFile: async () => {},
    } as any;
  });

  it("builds a simple dependency graph", () => {
    const root = new MockSourceFile("root.tsx", ["child.tsx"]);
    const child = new MockSourceFile("child.tsx", []);

    cache.set("root.tsx", root);
    cache.set("child.tsx", child);

    const graph = new Graph(root, cache);
    const node = graph.build();

    expect(node.filePath).toBe("root.tsx");
    expect(node.dependencies).toHaveLength(1);
    expect(node.dependencies[0].filePath).toBe("child.tsx");
  });

  it("handles circular dependencies (A -> B -> A)", () => {
    const a = new MockSourceFile("a.tsx", ["b.tsx"]);
    const b = new MockSourceFile("b.tsx", ["a.tsx"]);

    cache.set("a.tsx", a);
    cache.set("b.tsx", b);

    const graph = new Graph(a, cache);
    const node = graph.build();

    expect(node.filePath).toBe("a.tsx");
    // A -> B
    expect(node.dependencies[0].filePath).toBe("b.tsx");
    // B -> A
    expect(node.dependencies[0].dependencies[0].filePath).toBe("a.tsx");
    // Check reference equality (cycle detected)
    expect(node.dependencies[0].dependencies[0]).toBe(node);
  });

  it("detects client boundaries (Server -> Client)", () => {
    const server = new MockSourceFile("page.tsx", ["client.tsx"], false);
    const client = new MockSourceFile("client.tsx", [], true);

    cache.set("page.tsx", server);
    cache.set("client.tsx", client);

    const graph = new Graph(server, cache);
    graph.build();

    const boundaries = graph.getClientBoundaries();
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0].serverComponent.filePath).toBe("page.tsx");
    expect(boundaries[0].clientComponent.filePath).toBe("client.tsx");
  });

  it("does NOT flag Client -> Client as a boundary", () => {
    const clientParent = new MockSourceFile("parent.tsx", ["child.tsx"], true);
    const clientChild = new MockSourceFile("child.tsx", [], true);

    cache.set("parent.tsx", clientParent);
    cache.set("child.tsx", clientChild);

    const graph = new Graph(clientParent, cache);
    graph.build();

    const boundaries = graph.getClientBoundaries();
    expect(boundaries).toHaveLength(0);
  });

  it("does NOT flag Server -> Server as a boundary", () => {
    const serverParent = new MockSourceFile("parent.tsx", ["child.tsx"], false);
    const serverChild = new MockSourceFile("child.tsx", [], false);

    cache.set("parent.tsx", serverParent);
    cache.set("child.tsx", serverChild);

    const graph = new Graph(serverParent, cache);
    graph.build();

    const boundaries = graph.getClientBoundaries();
    expect(boundaries).toHaveLength(0);
  });
});
