import detective from "detective-typescript";
import cabinet from "filing-cabinet";
import j from "jscodeshift";
import { filterEmptyPaths, filterNonEcmaPaths } from "./filters";
import { Parser } from "./parser";

type ParserOperation<R> = (parser: Parser) => R;

// Wrapper to help keep my types consistent
const createParserOperation = <R>(fn: ParserOperation<R>) => {
  return fn as ParserOperation<R>;
};

export const getImports = createParserOperation<Promise<string[]>>(
  async (parser: Parser) => {
    const imports = detective(parser.ast, {
      jsx: true,
      skipAsyncImports: true,
    });

    const deps = imports.map((dep: string) =>
      cabinet({
        partial: dep,
        filename: parser.sourceFile.filePath,
        directory: parser.projectRoot,
        tsConfig: parser.tsConfigPath,
        nodeModulesConfig: {
          entry: "any",
        },
      }),
    );

    return filterEmptyPaths(filterNonEcmaPaths(deps));
  },
);

// todo: implement this
export const getExports = createParserOperation<any>(
  async (parser: Parser) => parser,
);

export const hasUseClientDirective = createParserOperation<Promise<boolean>>(
  async (parser: Parser) =>
    Boolean(
      parser.collection
        .find(j.DirectiveLiteral)
        .filter((path) => path.node.value === "use client").length,
    ),
);
