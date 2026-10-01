#!/usr/bin/env node

import { Command } from "commander";
import { registerAnalyzeCommand } from "./commands/analyze";
import { registerReportCommand } from "./commands/report";

async function main() {
  const program = new Command();

  program
    .name("rsckit")
    .description("Inspect Next.js App Router client boundaries")
    .version("0.0.1");

  registerAnalyzeCommand(program);
  registerReportCommand(program);

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
