import path from "node:path";
import { SourceFile } from "@/source-file/source-file";
import { ParserService } from "@/parser/service";
import { createFinderFn, inferRoutesFromPagePaths } from "./utils";
import { printHeadingAlt, printMessage } from "@/lib/output";
import { ProjectConfig, AnalysisResult } from "./types";
import { SourceFileRepository } from "@/source-file/repository";
import { createCache } from "@/cache/cache";

export class Project {
  private sourceFiles: SourceFileRepository;
  private parser: ParserService;

  constructor(private config: ProjectConfig) {
    this.parser = new ParserService(config.parser.options);
    this.sourceFiles = new SourceFileRepository(
      this.parser,
      createCache<SourceFile>("source-files.json")
    );
  }

  async findPages(): Promise<SourceFile[]> {
    const findPages = createFinderFn(this.config.root, "page");
    const pagePaths = await findPages();
    return this.sourceFiles.findAll(pagePaths);
  }

  async analyze(): Promise<AnalysisResult> {
    printHeadingAlt("Finding app router pages...");
    const pages = await this.findPages();

    printMessage("Found pages:");
    for (const page of pages) {
      console.log(page.filePath);
    }

    printHeadingAlt("Inferring routes...");
    const routes = inferRoutesFromPagePaths(pages.map(p => p.filePath));

    return {
      pages,
      routes,
      clientBoundaries: [] // TODO: Implement client boundary detection
    };
  }
}
