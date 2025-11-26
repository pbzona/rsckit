import * as path from "node:path";
import { Config } from "@/config";
import { formatBytes } from "@/lib/bytes";
import {
  printHeading,
  printHeadingAlt,
  printMessage,
  setQuiet,
} from "@/lib/output";
import { pageDisplayName } from "@/lib/utils";
import { AnalysisOutput } from "@/project/analysis-types";
import { calculateTreeSize } from "@/project/metrics";
import { Project } from "@/project/project";
import { addSizeTransform, applyTransforms } from "@/project/transforms";
import chalk from "chalk";
import { Command } from "commander";
import task from "tasuku";

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

async function printDependencyTree(
  project: Project,
  filePath: string,
  depth = 1,
  maxDepth = 3,
  maxSiblings = Infinity,
  visited = new Set<string>(),
) {
  if (depth > maxDepth) return;

  if (visited.has(filePath)) return;
  visited.add(filePath);

  try {
    const file = await project.getSourceFile(filePath);
    if (!file) return;

    const siblingFiles = await Promise.all(
      file.dependencies.map(async (dep) => {
        try {
          return { path: dep, file: await project.getSourceFile(dep) };
        } catch {
          return { path: dep, file: undefined };
        }
      }),
    );

    // Sort by size descending
    siblingFiles.sort((a, b) => {
      const sizeA = a.file?.size || 0;
      const sizeB = b.file?.size || 0;
      if (sizeA !== sizeB) {
        return sizeB - sizeA;
      }
      // Secondary sort by path for stability
      return a.path.localeCompare(b.path);
    });

    let leafCount = 0;
    let skippedLeaves = 0;

    for (const { path: dep, file: depFile } of siblingFiles) {
      const isNodeModule = dep.includes("node_modules");

      // Determine if it's a branch (has children and we are not at max depth)
      // Note: node_modules are effectively leaves in this visualization
      let isBranch = false;
      if (
        !isNodeModule &&
        depth < maxDepth &&
        !visited.has(dep) &&
        depFile &&
        depFile.dependencies.length > 0
      ) {
        isBranch = true;
      }

      // If it is a branch, we always show it.
      // If it is a leaf, we check the limit.
      if (!isBranch) {
        if (maxSiblings !== Infinity && leafCount >= maxSiblings) {
          skippedLeaves++;
          continue;
        }
        leafCount++;
      }

      const prefix = "  ".repeat(depth);
      const relativeName = dep.split("/").slice(-2).join("/");

      let isClient = false;
      let size = 0;

      if (depFile) {
        isClient = depFile.useClient;
        size = depFile.size;
      }

      const sizeLabel =
        size > 0
          ? isClient
            ? chalk.bold.cyan(` (${formatBytes(size)})`)
            : chalk.gray(` (${formatBytes(size)})`)
          : "";

      const label = isNodeModule
        ? chalk.gray(relativeName)
        : isClient
          ? chalk.cyan(relativeName) + sizeLabel
          : chalk.yellow(relativeName) + sizeLabel;

      console.log(`${prefix}└─ ${label}`);

      if (!isNodeModule) {
        await printDependencyTree(
          project,
          dep,
          depth + 1,
          maxDepth,
          maxSiblings,
          visited,
        );
      }
    }

    if (skippedLeaves > 0) {
      const prefix = "  ".repeat(depth);
      console.log(`${prefix}└─ ${chalk.gray(`... ${skippedLeaves} more`)}`);
    }
  } catch (e) {
    // Ignore missing files
  }
}

export const report = async (options: Options) => {
  const here = process.cwd();

  // Quiet mode for report command to avoid "Creating source file..." logs
  // unless we are in json mode where we shouldn't print anything anyway
  // BUT wait, if we are in JSON mode we definitely don't want "Creating source file" logs
  // If we are in normal mode, we want tasuku to handle the "status", so we should suppress low level logs too.
  setQuiet(true);

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

    // If outputting JSON, we don't want tasuku logs either
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

      // Reset quiet so we can print the JSON
      setQuiet(false);
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

    // Now we are done with "loading" tasks, we can print the report.
    // We need to enable output again for the report content.
    setQuiet(false);

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
      if (!boundariesByPage.has(boundary.serverComponent)) {
        boundariesByPage.set(boundary.serverComponent, []);
      }
      boundariesByPage.get(boundary.serverComponent)?.push(boundary);
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
          options.verbose ? Infinity : 4,
        );
      }

      const boundaries = boundariesByPage.get(page.filePath);

      if (boundaries && boundaries.length > 0) {
        console.log(`  ${chalk.yellow("Client Boundaries:")}`);
        for (const boundary of boundaries) {
          const clientName = boundary.clientComponent
            .split("/")
            .slice(-2)
            .join("/");

          let size = 0;
          let treeSize = 0;
          try {
            const file = await project.getSourceFile(boundary.clientComponent);
            size = file?.size || 0;
            treeSize = await calculateTreeSize(
              project,
              boundary.clientComponent,
            );
          } catch {}
          const sizeLabel = chalk.gray(
            ` (Size: ${formatBytes(size)}, Total: ${formatBytes(treeSize)})`,
          );

          console.log(`    └─ ${chalk.cyan.bold(clientName)}${sizeLabel}`);

          // Print tree for the client component
          // We start at depth 2 to align with the boundary list
          await printDependencyTree(
            project,
            boundary.clientComponent,
            3,
            (options.maxDepth ? Number.parseInt(options.maxDepth) : 3) + 2, // Adjust relative depth
            options.verbose ? Infinity : 4,
          );
        }
      } else {
        console.log(`  ${chalk.gray("(No client boundaries found)")}`);
      }
    }
  } catch (e) {
    // Tasuku handles errors in tasks, but if we threw outside:
    if (e instanceof Error) {
      console.error(chalk.red(e.message));
    } else {
      console.error(e);
    }
  } finally {
    process.chdir(here);
  }
};
