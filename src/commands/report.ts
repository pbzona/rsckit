import path from "node:path";
import { readSnapshot } from "@/analysis";
import { formatBytes } from "@/lib/bytes";
import type { Command } from "commander";

export async function report(
  options: {
    root?: string;
    input?: string;
    json?: boolean;
    route?: string;
  } = {},
) {
  const input = options.input
    ? path.resolve(options.input)
    : path.resolve(options.root ?? process.cwd(), ".rsckit/snapshot.json");
  const snapshot = await readSnapshot(input);
  if (options.json) {
    console.log(JSON.stringify(snapshot, null, 2));
    return snapshot;
  }
  console.log(
    `Source analysis from ${snapshot.generatedAt}\nRoot: ${snapshot.root}\nSource bytes exclude packages and assets. RSC payload bytes: not measured.\n`,
  );
  const routes = snapshot.routes.filter(
    (route) =>
      !options.route ||
      route.id === options.route ||
      route.pathname === options.route,
  );
  if (options.route && !routes.length)
    throw new Error(`Route not found: ${options.route}`);
  for (const route of routes) {
    console.log(
      `${route.pathname} (${route.page})\n  ${route.boundaries.length} boundaries; ${formatBytes(route.clientSourceBytes)} unique client source`,
    );
    for (const boundary of route.boundaries) {
      console.log(
        `  ${boundary.parent ?? "[route entry]"} -> ${boundary.child}\n    ${formatBytes(boundary.sourceBytes)} source across ${boundary.clientModules.length} local modules\n    Why: ${boundary.importChain.join(" -> ")}`,
      );
    }
  }
  for (const item of snapshot.diagnostics)
    console.log(
      `${item.level}: ${item.code}${item.file ? ` (${item.file})` : ""}: ${item.message}`,
    );
  return snapshot;
}

export function registerReportCommand(program: Command) {
  program
    .command("report")
    .description("Read a saved source snapshot (run analyze to refresh)")
    .option("-r, --root <path>", "Project root", process.cwd())
    .option("--input <path>", "Snapshot file")
    .option("--route <path>", "Filter by pathname or page source path")
    .option("--json", "Print only the JSON snapshot")
    .action(async (options) => {
      await report(options);
    });
}
