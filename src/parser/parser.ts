import * as path from "node:path";
import cabinet from "filing-cabinet";
import detective from "detective-typescript";
import swc, { Module } from "@swc/core";
import { SourceFile } from "@/file-objects/file";
import { Project } from "@/project/project";

export class Parser {
  public ast: Module | null;
  public static projectRoot: string;
  public static tsConfigPath: string;

  public constructor(public file: SourceFile) {
    this.ast = null;
  }

  // Initialize some settings that will be shared across all instances
  // for the same project
  public static init(project: Project) {
    const { root } = project;
    Parser.projectRoot = path.resolve(root);
    Parser.tsConfigPath = path.resolve(path.join(root, "tsconfig.json"));
  }

  public async parse(): Promise<Parser> {
    // We mostly care about the AST so return early if it already exists
    if (this.ast !== null) {
      return this;
    }

    try {
      const src = await this.file.read()
      const parsed = await swc.parse(src, {
        syntax: "typescript",
        tsx: true,
        target: "es2024"
      });
      this.ast = parsed

      return this;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Could not parse file: ${this.file.filePath}\n${error.message}`)
      }
    }
  }

  public async getImports(): Promise<string[]> {
    if (!this.ast) {
      await this.parse()
    }

    const deps = detective(this.ast, {
      jsx: true,
      skipAsyncImports: true
    })

    return deps.map((dep: string) => (
      cabinet({
        partial: dep,
        filename: this.file.filePath,
        directory: Parser.projectRoot,
        tsConfig: Parser.tsConfigPath,
        nodeModulesConfig: {
          entry: "any"
        }
      })
    ))
  }

  public async getExports(): Promise<any> {

  }
}
