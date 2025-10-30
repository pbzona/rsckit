import { Parser, ParserOptions } from './parser';
import { SourceFile } from '@/source-file/source-file';
import { printWarning } from '@/lib/output';
import * as fs from 'node:fs';
import swc from '@swc/core';
import j, { Collection } from 'jscodeshift';
import { chooseParser } from '@/lib/parser-utils';

export class ParserService {
  constructor(private config: ParserOptions) {}

  async parse(file: SourceFile): Promise<Parser> {
    const parser = new ParserImpl(file, this.config);
    await parser.init();
    return parser;
  }
}

class ParserImpl implements Parser {
  ast: Parser['ast'] = null;
  collection: Parser['collection'] = null;

  constructor(
    public sourceFile: SourceFile,
    private config: ParserOptions
  ) {}

  get projectRoot(): string {
    return this.config.projectRoot;
  }

  get tsConfigPath(): string {
    return this.config.tsConfigPath;
  }

  async init(): Promise<Parser> {
    const { ast, collection } = await this.parse();
    this.ast = ast;
    this.collection = collection;
    return this;
  }

  private async parse(): Promise<Pick<Parser, "ast" | "collection">> {
    try {
      if (!fs.existsSync(this.sourceFile.filePath)) {
        printWarning(`File not found: ${this.sourceFile.filePath}`);
        printWarning('This might mean you need to build your project');
        printWarning('Skipping...');
        return { ast: null, collection: null };
      }

      const src = await this.sourceFile.read();
      const parsed = await swc.parse(src, {
        syntax: "typescript",
        tsx: true,
        target: "es2022"
      });

      const collection = j(src, {
        parser: chooseParser(this.sourceFile.fileName)
      });

      return {
        ast: parsed,
        collection
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Could not parse file: ${this.sourceFile.filePath}\n${error.message}`);
      }
      throw error;
    }
  }
} 