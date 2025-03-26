import * as path from "node:path"
import { Command } from "commander";
import { createProject } from "@/project/project";
import { Config } from "@/config";
import { printHeading } from "@/lib/output";
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
    for (const page of project.pages) {
      await page.analyze();
    }

    await sourceFileCache.writeToFile()

    //// Get all 'page.tsx' files for the project
    //// These will be the roots for finding problematic uses of 
    //// the use client directive and large props
    //printMessage("Getting pages for the project...")
    //const pages = await project.findPages();
    //
    //// Create a file object for each page to handle different 
    //// parsing operations and checks
    //for (const page of pages) {
    //  const p = new SourceFile(page);
    //  printMessage(`${chalk.magenta("Found page:")} ${p.filePath.split("/").slice(-2).join("")}`)
    //
    //  // Do things with the parser 
    //  await p.getDependencies();
    //  await p.checkForUseClient();
    //
    //  // Traverse the full dependency graph, which triggers each
    //  // dependency to be parsed and added to the cache
    //  await p.buildGraph();
    //}
    //
    //await cache.writeToStorage();
  } catch (error) {
    throw error;
  } finally {
    process.chdir(here);
  }
}
