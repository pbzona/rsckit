import cabinet from "filing-cabinet";
import detective from "detective-typescript";
import { Parser } from "./parser";
import j from "jscodeshift";
import { filterEmptyPaths, filterNonEcmaPaths } from "./filters.ts";

type ParserOperation<R> = (parser: Parser) => R;

// Wrapper to help keep my types consistent
const createParserOperation = <R>(fn: ParserOperation<R>) => {
  return fn as ParserOperation<R>;
};

export const getImports = createParserOperation<Promise<string[]>>(
  async function (parser: Parser) {
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
export const getExports = createParserOperation<any>(async function (
  parser: Parser,
) {
  return parser;
});

export const hasUseClientDirective = createParserOperation<Promise<boolean>>(
  async function (parser: Parser) {
    return Boolean(
      parser.collection
        .find(j.DirectiveLiteral)
        .filter((path) => path.node.value === "use client").length,
    );
  },
);
