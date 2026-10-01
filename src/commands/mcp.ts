import type { Command } from "commander";
import { projectOptions } from "./analyze";
import { waitForShutdown } from "./shutdown";
import type { InspectorOptions } from "../devframe";

export function registerMcpCommand(program: Command) {
  projectOptions(
    program
      .command("mcp")
      .description("Serve read-only analysis tools over MCP stdio"),
  )
    .option("--no-watch", "Disable automatic source refresh")
    .action(async (options: InspectorOptions) => {
      const [{ createInspector }, { createMcpServer }] = await Promise.all([
        import("../devframe"),
        import("devframe/adapters/mcp"),
      ]);
      const inspector = createInspector(options);
      try {
        const server = await createMcpServer(inspector.definition, {
          exposeSharedState: false,
        });
        await waitForShutdown(async () => {
          await server.stop();
          await inspector.close();
        }, true);
      } finally {
        await inspector.close();
      }
    });
}
