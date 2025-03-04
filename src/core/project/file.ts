import * as fs from "node:fs/promises";
import { Parser } from "../parser";
import { DependencyGraph } from "../dependency-graph";
import { FileImports } from "./types";

export class ProjectFile {
  public fileName: string;
  public filePath: string;
  public imports: FileImports;
  public dependencies: DependencyGraph;
  private parser: Parser;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.imports = new Set<string>();

    this.dependencies = new DependencyGraph(this.filePath);
    this.parser = new Parser(this.filePath);
  }

  public async readFileContent(): Promise<string> {
    const fileContent = await fs.readFile(this.filePath, "utf8");
    return fileContent.toString();
  }

  public async parseFile() {
    const src = await this.readFileContent();
    const parsed = await this.parser.parse(src.toString());
    const imports = await this.parser.getDirectDependencies(parsed.ast);

    imports.forEach(i => this.imports.add(i))
  }

  public serialize(extraFields: Record<any, any>) {
    // Accept extra fields in case this is called from a subclass
    return JSON.stringify({
      fileName: this.fileName,
      filePath: this.filePath,
      imports: Array.from(this.imports),
      ...extraFields
    })
  }
}

export class Page extends ProjectFile {
  public fileName = "page";

  constructor(filePath: string) {
    super(filePath);
  }

  public async buildDependencyGraph() {
    await this.dependencies.buildGraph();
  }
}

export class NodeModule extends ProjectFile {
  public fileName = "external";

  constructor(filePath: string) {
    super(filePath);
  }
}
