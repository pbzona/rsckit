import path from "node:path";
import { type Cache, createCache } from "@/cache/cache";
import { printHeadingAlt, printMessage } from "@/lib/output";
import { ParserService } from "@/parser/service";
import { Graph } from "@/source-file/graph";
import { SourceFileRepository } from "@/source-file/repository";
import { SourceFile } from "@/source-file/source-file";
import { AnalysisResult, ClientBoundary, ProjectConfig } from "./types";
import { createFinderFn, inferRoutesFromPagePaths } from "./utils";

export class Project {
  private sourceFiles: SourceFileRepository;
  private parser: ParserService;
  private cache: Cache<SourceFile>;

  constructor(private config: ProjectConfig) {
    this.parser = new ParserService(config.parser.options);
    this.cache = createCache<SourceFile>("source-files.json");
    this.sourceFiles = new SourceFileRepository(this.parser, this.cache);
  }

  async restoreCache(): Promise<void> {
    // Pass parser service and factory to properly reconstruct SourceFile instances
    const { createSourceFile } = await import("@/source-file/source-file");
    // Create a factory wrapper that includes the cache
    const factory = (filePath: string, parserService: ParserService) =>
      createSourceFile(filePath, parserService, this.cache);
    await this.cache.restoreFromFile(this.parser, factory);
  }

  async saveCache(): Promise<void> {
    await this.cache.writeToFile();
  }

  async findPages(): Promise<SourceFile[]> {
    const findPages = createFinderFn(this.config.root, "page");
    const pagePaths = await findPages();
    return this.sourceFiles.findAll(pagePaths);
  }

  async getSourceFile(filePath: string): Promise<SourceFile> {
    return this.sourceFiles.find(filePath);
  }

  async analyze(): Promise<AnalysisResult> {
    printHeadingAlt("Finding app router pages...");
    const pages = await this.findPages();

    printMessage("Found pages:");
    for (const page of pages) {
      console.log(page.filePath);
    }

    printHeadingAlt("Inferring routes...");
    const routes = inferRoutesFromPagePaths(pages.map((p) => p.filePath));

    printHeadingAlt("Detecting client boundaries...");
    const clientBoundaries: ClientBoundary[] = [];

    for (const page of pages) {
      const graph = new Graph(page, this.cache);
      graph.build();
      const boundaries = graph.getClientBoundaries();

      for (const b of boundaries) {
        clientBoundaries.push({
          serverComponent: b.serverComponent.filePath,
          clientComponent: b.clientComponent.filePath,
        });
      }
    }

    return {
      pages,
      routes,
      clientBoundaries,
    };
  }
}
