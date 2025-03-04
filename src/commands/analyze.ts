import * as path from "node:path";
import { Command } from "commander";
import { Project } from "@/core/project/project";
import { printError, printHeading } from "@/lib/output";
import { DependencyCache } from "@/core/cache";

interface Options {
  projectDir?: string;
}

export const registerAnalyzeCommand = (program: Command) => {
  program
    .command('analyze')
    .description('Crawl your project to prepare it for querying and reporting')
    .option('-p, --projectDir <string>', 'the root of your Next.js project')
    .action((options) => analyzeCommandHandlerer(options));
}

const analyzeCommandHandlerer = async (options: Options) => {
  const here = process.cwd();

  // Resolve options
  const _projectDir = options.projectDir ?
    path.resolve(here, options.projectDir) : here;

  // Need to temporarily change dir for globbing to work 
  // for some reason (??), will fix this eventually
  process.chdir(_projectDir);

  try {
    // Instantiate the cache singleton, don't need a reference yet tho
    new DependencyCache("dependencies.json", path.resolve(here, ".rsckit"))

    printHeading("Finding pages in the app directory...")
    const project = await new Project(_projectDir).init();
    for (const page of project.pages) {
      await page.buildDependencyGraph()
    }
    console.log(project.cache)
    await project.cache.write();
  } catch (error) {
    printError("Could not write cache to disk")
    if (error instanceof Error) {
      printError(error.message);
    }
    throw error;
  } finally {
    process.chdir(here);
  }
}
