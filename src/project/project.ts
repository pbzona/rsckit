import path from "node:path";
import { createSourceFile, SourceFile } from "@/source-file/source-file";
import { createParserFactory } from "@/parser/parser";
import { createFinderFn, inferRoutesFromPagePaths } from "./utils";
import { printHeadingAlt } from "@/lib/output";

export interface Project {
  root: string;
  tsConfigPath: string;
  pages: SourceFile[];
  routes: string[];
}

export async function createProject(root: string, tsConfigPath?: string) {
  // Set  up finder functions - might use this for layouts, etc later
  const findFilesByName = (fileName: string) => createFinderFn(
    root, fileName
  );
  const findPages = findFilesByName("page");

  // Resolve to absolute paths if needed
  const _root = path.resolve(root);
  const _tsConfigPath = tsConfigPath ?
    path.resolve(tsConfigPath) :
    path.resolve(path.join(root, "tsconfig.json"));

  // Using a factory here so I can close over the project settings
  // and pass them to the parser without each file needing to 
  // keep a reference
  const parserFactory = createParserFactory({
    projectRoot: _root,
    tsConfigPath: _tsConfigPath
  })

  printHeadingAlt("Finding app router pages...");
  const pagePaths = await findPages();
  const _pages = await Promise.all(
    pagePaths.map(p => createSourceFile(p, parserFactory))
  )
  printHeadingAlt("Inferring routes...")
  const _routes = inferRoutesFromPagePaths(pagePaths);

  return {
    root: _root,
    tsConfigPath: _tsConfigPath,
    pages: _pages,
    routes: _routes
  };
}
