import path from "node:path";
import { analyzeProject, saveSnapshot } from "@/analysis";
import type { AnalysisOptions } from "@/analysis";
import type { Command } from "commander";

export interface AnalyzeFlags extends AnalysisOptions {
  json?: boolean;
  output?: string;
}

export function projectOptions(command: Command) {
  return command
    .option("-r, --root <path>", "Project root", process.cwd())
    .option("--app-directory <path>", "App Router directory, relative to root")
    .option("--tsconfig <path>", "TypeScript config, relative to root");
}

export async function analyze(options: AnalyzeFlags = {}) {
  const snapshot = await analyzeProject(options);
  const output = await saveSnapshot(
    snapshot,
    options.output ? path.resolve(options.output) : undefined,
  );
  if (options.json) console.log(JSON.stringify(snapshot, null, 2));
  else
    console.log(
      `Analyzed ${snapshot.routes.length} routes and ${snapshot.modules.length} local modules.\nSnapshot: ${output}\nRun 'rsckit report --root ${JSON.stringify(snapshot.root)}' to inspect it.`,
    );
  if (snapshot.diagnostics.some((item) => item.level === "error"))
    process.exitCode = 1;
  return snapshot;
}

export function registerAnalyzeCommand(program: Command) {
  projectOptions(
    program
      .command("analyze")
      .description("Analyze App Router source and save a snapshot"),
  )
    .option("--json", "Print only the JSON snapshot")
    .option(
      "--output <path>",
      "Snapshot file (default: <root>/.rsckit/snapshot.json)",
    )
    .action(async (options: AnalyzeFlags) => {
      await analyze(options);
    });
}
