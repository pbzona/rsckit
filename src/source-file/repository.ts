import { Cache } from "@/cache/cache";
import { printMessage } from "@/lib/output";
import { displayName } from "@/lib/utils";
import { ParserService } from "@/parser/service";
import { SourceFile, SourceFileImpl } from "./source-file";

export class SourceFileRepository {
  constructor(
    private parser: ParserService,
    private cache: Cache<SourceFile>,
  ) {}

  async find(filePath: string): Promise<SourceFile> {
    const cached = this.cache.get(filePath);
    if (cached) {
      // If the cached value is just raw data, reconstruct it
      if (!("analyze" in cached)) {
        const sourceFile = new SourceFileImpl(
          filePath,
          this.parser,
          this.cache,
        );
        Object.assign(sourceFile, cached);
        await sourceFile.analyze();
        this.cache.set(filePath, sourceFile);
        return sourceFile;
      }
      return cached;
    }

    return this.createSourceFile(filePath);
  }

  private async createSourceFile(filePath: string): Promise<SourceFile> {
    printMessage(`Creating source file object for ${displayName(filePath)}`);
    const sourceFile = new SourceFileImpl(filePath, this.parser, this.cache);
    await sourceFile.analyze();
    this.cache.set(filePath, sourceFile);
    return sourceFile;
  }

  async findAll(filePaths: string[]): Promise<SourceFile[]> {
    return Promise.all(filePaths.map((path) => this.find(path)));
  }
}
