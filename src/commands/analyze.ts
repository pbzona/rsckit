import * as path from "node:path"
import { Command } from "commander";
import { Project } from "@/project/project";
import { Cache } from "@/cache/cache";
import { Dependency } from "@/file-objects/dependencies";
import { SourceFile } from "@/file-objects/source-file";
import { Parser } from "@/parser/parser";
import { Config } from "@/config";

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
    .action((options) => analyzeCommandHandler(options));
}

const analyzeCommandHandler = async (options: Options) => {
  const here = process.cwd();

  // Resolve options
  const _projectDir = options.projectDir ?
    path.resolve(here, options.projectDir) : Config.projectDirectory;
  const _skipCache = !!options.skipCache

  // Need to temporarily change dir for globbing to work 
  // for some reason (??), will fix this eventually
  process.chdir(_projectDir);

  try {
    const cache = new Cache<Dependency[]>();
    if (!_skipCache) {
      await cache.restoreFromStorage()
    }

    const project = await Project.init(_projectDir);
    Parser.init(project);

    const pages = await project.findPages();

    for (const page of pages) {
      const p = new SourceFile(page);
      const deps = await p.getDependencies();
      cache.set(p.filePath, deps);
      await p.buildGraph();
    }

    //console.log(JSON.parse(cache.serialize()))
    await cache.writeToStorage();
  } catch (error) {
    throw error;
  } finally {
    process.chdir(here);
  }
}
