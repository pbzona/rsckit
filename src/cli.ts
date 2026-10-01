#!/usr/bin/env node

import { Command } from "commander";
import { registerAnalyzeCommand } from "./commands/analyze";
import { registerReportCommand } from "./commands/report";
import { registerMcpCommand } from "./commands/mcp";
import { registerViewCommand } from "./commands/view";
import { registerExportCommand } from "./commands/export";

async function main() {
  const program = new Command();

  program
    .name("rsckit")
    .description("Inspect Next.js App Router client boundaries")
    .version("0.0.1");

  registerAnalyzeCommand(program);
  registerReportCommand(program);
  registerMcpCommand(program);
  registerViewCommand(program);
  registerExportCommand(program);

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
