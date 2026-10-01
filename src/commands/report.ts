import * as path from "node:path";
import { Config } from "@/config";
import { formatBytes } from "@/lib/bytes";
import { printError, printHeading } from "@/lib/output";
import { pageDisplayName } from "@/lib/utils";
import { AnalysisOutput } from "@/project/analysis-types";
import { calculateTreeSize } from "@/project/metrics";
import { Project } from "@/project/project";
import { addSizeTransform, applyTransforms } from "@/project/transforms";
import chalk from "chalk";
import { Command } from "commander";
import task from "tasuku";
import { printDependencyTree } from "@/project/dependency-tree";

interface Options {
  projectDir?: string;
  json?: boolean;
  verbose?: boolean;
  maxDepth?: string;
}

export const registerReportCommand = (program: Command) => {
  program
    .command("report")
    .description("Generate a report from the cached analysis results")
    .option("-p, --projectDir <string>", "the root of your Next.js project")
    .option("--json", "output analysis result as JSON")
    .option("--verbose", "include full dependency tree")
    .option("--maxDepth <number>", "max depth for dependency tree", "3")
    .action((options) => report(options));
};

export const report = async (options: Options) => {
  const here = process.cwd();

  // Resolve options
  const _projectDir = options.projectDir
    ? path.resolve(here, options.projectDir)
    : Config.projectDirectory;

  process.chdir(_projectDir);

  try {
    const project = new Project({
      root: _projectDir,
      tsConfig: {
        path: path.join(_projectDir, "tsconfig.json"),
        options: {
          compilerOptions: {}, // TODO: Load actual tsconfig
        },
      },
      parser: {
        options: {
          projectRoot: _projectDir,
          tsConfigPath: path.join(_projectDir, "tsconfig.json"),
        },
      },
    });

    // If outputting JSON, we don't want tasuku logs
    if (options.json) {
      await project.restoreCache();
      const result = project.getAnalysisFromCache();

      if (result.pages.length === 0) return; // Or error?

      const baseOutput: AnalysisOutput = {
        pages: result.pages.map((p) => ({
          filePath: p.filePath,
          useClient: p.useClient,
          dependencies: p.dependencies,
        })),
        routes: result.routes,
        clientBoundaries: result.clientBoundaries as any,
      };

      const finalOutput = await applyTransforms(baseOutput, project, [
        addSizeTransform,
      ]);

      console.log(JSON.stringify(finalOutput, null, 2));
      return;
    }

    printHeading(`Reporting on ${_projectDir.split("/").slice(-1)[0]}`);

    // Use tasuku for phases
    let analysisResult: any = null;

    await task("Loading analysis from cache", async () => {
      await project.restoreCache();
      analysisResult = project.getAnalysisFromCache();

      if (analysisResult.pages.length === 0) {
        throw new Error("No pages found in cache. Run 'analyze' first.");
      }
    });

    await task("Calculating metrics", async () => {
      // We run the transforms here just to ensure data is ready for display,
      // though currently printDependencyTree calculates size on the fly.
      // We might want to unify this later. For now, this phase is fast enough.
      // Actually, let's just run the transforms for the sake of "work being done"
      // and maybe future proofing.
      const baseOutput: AnalysisOutput = {
        pages: analysisResult.pages.map((p: any) => ({
          filePath: p.filePath,
          useClient: p.useClient,
          dependencies: p.dependencies,
        })),
        routes: analysisResult.routes,
        clientBoundaries: analysisResult.clientBoundaries as any,
      };
      await applyTransforms(baseOutput, project, [addSizeTransform]);
    });

    const result = analysisResult;

    // Output summary
    console.log("\n=== Analysis Summary ===");
    console.log(`Pages found: ${result.pages.length}`);
    console.log(`Routes: ${result.routes.join(", ")}`);
    console.log(
      `Server/client boundaries: ${result.clientBoundaries.length}\n`,
    );

    console.log(`${chalk.cyan("■")} Client Component`);
    console.log(`${chalk.yellow("■")} Server Component`);
    console.log(`${chalk.gray("■")} Node Module`);

    // Group boundaries by server component (Page)
    const boundariesByPage = new Map<string, typeof result.clientBoundaries>();
    for (const boundary of result.clientBoundaries) {
      if (!boundariesByPage.has(boundary.parent)) {
        boundariesByPage.set(boundary.parent, []);
      }
      boundariesByPage.get(boundary.parent)?.push(boundary);
    }

    for (const page of result.pages) {
      const pageName = pageDisplayName(page.filePath);
      console.log(`\n${chalk.bold(pageName)}`);

      if (options.verbose) {
        console.log(`  ${chalk.gray("Page Dependency Tree:")}`);
        await printDependencyTree(
          project,
          page.filePath,
          2,
          options.maxDepth ? Number.parseInt(options.maxDepth) : 3,
          options.verbose ? Number.POSITIVE_INFINITY : 4,
        );
      }

      const boundaries = boundariesByPage.get(page.filePath);

      if (boundaries && boundaries.length > 0) {
        console.log(`  ${chalk.yellow("Client Boundaries:")}`);
        for (const boundary of boundaries) {
          const clientName = boundary.child.split("/").slice(-2).join("/");

          let size = 0;
          let treeSize = 0;
          try {
            const file = await project.getSourceFile(boundary.child);
            size = file?.size || 0;
            treeSize = await calculateTreeSize(project, boundary.child);
          } catch {}
          const sizeLabel = chalk.gray(
            ` (Size: ${formatBytes(size)}, Total: ${formatBytes(treeSize)})`,
          );

          console.log(`    └─ ${chalk.cyan.bold(clientName)}${sizeLabel}`);

          // Print tree for the client component
          // We start at depth 2 to align with the boundary list
          await printDependencyTree(
            project,
            boundary.child,
            3,
            (options.maxDepth ? Number.parseInt(options.maxDepth) : 3) + 2, // Adjust relative depth
            options.verbose ? Number.POSITIVE_INFINITY : 4,
          );
        }
      } else {
        console.log(`  ${chalk.gray("(No client boundaries found)")}`);
      }
    }
  } catch (e) {
    // Tasuku handles errors in tasks, but if we threw outside:
    if (e instanceof Error) {
      printError(e.message);
    } else {
      printError(e);
    }
  } finally {
    process.chdir(here);
  }
};
