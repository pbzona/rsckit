import * as fs from "node:fs";
import j, { Collection } from "jscodeshift";
import swc, { Module } from "@swc/core";
import { SourceFile } from "@/source-file/source-file";
import { printWarning } from "@/lib/output";
import { chooseParser } from "@/lib/parser-utils";

export type ParserAST = Module;

export interface Parser {
  ast: ParserAST | null;
  collection: Collection<any> | null;
  sourceFile: SourceFile;
  projectRoot: string;
  tsConfigPath: string;
}

// Need to have a separate process to create a Collection for
// jscodeshift to operate on. Integrating swc output here has
// turned out to be tricky but is probably the best option long term
const createCollection = (src: string, fileName: string) => {
  return j(src, {
    parser: chooseParser(fileName),
  });
};

export type ParserOptions = {
  projectRoot: string;
  tsConfigPath: string;
};

export type ParserFactory = (sourceFile: SourceFile) => Promise<Parser>;

export function createParserFactory(options: ParserOptions): ParserFactory {
  class ParserImpl implements Parser {
    ast: ParserAST;
    collection: Collection<any>;

    projectRoot: string = options.projectRoot;
    tsConfigPath: string = options.tsConfigPath;

    constructor(public sourceFile: SourceFile) {}

    async init(): Promise<Parser> {
      const { ast, collection } = await this.parse();
      this.ast = ast;
      this.collection = collection;
      return this;
    }

    async parse(): Promise<Pick<Parser, "ast" | "collection">> {
      try {
        // Skip if the file doesn't exist, this can happen when referencing
        // modules in dist/, and the actual way to handle this is too complicated
        // to be worth the effort at the moment. For now warn the user they might need
        // to run a local build and skip it. Unlikely to find
        // useful results in these files anyway
        if (!fs.existsSync(this.sourceFile.filePath)) {
          printWarning(`File not found: ${this.sourceFile.filePath}`);
          printWarning("This might mean you need to build your project");
          printWarning("Skipping...");
          return this;
        }
        const src = await this.sourceFile.read();
        // Todo - roll this into a custom parser for jsc?
        // woudl need to transform it to be babel-compatible though,
        // which is sync and might end up adding complexity for no real
        // gain in speed
        const parsed = await swc.parse(src, {
          syntax: "typescript",
          tsx: true,
          target: "es2022",
        });
        const ast = parsed;
        // This probably hurts performance but will codemods easier
        const collection = createCollection(src, this.sourceFile.fileName);

        return {
          ast,
          collection,
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(
            `Could not parse file: ${this.sourceFile.filePath}\n${error.message}`,
          );
        }
      }
    }
  }

  return async function (sourceFile: SourceFile): Promise<Parser> {
    const parser = new ParserImpl(sourceFile);
    await parser.init();
    return parser;
  };
}
