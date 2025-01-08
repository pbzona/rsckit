import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { debug, printHeading, printMessage, printMessageListItem } from '@/lib/output';
import { findPages, } from '@/lib/parser';
import { flatten, getDependencyTree } from '@/lib/tree';

// hard coded for now, who cares
interface ExploreOptions {
  projectDir?: string;
  outputDir?: string;
}

export async function exploreCmd(options: ExploreOptions) {
  const here = process.cwd();

  // Resolve options
  const _projectDir = options.projectDir ?
    path.resolve(here, options.projectDir) : here;
  const _outputDir = options.outputDir ?
    path.resolve(_projectDir, options.outputDir) : path.resolve(here, 'rsckit');

  try {
    await fs.mkdir(_outputDir, { recursive: true });

    const dependencyTreesFile = path.resolve(_outputDir, 'dependency-trees.json');
    const dependenciesFile = path.resolve(_outputDir, 'dependencies.json');
    const clientComponentsFile = path.resolve(_outputDir, 'client-components.json');

    const result = {
      dependencyTrees: {},
      dependencies: [],
      clientComponents: {}
    };

    // For testing different directories bc depedency tree needs the tsconfig for path resolution
    // Should fix this in the future so it resolves regardless of
    process.chdir(_projectDir);

    // 1) Find all pages in app directory
    printHeading('Finding all Next.js app router pages...');
    const appDirectory = path.resolve(_projectDir, 'app');
    const pages = await findPages(appDirectory);
    for (const page of pages) {
      // 2) Generate a dependency tree for each page
      printMessage(`Generating dependency tree for ${page}...`);
      const tree = getDependencyTree(page, _projectDir);
      result.dependencyTrees[page] = tree;

      // 3) Flatten and get unique dependencies
      printMessage('Flattening and filtering dependencies...');
      const separator = "..";
      const deps = flatten(tree, separator);
      const uniqueDeps = new Set();

      for (const filePath of Object.keys(deps)) {
        const nestedLayers = filePath.split(separator);
        uniqueDeps.add(nestedLayers[nestedLayers.length - 1]);
      }

      result.dependencies = [...result.dependencies, ...Array.from(uniqueDeps)];
    }

    printHeading('Writing files:');
    printMessageListItem(path.basename(dependencyTreesFile));
    printMessageListItem(path.basename(dependenciesFile));

    await fs.writeFile(dependencyTreesFile, JSON.stringify(result.dependencyTrees, null, 2));
    await fs.writeFile(dependenciesFile, JSON.stringify(result.dependencies, null, 2));
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    console.error(error);
  } finally {
    process.chdir(here);
  }
}