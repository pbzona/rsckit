import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { relativePath, sourcePattern } from "./routes";
import type { Diagnostic, ImportInfo, ModuleInfo } from "./types";

export function loadCompilerOptions(
  root: string,
  override?: string,
): ts.CompilerOptions {
  const configPath = override
    ? path.resolve(root, override)
    : ts.findConfigFile(root, ts.sys.fileExists);
  const defaults: ts.CompilerOptions = {
    allowJs: true,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    resolveJsonModule: true,
  };
  if (!configPath) return defaults;
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error)
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
  );
  const errors = parsed.errors.filter((error) => error.code !== 18003);
  if (errors.length)
    throw new Error(
      errors
        .map((error) =>
          ts.flattenDiagnosticMessageText(error.messageText, "\n"),
        )
        .join("\n"),
    );
  return { ...defaults, ...parsed.options };
}

export async function parseModule(
  root: string,
  file: string,
  options: ts.CompilerOptions,
  diagnostics: Diagnostic[],
): Promise<ModuleInfo> {
  const source = await readFile(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const module: ModuleInfo = {
    path: relativePath(root, file),
    sourceBytes: Buffer.byteLength(source),
    useClient: false,
    useServer: false,
    imports: [],
  };
  for (const statement of ast.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    )
      break;
    if (statement.expression.text === "use client") module.useClient = true;
    if (statement.expression.text === "use server") module.useServer = true;
  }
  const syntaxErrors = (
    ast as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }
  ).parseDiagnostics;
  for (const error of syntaxErrors)
    diagnostics.push({
      level: "error",
      code: "parse-error",
      file: module.path,
      message: ts.flattenDiagnosticMessageText(error.messageText, "\n"),
    });
  function add(specifier: string, kind: ImportInfo["kind"]) {
    if (
      /\.(?:css|scss|sass|less|json|svg|png|jpe?g|gif|webp|ico|woff2?|ttf)(?:\?.*)?$/.test(
        specifier,
      )
    ) {
      module.imports.push({ specifier, kind, status: "asset" });
      return;
    }
    const resolved = ts.resolveModuleName(
      specifier,
      file,
      options,
      ts.sys,
    ).resolvedModule;
    if (
      resolved &&
      !resolved.isExternalLibraryImport &&
      !/\.d\.[cm]?ts$/.test(resolved.resolvedFileName) &&
      sourcePattern.test(resolved.resolvedFileName)
    ) {
      module.imports.push({
        specifier,
        kind,
        status: "local",
        target: relativePath(root, resolved.resolvedFileName),
      });
    } else if (
      resolved?.isExternalLibraryImport ||
      (!resolved &&
        !specifier.startsWith(".") &&
        !specifier.startsWith("/") &&
        !specifier.startsWith("@/") &&
        !Object.keys(options.paths ?? {}).some((alias) =>
          specifier.startsWith(alias.split("*")[0]),
        ))
    ) {
      module.imports.push({ specifier, kind, status: "external" });
    } else {
      module.imports.push({ specifier, kind, status: "unresolved" });
      diagnostics.push({
        level: "warning",
        code: "unresolved-import",
        file: module.path,
        message: `Cannot resolve runtime source for ${specifier}.`,
      });
    }
  }
  function walk(node: ts.Node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const allTypes =
        bindings &&
        ts.isNamedImports(bindings) &&
        bindings.elements.length > 0 &&
        bindings.elements.every((element) => element.isTypeOnly) &&
        !clause?.name;
      if (!clause?.isTypeOnly && !allTypes)
        add(node.moduleSpecifier.text, "static");
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const allTypes =
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((element) => element.isTypeOnly);
      if (!node.isTypeOnly && !allTypes)
        add(node.moduleSpecifier.text, "reexport");
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      const kind =
        node.expression.kind === ts.SyntaxKind.ImportKeyword
          ? "dynamic"
          : "require";
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument))
        add(argument.text, kind);
      else
        diagnostics.push({
          level: "warning",
          code: "computed-import",
          file: module.path,
          message: "A computed import cannot be resolved statically.",
        });
    }
    ts.forEachChild(node, walk);
  }
  walk(ast);
  return module;
}
