import * as path from "node:path"
import { Command } from "commander";
import chalk from "chalk";
import { Project } from "@/project/project";
import { Config } from "@/config";
import { printHeading } from "@/lib/output";

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

  // Need to temporarily change dir for globbing to work 
  // for some reason (??), will fix this eventually
  process.chdir(_projectDir);

  try {
    // Initialize the project
    printHeading(
      `Analyzing ${_projectDir.split("/").slice(-1)[0]}`
    );

    const project = new Project({
      root: _projectDir,
      tsConfig: {
        path: path.join(_projectDir, "tsconfig.json"),
        options: {
          compilerOptions: {} // TODO: Load actual tsconfig
        }
      },
      parser: {
        options: {
          projectRoot: _projectDir,
          tsConfigPath: path.join(_projectDir, "tsconfig.json")
        }
      }
    });

    // Restore cache from disk unless --skipCache is specified
    if (!options.skipCache) {
      await project.restoreCache();
    }

    const result = await project.analyze();

    // Save cache to disk for next run
    await project.saveCache();

    // Output summary
    console.log('\n=== Analysis Summary ===');
    console.log(`Pages found: ${result.pages.length}`);
    console.log(`Routes: ${result.routes.join(', ')}`);
    console.log(`Client boundaries: ${result.clientBoundaries.length}`);

    console.log('\n=== Page Details ===');
    for (const page of result.pages) {
      console.log(`\n${page.filePath}`);
      console.log(`  - Server component: ${!page.useClient}`);
      console.log(`  - Dependencies: ${page.dependencies.length}`);
      if (page.dependencies.length > 0) {
        page.dependencies.slice(0, 5).forEach(dep => {
          console.log(`    • ${dep.split('/').slice(-2).join('/')}`);
        });
        if (page.dependencies.length > 5) {
          console.log(`    ... and ${page.dependencies.length - 5} more`);
        }
      }
    }
  } catch (error) {
    throw error;
  } finally {
    process.chdir(here);
  }
}
