import { SourceFile } from "@/source-file/source-file";
import { Parser, ParserOptions } from "./parser";
import { ParserService } from "./service";

describe("ParserService", () => {
  let service: ParserService;
  let mockSourceFile: jest.Mocked<SourceFile>;

  const mockOptions: ParserOptions = {
    projectRoot: "/test",
    tsConfigPath: "/test/tsconfig.json",
  };

  beforeEach(() => {
    mockSourceFile = {
      filePath: "test.ts",
      fileName: "test.ts",
      read: jest.fn().mockResolvedValue("test content"),
    } as unknown as jest.Mocked<SourceFile>;

    service = new ParserService(mockOptions);
  });

  it("should create a parser for a source file", async () => {
    const parser = await service.parse(mockSourceFile);

    expect(parser).toBeDefined();
    expect(parser.sourceFile).toBe(mockSourceFile);
    expect(parser.projectRoot).toBe(mockOptions.projectRoot);
    expect(parser.tsConfigPath).toBe(mockOptions.tsConfigPath);
  });

  it("should handle file not found errors", async () => {
    mockSourceFile.read.mockRejectedValue(new Error("File not found"));

    const parser = await service.parse(mockSourceFile);

    expect(parser.ast).toBeNull();
    expect(parser.collection).toBeNull();
  });
});
