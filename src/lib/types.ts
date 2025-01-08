import type {
  API,
  ASTPath,
  Collection,
  ExportDefaultDeclaration,
  ExportNamedDeclaration, FileInfo, JSCodeshift, Options,
  VariableDeclarator,
} from "jscodeshift";

/*
  NOTE: I'm using jscodeshift for parsing because it uses babel/parser
  internally - it's much slower than SWC, but has useful helpers
  e.g. DirectiveLiteral AST node makes it easier to find client entrypoints
  Want to make codemods eventually, so it's also easier to start with this
*/


/**
 * Represents a command that parses a file and returns a result of type `T`.
 *
 * @template T - The type of the result returned by the command.
 * @param file - The file information to be parsed.
 * @param api - The API object providing necessary methods and properties for parsing.
 * @param options - The options to customize the parsing process.
 * @returns The result of type `T` after parsing the file.
 */
export type ParsingCommand<T> = (
  file: FileInfo,
  api: API,
  options: Options
) => T;

/**
 * A type alias for a helper function that takes a JSCodeshift instance and an input of type T,
 * and returns a result of type R.
 *
 * @template T - The type of the input parameter.
 * @template R - The type of the return value.
 * @param j - The JSCodeshift instance.
 * @param input - The input parameter of type T.
 * @returns The result of type R.
 */
export type ParserFunction<T, R> = (j: JSCodeshift, input: T) => R;


/**
 * Interface representing the details of an export in a TypeScript file.
 */
export interface ExportDetails {
  /**
   * The type of export, either named or default.
   */
  type: "named" | "default";

  /**
   * The name of the export.
   */
  name: string;

  /**
   * The AST path to the export declaration.
   */
  path: ASTPath<ExportDefaultDeclaration | ExportNamedDeclaration>;

  /**
   * The file where the export is located (optional).
   */
  file?: string;
}