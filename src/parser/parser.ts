import * as fs from "node:fs";
import * as path from "node:path";
import cabinet from "filing-cabinet";
import detective from "detective-typescript";
import j, { Collection } from "jscodeshift";
import swc, { Module } from "@swc/core";
import { SourceFile } from "@/file-objects/source-file";
import { Project } from "@/project/project";
import { printMessage, printWarning } from "@/lib/output";
import { chooseParser } from "@/lib/parser-utils";

export class Parser {
  public ast: Module | null;
  public collection: Collection<any>;
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

  // Need to have a separate process to create a Collection for 
  // jscodeshift to operate on. Integrating swc output here has
  // turned out to be tricky but is probably the best option long term
  private slowParse(src: string, fileName: string) {
    return j(src, {
      parser: chooseParser(fileName)
    })
  }

  public async parse(): Promise<Parser> {
    // We mostly care about the AST so return early if it already exists
    if (this.ast !== null) {
      return this;
    }

    try {
      // Skip if the file doesn't exist, this can happen when referencing
      // modules in dist/, and the actual way to handle this is too complicated
      // to be worth the effort at the moment. For now warn the user they might need
      // to run a local build and skip it. Unlikely to find 
      // useful results in these files anyway
      if (!fs.existsSync(this.file.filePath)) {
        printWarning(`File not found: ${this.file.filePath}`)
        printWarning('This might mean you need to build your project')
        printWarning('Skipping...')
        return this;
      }
      const src = await this.file.read()
      const parsed = await swc.parse(src, {
        syntax: "typescript",
        tsx: true,
        target: "es2024"
      });
      this.ast = parsed;

      // This probably hurts performance but will codemods easier
      this.collection = this.slowParse(src, this.file.fileName);

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
    )).filter((d: string) => !!d); // prevent weird edge case where some deps are empty strings. Will deal with it properly in the future maybe
  }

  public async getExports(): Promise<any> {
    if (!this.ast) {
      await this.parse()
    }

  }

  public async hasUseClientDirective(): Promise<boolean> {
    if (!this.collection) {
      await this.parse()
    }

    return Boolean(
      this.collection
        .find(j.DirectiveLiteral)
        .filter((path) => path.node.value === "use client").length
    )
  }
}
