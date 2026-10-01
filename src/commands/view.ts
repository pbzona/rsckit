import type { AnalysisOptions } from "../analysis";
import { Option, type Command } from "commander";
import { projectOptions } from "./analyze";
import { waitForShutdown } from "./shutdown";

interface ViewFlags extends AnalysisOptions {
  host: string;
  port?: number;
  watch: boolean;
  open: boolean;
  auth: boolean;
}

export function registerViewCommand(program: Command) {
  projectOptions(
    program.command("view").description("Open the live boundary inspector"),
  )
    .option("--host <host>", "Bind host", "localhost")
    .addOption(
      new Option("--port <port>", "Bind port").argParser((value) => {
        const port = Number(value);
        if (!Number.isInteger(port) || port < 0 || port > 65535)
          throw new Error("Port must be an integer from 0 to 65535");
        return port;
      }),
    )
    .option("--no-watch", "Disable automatic analysis on edits")
    .option("--no-open", "Do not open the browser automatically")
    .option("--no-auth", "Disable the local Devframe authentication gate")
    .action(async (options: ViewFlags) => {
      const [{ createInspector }, { createDevServer }] = await Promise.all([
        import("../devframe"),
        import("devframe/adapters/dev"),
      ]);
      const inspector = createInspector(options);
      try {
        const server = await createDevServer(inspector.definition, {
          host: options.host,
          port: options.port,
          openBrowser: options.open,
          auth: options.auth,
          onReady: ({ origin }) => {
            console.log(`RSC Kit inspector: ${origin}\nPress Ctrl+C to stop.`);
          },
        });
        await waitForShutdown(async () => {
          await server.close();
          await inspector.close();
        });
      } finally {
        await inspector.close();
      }
    });
}
