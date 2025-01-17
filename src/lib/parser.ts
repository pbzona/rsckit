import { Dirent } from 'node:fs';
import path from 'node:path';
import Walk from "@root/walk";
import jscodeshift, { API, Collection, JSCodeshift, VariableDeclarator } from "jscodeshift";
import babylonParse from 'jscodeshift/parser/babylon.js';
import tsParse from 'jscodeshift/parser/ts.js';
import tsxParse from 'jscodeshift/parser/tsx.js';
import { ExportDetails, ParserFunction } from './types';

// Create a jscodeshift API object
export const api: API = {
  j: jscodeshift,
  jscodeshift,
  stats: () => { },
  report: () => { } // might be useful later
};

/**
 * Creates a helper function that wraps the provided function.
 *
 * @template T - The type of the input parameter, defaults to Collection<any>.
 * @template R - The type of the return value, defaults to any.
 * @param fn - The function to be wrapped, which takes a JSCodeshift instance and an input of type T,
 * and returns a result of type R.
 * @returns A new helper function that wraps the provided function.
 */
export function createParserFunction<T = Collection<any>, R = any>(
  fn: (j: JSCodeshift, input: T) => R,
): ParserFunction<T, R> {
  return (j: JSCodeshift, input: T) => fn(j, input);
}

// Uglier but works
const isDeclarationFile = (filePath: string) => (
  path.parse(filePath).name.endsWith('.d') && path.parse(filePath).ext === '.ts'
);
const isTsFile = (filePath: string) => path.parse(filePath).ext === '.ts';
const isTsxFile = (filePath: string) => path.parse(filePath).ext === '.tsx';
const isJsFile = (filePath: string) => path.parse(filePath).ext === '.js';
const isJsxFile = (filePath: string) => path.parse(filePath).ext === '.jsx';

/**
 * Chooses the appropriate parser based on the file path.
 *
 * @param filePath - The path of the file to be parsed.
 * @returns The parser function to be used for the given file.
 *
 * The function first checks if the file is a declaration file and returns the Babylon parser if true.
 * If the file is not a declaration file, it determines the parser based on the file extension:
 * - For TypeScript files (.ts, .mts, .cts), it returns the TypeScript parser.
 * - For JavaScript and JSX files (.js, .jsx, .tsx), it returns the TSX parser.
 *
 * @remarks
 * JSX is allowed in .js files, so they are fed into the TSX parser.
 *
 * @see https://github.com/vercel/next.js/pull/71122
 */
export function chooseParser(filePath: string) {
  if (isDeclarationFile(filePath)) {
    return babylonParse();
  }

  // Thank you Jiachi 🙏 - https://github.com/vercel/next.js/pull/71122
  // jsx is allowed in .js files, feed them into the tsx parser.
  // tsx parser .js, .jsx, .tsx
  // ts parser: .ts, .mts, .cts
  return isTsFile(filePath) ? tsParse() : tsxParse();
}

/**
 * Determines if the given file path might contain a React component.
 *
 * This function checks if the file path has a TypeScript JSX (.tsx),
 * JavaScript JSX (.jsx), or JavaScript (.js) extension.
 *
 * @param filePath - The path of the file to check.
 * @returns `true` if the file path has a .tsx, .jsx, or .js extension, otherwise `false`.
 */
export function mightContainReactComponent(filePath: string) {
  return isTsxFile(filePath) ||
    isJsxFile(filePath) ||
    isJsFile(filePath);
}

/**
 * Checks if the source code contains the "use client" directive.
 *
 * @param j - The jscodeshift API.
 * @param source - The source code collection to be parsed.
 * @returns A boolean indicating whether the "use client" directive is present.
 */
export const hasUseClient = createParserFunction<Collection<any>, boolean>((j, source) => {
  return Boolean(
    source
      .find(j.DirectiveLiteral)
      .filter((path) => path.node.value === "use client").length,
  );
});

