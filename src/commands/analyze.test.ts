import { analyze } from "./analyze";
import { Project } from "@/project/project";
import { Config } from "@/config";
import * as path from "path";

// Mock globby to prevent ESM issues
jest.mock("globby", () => ({
  globby: jest.fn()
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
    getSourceFile: jest.fn()
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
      clientBoundaries: []
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("outputs JSON when --json flag is present", async () => {
    const mockResult = {
      pages: [{ filePath: "page.tsx", useClient: false, dependencies: [] }],
      routes: ["/"],
      clientBoundaries: []
    };
    mockProject.analyze.mockResolvedValue(mockResult);

    await analyze({ json: true, skipCache: true });

    expect(consoleLogSpy).toHaveBeenCalled();
    // Check that the last log call was the JSON output
    const lastCall = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(lastCall);
    
    expect(parsed).toEqual(mockResult);
  });

  it("skips human-readable logs when --json is present", async () => {
    await analyze({ json: true, skipCache: true });

    // Should verify that "Analysis Summary" etc are NOT printed
    const allCalls = consoleLogSpy.mock.calls.map(c => c[0]).join("");
    expect(allCalls).not.toContain("Analysis Summary");
    expect(allCalls).not.toContain("Client Boundaries");
  });

  it("outputs human-readable text by default", async () => {
    await analyze({ skipCache: true });

    const allCalls = consoleLogSpy.mock.calls.map(c => c[0]).join("");
    expect(allCalls).toContain("Analysis Summary");
  });
});
