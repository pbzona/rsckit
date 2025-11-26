import * as path from "node:path";
import { Config } from "@/config";
import { printHeading, printSuccess } from "@/lib/output";
import { Project } from "@/project/project";
import { Command } from "commander";

import chalk from "chalk";

interface Options {
  projectDir?: string;
  skipCache?: boolean;
  json?: boolean;
  verbose?: boolean;
  maxDepth?: string;
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
    .option("--verbose", "include full dependency tree")
    .action((options) => analyze(options));
};

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
    printHeading(`Analyzing ${_projectDir.split("/").slice(-1)[0]}`);

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

    await project.analyze();
    await project.saveCache();

    printSuccess("Analysis complete");

    console.log(chalk.gray("Run 'report' to see results."));
  } catch (e) {
    console.error(e);
  } finally {
    process.chdir(here);
  }
};
