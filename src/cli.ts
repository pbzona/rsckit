#!/usr/bin/env node

import { Command } from "commander";
import { registerExploreCommand } from './commands/explore';
import { ModuleCache } from './lib/cache';
import { registerAnalyzeCommand } from "./commands/analyze";

async function main() {
  //ModuleCache.init();
  const program = new Command();

  program
    .name('rsckit')
    .description('CLI for analyzing your Next.js project');

  //registerExploreCommand(program);
  registerAnalyzeCommand(program);

  await program.parseAsync(process.argv);
};

main().catch((error) => {
  if (error instanceof Error) {
    throw error;
  }
  console.error(error);
});
