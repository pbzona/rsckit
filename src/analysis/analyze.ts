import { realpath } from "node:fs/promises";
import path from "node:path";
import { analyzeRoute } from "./graph";
import { loadCompilerOptions, parseModule } from "./parser";
import { discoverRoutes, findAppDirectory, relativePath } from "./routes";
import type {
  AnalysisOptions,
  Diagnostic,
  ModuleInfo,
  Snapshot,
} from "./types";

export async function analyzeProject(
  options: AnalysisOptions = {},
): Promise<Snapshot> {
  const root = await realpath(path.resolve(options.root ?? process.cwd()));
  const app = await findAppDirectory(root, options.appDirectory);
  const diagnostics: Diagnostic[] = [];
  const compilerOptions = loadCompilerOptions(root, options.tsconfig);
  const entries = await discoverRoutes(root, app, diagnostics);
  const modules = new Map<string, ModuleInfo>();
  const pending = [...new Set(entries.flatMap((entry) => entry.entries))];
  const attempted = new Set<string>();
  while (pending.length) {
    const file = pending.pop();
    if (!file) continue;
    if (attempted.has(file)) continue;
    attempted.add(file);
    try {
      const module = await parseModule(
        root,
        path.resolve(root, file),
        compilerOptions,
        diagnostics,
      );
      modules.set(file, module);
      for (const edge of module.imports)
        if (edge.target) pending.push(edge.target);
    } catch (error) {
      diagnostics.push({
        level: "error",
        code: "read-error",
        file,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const routes = entries.map((entry) =>
    analyzeRoute(entry, modules, diagnostics),
  );
  const uniqueDiagnostics = [
    ...new Map(
      diagnostics.map((item) => [JSON.stringify(item), item]),
    ).values(),
  ];
  return {
    schemaVersion: 1,
    root,
    appDirectory: relativePath(root, app),
    generatedAt: new Date().toISOString(),
    routes,
    modules: [...modules.values()].sort((a, b) => a.path.localeCompare(b.path)),
    diagnostics: uniqueDiagnostics,
    measurements: {
      sourceBytes: "UTF-8 source bytes; excludes packages and assets",
      payloadBytes: null,
    },
  };
}
