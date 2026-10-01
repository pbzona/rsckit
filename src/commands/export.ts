import path from "node:path";
import type { AnalysisOptions } from "../analysis";
import type { Command } from "commander";
import { projectOptions } from "./analyze";
import { assertNewOutputDirectory } from "./export-output";

interface ExportFlags extends AnalysisOptions {
  output: string;
}

export function registerExportCommand(program: Command) {
  projectOptions(
    program
      .command("export")
      .description("Export a static inspector with analyzed source files"),
  )
    .option("--output <path>", "Static report directory", "rsckit-report")
    .action(async (options: ExportFlags) => {
      const outDir = path.resolve(options.output);
      await assertNewOutputDirectory(outDir);
      const [{ createInspector }, { createBuild }] = await Promise.all([
        import("../devframe"),
        import("devframe/adapters/build"),
      ]);
      const inspector = createInspector({ ...options, watch: false });
      try {
        await createBuild(inspector.definition, { outDir });
        console.log(
          `Static inspector: ${outDir}\nIncludes analyzed source files and project paths. Serve this directory over HTTP to view it.`,
        );
      } finally {
        await inspector.close();
      }
    });
}
