import * as path from "node:path";
import cabinet from "filing-cabinet";
import detective from "detective-typescript";
import swc, { Module } from "@swc/core";

export class Parser {
  public filePath: string;
  public ast: Module | null;
  private static projectRoot: string;
  private static tsConfigPath: string;

  public constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
    this.ast = null;
  }

  public static init(projectRoot: string) {
    Parser.projectRoot = path.resolve(projectRoot);
    Parser.tsConfigPath = path.resolve(path.join(projectRoot, "tsconfig.json"));
  }

  public async parse(fileContent: string): Promise<Parser> {
    // We mostly care about the AST so return early if it already exists
    if (this.ast) {
      return this;
    }

    try {
      const parsed = await swc.parse(fileContent, {
        syntax: "typescript",
        tsx: true,
        target: "es2024"
      });
      this.ast = parsed

      return this;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Could not parse file: ${this.filePath}\n${error.message}`)
      }
    }
  }

  public async getDirectDependencies(ast = this.ast): Promise<string[]> {
    const deps = detective(ast, {
      jsx: true,
      skipAsyncImports: true
    })

    return deps.map((dep: string) => (
      cabinet({
        partial: dep,
        filename: this.filePath,
        directory: Parser.projectRoot,
        tsConfig: Parser.tsConfigPath,
        nodeModulesConfig: {
          entry: "any"
        }
      })
    ))
  }
}
