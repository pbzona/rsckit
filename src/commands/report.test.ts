import { Project } from "@/project/project";
import { report } from "./report";

// Mock globby to prevent ESM issues
jest.mock("globby", () => ({
  globby: jest.fn(),
}));

// Mock chalk to prevent ESM issues
jest.mock("chalk", () => {
  const handler = {
    get: () => proxy,
    apply: (_target: any, _this: any, args: any[]) => args[0],
  };
  const proxy = new Proxy(() => {}, handler);
  return proxy;
});

// Mock the Project class
jest.mock("@/project/project");

// Mock tasuku
jest.mock("tasuku", () => {
  return jest.fn(async (_title, action) => {
    await action();
    return { result: null };
  });
});

describe("report command", () => {
  let consoleLogSpy: jest.SpyInstance;

  const mockProject = {
    restoreCache: jest.fn(),
    getAnalysisFromCache: jest.fn(),
    getAllCachedFiles: jest.fn(),
    getSourceFile: jest.fn(),
  };

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(process, "chdir").mockImplementation(() => {});

    (Project as jest.Mock).mockImplementation(() => mockProject);

    // Default mock return values
    mockProject.getAllCachedFiles.mockReturnValue([]);
    mockProject.getAnalysisFromCache.mockReturnValue({
      pages: [],
      routes: [],
      clientBoundaries: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("outputs JSON when --json flag is present", async () => {
    const mockResult = {
      pages: [{ filePath: "page.tsx", useClient: false, dependencies: [] }],
      routes: ["/"],
      clientBoundaries: [],
    };
    const expectedOutput = {
      pages: [
        {
          filePath: "page.tsx",
          useClient: false,
          dependencies: [],
          size: 0,
          formattedSize: "0 Bytes",
        },
      ],
      routes: ["/"],
      clientBoundaries: [],
    };
    mockProject.getAllCachedFiles.mockReturnValue([{ isPage: true }]);
    mockProject.getAnalysisFromCache.mockReturnValue(mockResult);

    await report({ json: true });

    expect(consoleLogSpy).toHaveBeenCalled();
    const lastCall = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(lastCall);
    expect(parsed).toEqual(expectedOutput);
  });

  it("truncates long lists of siblings when they are leaves (no children)", async () => {
    // Mock a structure where a file has many dependencies that are leaves
    const leafDeps = Array.from({ length: 10 }, (_, i) => `leaf-${i}.tsx`);
    const mockPages = [
      { filePath: "page.tsx", useClient: false, dependencies: ["parent.tsx"] },
    ];
    const mockBoundaries = [{ parent: "page.tsx", child: "parent.tsx" }];

    mockProject.getAllCachedFiles.mockReturnValue([
      { isPage: true, filePath: "page.tsx" },
    ]);
    mockProject.getAnalysisFromCache.mockReturnValue({
      pages: mockPages,
      routes: ["/"],
      clientBoundaries: mockBoundaries,
    });

    // Mock getSourceFile behavior
    mockProject.getSourceFile.mockImplementation(async (path) => {
      if (path === "parent.tsx") {
        return {
          filePath: "parent.tsx",
          dependencies: leafDeps,
          useClient: true,
          size: 100,
        };
      }
      if (leafDeps.includes(path)) {
        return {
          filePath: path,
          dependencies: [], // No children -> Leaf
          useClient: false,
          size: 50,
        };
      }
      return null;
    });

    await report({});

    const allCalls = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");

    // Should show first 4 leaves
    expect(allCalls).toContain("leaf-0.tsx");
    expect(allCalls).toContain("leaf-1.tsx");
    expect(allCalls).toContain("leaf-2.tsx");
    expect(allCalls).toContain("leaf-3.tsx");

    // Should NOT show the 5th leaf
    expect(allCalls).not.toContain("leaf-4.tsx");

    // Should show truncation message
    expect(allCalls).toContain("... 6 more");
  });

  it("mixes branches and leaves correctly (truncates only leaves)", async () => {
    const siblings = Array.from({ length: 10 }, (_, i) => `sibling-${i}.tsx`);
    const mockPages = [
      { filePath: "page.tsx", useClient: false, dependencies: ["parent.tsx"] },
    ];
    const mockBoundaries = [{ parent: "page.tsx", child: "parent.tsx" }];

    mockProject.getAllCachedFiles.mockReturnValue([
      { isPage: true, filePath: "page.tsx" },
    ]);
    mockProject.getAnalysisFromCache.mockReturnValue({
      pages: mockPages,
      routes: ["/"],
      clientBoundaries: mockBoundaries,
    });

    mockProject.getSourceFile.mockImplementation(async (path) => {
      if (path === "parent.tsx") {
        return {
          filePath: "parent.tsx",
          dependencies: siblings,
          useClient: true,
          size: 100,
        };
      }
      if (siblings.includes(path)) {
        // Sibling-0 has a child
        if (path === "sibling-0.tsx") {
          return {
            filePath: path,
            dependencies: ["child.tsx"],
            useClient: false,
            size: 50,
          };
        }
        // Others are leaves
        return {
          filePath: path,
          dependencies: [],
          useClient: false,
          size: 50,
        };
      }
      if (path === "child.tsx") {
        return {
          filePath: path,
          dependencies: [],
          useClient: false,
          size: 20,
        };
      }
      return null;
    });

    await report({});

    const allCalls = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");

    expect(allCalls).toContain("sibling-0.tsx"); // The branch
    expect(allCalls).toContain("sibling-1.tsx");
    expect(allCalls).toContain("sibling-2.tsx");
    expect(allCalls).toContain("sibling-3.tsx");
    expect(allCalls).toContain("sibling-4.tsx");

    // The leaves after 4 should be truncated
    expect(allCalls).not.toContain("sibling-5.tsx");

    // Should show truncation message
    expect(allCalls).toContain("... 5 more");
  });
});
