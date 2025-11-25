import * as path from "node:path";
import { Config } from "@/config";
import { Project } from "@/project/project";
import { analyze } from "./analyze";

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

describe("analyze command", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processChdirSpy: jest.SpyInstance;

  const mockProject = {
    restoreCache: jest.fn(),
    analyze: jest.fn(),
    saveCache: jest.fn(),
    getSourceFile: jest.fn(),
  };

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    processChdirSpy = jest.spyOn(process, "chdir").mockImplementation(() => {});

    (Project as jest.Mock).mockImplementation(() => mockProject);

    // Default mock return values
    mockProject.analyze.mockResolvedValue({
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
    mockProject.analyze.mockResolvedValue(mockResult);

    await analyze({ json: true, skipCache: true });

    expect(consoleLogSpy).toHaveBeenCalled();
    // Check that the last log call was the JSON output
    const lastCall = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(lastCall);

    expect(parsed).toEqual(expectedOutput);
  });

  it("skips human-readable logs when --json is present", async () => {
    await analyze({ json: true, skipCache: true });

    // Should verify that "Analysis Summary" etc are NOT printed
    const allCalls = consoleLogSpy.mock.calls.map((c) => c[0]).join("");
    expect(allCalls).not.toContain("Analysis Summary");
    expect(allCalls).not.toContain("Client Boundaries");
  });

  it("outputs human-readable text by default", async () => {
    await analyze({ skipCache: true });

    const allCalls = consoleLogSpy.mock.calls.map((c) => c[0]).join("");
    expect(allCalls).toContain("Analysis Summary");
  });

  it("truncates long lists of siblings when they are leaves (no children)", async () => {
    // Mock a structure where a file has many dependencies that are leaves
    const leafDeps = Array.from({ length: 10 }, (_, i) => `leaf-${i}.tsx`);
    const mockPages = [
      { filePath: "page.tsx", useClient: false, dependencies: ["parent.tsx"] },
    ];
    const mockBoundaries = [
      { serverComponent: "page.tsx", clientComponent: "parent.tsx" },
    ];

    mockProject.analyze.mockResolvedValue({
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

    await analyze({ skipCache: true });

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
    // Mock a structure where a file has many dependencies, and one has a child
    const siblings = Array.from({ length: 10 }, (_, i) => `sibling-${i}.tsx`);
    const mockPages = [
      { filePath: "page.tsx", useClient: false, dependencies: ["parent.tsx"] },
    ];
    const mockBoundaries = [
      { serverComponent: "page.tsx", clientComponent: "parent.tsx" },
    ];

    mockProject.analyze.mockResolvedValue({
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

    await analyze({ skipCache: true });

    const allCalls = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");

    // Should show ALL siblings because one has a child
    // NOTE: The new requirement is "Any time there are more than 4 leaves, it should be truncated."
    // "Any nodes that have children should be shown".
    // In this test case:
    // 1 sibling (sibling-0) has children (branch).
    // 9 siblings (sibling-1..9) are leaves.
    // Expectation:
    // - Show sibling-0 (branch)
    // - Show first 4 leaves (sibling-1..4)
    // - Show truncation message for remaining 5 leaves.

    expect(allCalls).toContain("sibling-0.tsx"); // The branch
    expect(allCalls).toContain("sibling-1.tsx");
    expect(allCalls).toContain("sibling-2.tsx");
    expect(allCalls).toContain("sibling-3.tsx");
    expect(allCalls).toContain("sibling-4.tsx");

    // The leaves after 4 should be truncated
    expect(allCalls).not.toContain("sibling-5.tsx");
    expect(allCalls).not.toContain("sibling-6.tsx");

    // Should show truncation message
    expect(allCalls).toContain("... 5 more");
  });
});
