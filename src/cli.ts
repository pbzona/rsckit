#!/usr/bin/env node

import { Command } from "commander";
import { registerAnalyzeCommand } from "./commands/analyze";

async function main() {
  const program = new Command();

  program
    .name('rsckit')
    .description('CLI for analyzing your Next.js project');

  registerAnalyzeCommand(program);

  await program.parseAsync(process.argv);
};

main().catch((error) => {
  if (error instanceof Error) {
    throw error;
  }
  console.error(error);
});
