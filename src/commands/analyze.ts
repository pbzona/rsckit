import * as path from "node:path"
import { Command } from "commander";
import chalk from "chalk";
import { createProject } from "@/project/project";
import { Config } from "@/config";
import { printHeading, printMessage } from "@/lib/output";
import { sourceFileCache } from "@/cache";

interface Options {
  projectDir?: string;
  skipCache?: boolean;
}

export const registerAnalyzeCommand = (program: Command) => {
  program
    .command("analyze")
    .description("Crawl your project to prepare it for querying and reporting")
    .option("-p, --projectDir <string>", "the root of your Next.js project")
    .option("--skipCache", "do not read cached results from disk before parsing")
    .action((options) => analyze(options));
}

export const analyze = async (options: Options) => {
  const here = process.cwd();

  // Resolve options
  const _projectDir = options.projectDir ?
    path.resolve(here, options.projectDir) : Config.projectDirectory;
  const _skipCache = !!options.skipCache

  // Need to temporarily change dir for globbing to work 
  // for some reason (??), will fix this eventually
  process.chdir(_projectDir);

  try {
    if (!_skipCache) {
      await sourceFileCache.restoreFromFile()
    }

    // Initialize the project and parser
    printHeading(
      `Analyzing ${_projectDir.split("/").slice(-1)[0]}`
    )
    const project = await createProject(_projectDir);

    // Do stuff with the pages found in the project
    for (const page of project.pages) {
      // Todo build a dep graph here so I can easily find RSC boundaries
      console.log(page)
    }

    await sourceFileCache.writeToFile()
  } catch (error) {
    throw error;
  } finally {
    process.chdir(here);
  }
}
