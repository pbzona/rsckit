import type { RouteEntry } from "./routes";
import type { Boundary, Diagnostic, ModuleInfo, Route } from "./types";

export function analyzeRoute(
  entry: RouteEntry,
  modules: Map<string, ModuleInfo>,
  diagnostics: Diagnostic[],
): Route {
  const environments = new Map<string, Set<"server" | "client">>();
  const visited = new Set<string>();
  const boundaries = new Map<string, Boundary>();
  function visit(file: string, context: "server" | "client", chain: string[]) {
    const module = modules.get(file);
    if (!module) return;
    if (context === "client" && module.useServer) {
      diagnostics.push({
        level: "warning",
        code: "server-reference",
        file,
        message:
          "Client import of a use-server module is treated as a server reference; callable exports are not validated.",
      });
      return;
    }
    const environment =
      context === "client" || module.useClient ? "client" : "server";
    if (context === "server" && module.useClient) {
      const parent = chain.at(-1) ?? null;
      const id = `${parent ?? "[entry]"}->${file}`;
      if (!boundaries.has(id))
        boundaries.set(id, {
          id,
          parent,
          child: file,
          importChain: [...chain, file],
          clientModules: [],
          sourceBytes: 0,
        });
    }
    const key = `${environment}:${file}`;
    if (visited.has(key)) return;
    visited.add(key);
    if (!environments.has(file)) environments.set(file, new Set());
    environments.get(file)?.add(environment);
    for (const edge of module.imports)
      if (edge.status === "local" && edge.target)
        visit(edge.target, environment, [...chain, file]);
  }
  for (const file of entry.entries) visit(file, "server", []);
  for (const boundary of boundaries.values()) {
    const reached = new Set<string>();
    function collect(file: string) {
      const module = modules.get(file);
      if (!module || module.useServer || reached.has(file)) return;
      reached.add(file);
      for (const edge of module.imports)
        if (edge.status === "local" && edge.target) collect(edge.target);
    }
    collect(boundary.child);
    boundary.clientModules = [...reached].sort();
    boundary.sourceBytes = [...reached].reduce(
      (sum, file) => sum + (modules.get(file)?.sourceBytes ?? 0),
      0,
    );
  }
  return {
    id: entry.page,
    page: entry.page,
    pathname: entry.pathname,
    entries: entry.entries,
    boundaries: [...boundaries.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
    modules: [...environments]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, envs]) => ({ path: file, environments: [...envs].sort() })),
    clientSourceBytes: [...environments]
      .filter(([, envs]) => envs.has("client"))
      .reduce((sum, [file]) => sum + (modules.get(file)?.sourceBytes ?? 0), 0),
  };
}
