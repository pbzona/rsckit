#!/usr/bin/env node
import path from 'node:path';
import { Command } from "commander";
import { exploreCmd } from './commands/explore';
import { ModuleCache } from './lib/cache';

async function main() {
  ModuleCache.init();
  const program = new Command();

  program
    .name('rsckit')
    .description('CLI for analyzing your Next.js project');

  program.command('explore')
    .description('Crawl your project and generate reports on its component structure')
    .option('-p, --projectDir <string>', 'the root of your Next.js project')
    .option('-o, --outputDir <string>', 'the output directory for reports (default current dir)')
    .action((options) => exploreCmd(options));

  await program.parseAsync(process.argv);
};

main().catch((error) => {
  if (error instanceof Error) {
    throw error;
  }
  console.error(error);
});
