import * as fs from "node:fs/promises";
import * as path from "node:path"
import { Parser } from "@/parser/parser";
import { createDependency, Dependency } from "./dependencies";
import { DependencyGraph } from "@/parser/dependency-graph";
import { printMessage } from "@/lib/output";
import { hashString } from "@/lib/hash";

export class SourceFile {
  public fileName: string;
  public dependencies: Dependency[] = [];
  private hash: string; // Eventually use this for caching
  private parser: Parser | null = null;
  private depGraph: DependencyGraph;

  constructor(public filePath: string) {
    this.fileName = path.basename(filePath).replace(path.extname(filePath), "")
    this.depGraph = new DependencyGraph(this.filePath);
  }

  async read(): Promise<string> {
    const fileContent = await fs.readFile(this.filePath, "utf8");
    const str = fileContent.toString();
    this.hash = hashString(str);
    return str;
  }

  async parse(): Promise<SourceFile> {
    this.parser = new Parser(this);
    printMessage(`Parsing file: ${this.filePath.split("/").slice(-2).join("/")}`);
    await this.parser.parse();
    return this;
  }

  async getDependencies(): Promise<Dependency[]> {
    if (!this.parser) {
      await this.parse();
    }
    const importedModules = await this.parser.getImports();
    this.dependencies = importedModules
      .map(dep => createDependency(dep))
      .filter(dep => !!dep)
    return this.dependencies;
  }

  async buildGraph() {
    return await this.depGraph.build();
  }
}
