import { SourceFileRepository } from "./repository";
import { SourceFile } from "./source-file";
import { Cache } from "@/cache/cache";
import { ParserService } from "@/parser/service";

// Mock dependencies
jest.mock("@/parser/service");
jest.mock("@/cache/cache");

describe("SourceFileRepository", () => {
  let repository: SourceFileRepository;
  let mockParser: jest.Mocked<ParserService>;
  let mockCache: jest.Mocked<Cache<SourceFile>>;

  beforeEach(() => {
    mockParser = {
      parse: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<ParserService>;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<Cache<SourceFile>>;

    repository = new SourceFileRepository(mockParser, mockCache);
  });

  it("should find a source file from cache", async () => {
    const mockSourceFile = {
      filePath: "test.ts",
      analyze: jest.fn().mockResolvedValue(undefined),
    } as unknown as SourceFile;

    mockCache.get.mockReturnValue(mockSourceFile);

    const result = await repository.find("test.ts");

    expect(result).toBe(mockSourceFile);
    expect(mockCache.get).toHaveBeenCalledWith("test.ts");
    expect(mockParser.parse).not.toHaveBeenCalled();
  });

  it("should create a new source file if not in cache", async () => {
    mockCache.get.mockReturnValue(undefined);

    const mockSourceFile = {
      filePath: "test.ts",
      analyze: jest.fn().mockResolvedValue(undefined),
    } as unknown as SourceFile;

    jest.spyOn(repository as any, "createSourceFile")
      .mockResolvedValue(mockSourceFile);

    const result = await repository.find("test.ts");

    expect(result).toBe(mockSourceFile);
    expect(mockCache.get).toHaveBeenCalledWith("test.ts");
    // Note: cache.set is not called because createSourceFile is mocked
  });

  it("should find multiple source files", async () => {
    const mockSourceFiles = [
      { filePath: "test1.ts" },
      { filePath: "test2.ts" },
    ] as SourceFile[];

    jest.spyOn(repository, "find")
      .mockResolvedValueOnce(mockSourceFiles[0])
      .mockResolvedValueOnce(mockSourceFiles[1]);

    const result = await repository.findAll(["test1.ts", "test2.ts"]);

    expect(result).toEqual(mockSourceFiles);
    expect(repository.find).toHaveBeenCalledTimes(2);
  });
});