/**
 * Parses the provided AST and finds all export declarations.
 *
 * This function identifies both named and default exports within the given AST.
 * It returns an array of `ExportDetails` objects, each containing information
 * about the type of export, the name of the exported entity, and the path to the
 * export declaration in the AST.
 *
 * @param j - The jscodeshift API.
 * @param root - The root collection of the AST.
 * @returns An array of `ExportDetails` objects representing all found exports.
 */
export const findAllExports = createParserFunction<Collection<any>, ExportDetails[]>((j, root) => {
  const exported: ExportDetails[] = [];

  // Extract named exports
  root.find(j.ExportNamedDeclaration).forEach((path) => {
    if (path.node.declaration) {
      if (j.VariableDeclaration.check(path.node.declaration)) {
        path.node.declaration.declarations.forEach(
          (declaration: VariableDeclarator) => {
            if (j.Identifier.check(declaration.id)) {
              exported.push({
                type: "named",
                name: declaration.id.name,
                path,
              });
            }
          },
        );
      } else if (
        j.FunctionDeclaration.check(path.node.declaration) ||
        j.ClassDeclaration.check(path.node.declaration)
      ) {
        if (path.node.declaration.id) {
          exported.push({
            type: "named",
            name: path.node.declaration.id.name,
            path,
          });
        }
      }
    } else if (path.node.specifiers) {
      path.node.specifiers.forEach((specifier) => {
        if (j.ExportSpecifier.check(specifier)) {
          exported.push({
            type: "named",
            name: specifier.exported.name,
            path,
          });
        }
      });
    }
  });

  // Extract default export
  root.find(j.ExportDefaultDeclaration).forEach((path) => {
    if (j.Identifier.check(path.node.declaration)) {
      exported.push({
        type: "default",
        name: path.node.declaration.name,
        path,
      });
    } else if (
      j.FunctionDeclaration.check(path.node.declaration) ||
      j.ClassDeclaration.check(path.node.declaration)
    ) {
      if (path.node.declaration.id) {
        exported.push({
          type: "default",
          name: path.node.declaration.id.name,
          path,
        });
      } else {
        exported.push({
          type: "default",
          name: "AnonymousDefaultExport",
          path,
        });
      }
    } else {
      exported.push({
        type: "default",
        name: "AnonymousDefaultExport",
        path,
      });
    }
  });

  return exported;
});


/**
 * Creates a file finder function that searches for files in a directory tree
 * based on matching and ignoring criteria.
 *
 * @param matchFn - A function that determines if a file should be included in the results.
 *                  It takes the pathname and directory entry as arguments and returns a boolean.
 * @param ignoreFn - A function that determines if a file should be ignored.
 *                   It takes the pathname and directory entry as arguments and returns a boolean.
 * @returns A function that takes a root directory path as an argument and returns a promise
 *          that resolves to an array of file paths that match the criteria.
 */
export function createFileFinder(
  matchFn: (pathname: string, dirent: Dirent) => boolean,
  ignoreFn: (pathname: string, dirent: Dirent) => boolean,
) {
  return async (root: string) => {
    const files: string[] = [];

    await Walk.walk(
      root,
      async (err: Error, pathname: string, dirent: Dirent) => {
        // Todo: actually handle errors here
        if (err) {
          console.warn("Something bad happened!");
          console.error(err);
          return;
        }

        // Return false to ignore
        if (ignoreFn(pathname, dirent)) {
          return false;
        }

        // If match add to list of files to return
        if (matchFn(pathname, dirent)) {
          files.push(pathname);
        }
      },
    );
    return files;
  };
};

// Find page.{js,jsx,tsx} files in a Next.js project
export const findPages = createFileFinder(
  (pathname: string, dirent: Dirent) => {
    const { name } = path.parse(pathname);
    return (
      // This *should* handle everything
      dirent.isFile() && name === 'page' && mightContainReactComponent(pathname)
    );
  },
  (pathname: string, dirent: Dirent) => {
    return dirent.isDirectory() && (
      // Ignore hidden dirs and underscore prefixes (which Next already ignores for routing)
      dirent.name.startsWith('_') || dirent.name.startsWith('.')
    );
  }
);

