import * as path from "node:path";
import { Config } from "@/config";
import { printHeading } from "@/lib/output";
import { pageDisplayName } from "@/lib/utils";
import { Project } from "@/project/project";
import chalk from "chalk";
import { Command } from "commander";

interface Options {
  projectDir?: string;
  skipCache?: boolean;
  json?: boolean;
}

export const registerAnalyzeCommand = (program: Command) => {
  program
    .command("analyze")
    .description("Crawl your project to prepare it for querying and reporting")
    .option("-p, --projectDir <string>", "the root of your Next.js project")
    .option(
      "--skipCache",
      "do not read cached results from disk before parsing",
    )
    .option("--json", "output analysis result as JSON")
    .action((options) => analyze(options));
};

async function printDependencyTree(
  project: Project,
  filePath: string,
  depth = 1,
  maxDepth = 3,
  visited = new Set<string>(),
) {
  if (depth > maxDepth) return;

  if (visited.has(filePath)) return;
  visited.add(filePath);

  try {
    const file = await project.getSourceFile(filePath);
    if (!file) return;

    for (const dep of file.dependencies) {
      const isNodeModule = dep.includes("node_modules");
      const prefix = "  ".repeat(depth);
      const relativeName = dep.split("/").slice(-2).join("/");

      let isClient = false;
      try {
        const depFile = await project.getSourceFile(dep);
        isClient = depFile?.useClient;
      } catch {}

      const label = isNodeModule
        ? chalk.gray(relativeName)
        : isClient
          ? chalk.cyan(relativeName)
          : chalk.yellow(relativeName);

      console.log(`${prefix}└─ ${label}`);

      if (!isNodeModule) {
        await printDependencyTree(project, dep, depth + 1, maxDepth, visited);
      }
    }
  } catch (e) {
    // Ignore missing files
  }
}

export const analyze = async (options: Options) => {
  const here = process.cwd();

  // Resolve options
  const _projectDir = options.projectDir
    ? path.resolve(here, options.projectDir)
    : Config.projectDirectory;

  // Need to temporarily change dir for globbing to work
  // for some reason (??), will fix this eventually
  process.chdir(_projectDir);

  try {
    // Initialize the project
    if (!options.json) {
      printHeading(`Analyzing ${_projectDir.split("/").slice(-1)[0]}`);
    }

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

    // Restore cache from disk unless --skipCache is specified
    if (!options.skipCache) {
      await project.restoreCache();
    }

    const result = await project.analyze();

    // Save cache to disk for next run
    await project.saveCache();

    if (options.json) {
      // Create a clean JSON object without internal classes/circular deps
      const jsonOutput = {
        pages: result.pages.map((p) => ({
          filePath: p.filePath,
          useClient: p.useClient,
          dependencies: p.dependencies,
        })),
        routes: result.routes,
        clientBoundaries: result.clientBoundaries,
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
      return;
    }

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

      const boundaries = boundariesByPage.get(page.filePath);

      if (boundaries && boundaries.length > 0) {
        console.log(`  ${chalk.yellow("Client Boundaries:")}`);
        for (const boundary of boundaries) {
          const clientName = boundary.clientComponent
            .split("/")
            .slice(-2)
            .join("/");
          console.log(`    └─ ${chalk.cyan.bold(clientName)}`);

          // Print tree for the client component
          // We start at depth 2 to align with the boundary list
          await printDependencyTree(project, boundary.clientComponent, 3);
        }
      } else {
        console.log(`  ${chalk.gray("(No client boundaries found)")}`);
      }
    }
  } finally {
    process.chdir(here);
  }
};
