import cabinet from "filing-cabinet";
import detective from "detective-typescript";
import { Parser } from "./parser"
import j from "jscodeshift";

type ParserOperation<R> = (parser: Parser) => R

// Wrapper to help keep my types consistent
const createParserOperation = <R>(
  fn: ParserOperation<R>
) => {
  return fn as ParserOperation<R>;
}

export const getImports = createParserOperation<Promise<string[]>>(async function (parser: Parser) {
  const deps = detective(parser.ast, {
    jsx: true,
    skipAsyncImports: true
  })

  return deps.map((dep: string) => (
    cabinet({
      partial: dep,
      filename: parser.sourceFile.filePath,
      directory: parser.projectRoot,
      tsConfig: parser.tsConfigPath,
      nodeModulesConfig: {
        entry: "any"
      }
    })
  )).filter((d: string) => !!d);
  // ^ prevent weird edge case where some deps are empty strings. Will deal with it properly in the future maybe
});

export const getExports = createParserOperation<any>(
  async function (parser: Parser) {
    return parser;
  }
)

export const hasUseClientDirective = createParserOperation<Promise<boolean>>(
  async function (parser: Parser) {
    return Boolean(
      parser.collection
        .find(j.DirectiveLiteral)
        .filter((path) => path.node.value === "use client").length
    )
  }
)
