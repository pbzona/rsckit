import { createRequire } from "node:module";
import path from "node:path";
import { defineDevframe, defineRpcFunction } from "devframe";
import { z } from "zod";
import { type AnalysisOptions, routeSchema, snapshotSchema } from "../analysis";
import "./contract";
import { AnalysisSession } from "./session";

export interface InspectorOptions extends AnalysisOptions {
  watch?: boolean;
  clientAssets?: string;
}

export function createInspector(options: InspectorOptions = {}) {
  const session = new AnalysisSession(options);
  const packageRoot = path.dirname(
    createRequire(import.meta.url).resolve("rsckit/package.json"),
  );
  const definition = defineDevframe({
    id: "rsckit",
    name: "RSC Kit",
    version: "0.0.1",
    packageName: "rsckit",
    homepage: "https://github.com/pbzona/rsckit",
    description:
      "Inspect App Router client boundaries and local source dependencies",
    importMetaUrl: import.meta.url,
    clientAssets: options.clientAssets ?? path.join(packageRoot, "dist/client"),
    async setup(context) {
      const ctx = context.scope("rsckit");
      const snapshot = await session.getSnapshot();
      const status = await ctx.rpc.sharedState("status", {
        initialValue: { revision: 0, error: null },
      });
      session.subscribe((update) =>
        status.mutate((state) => Object.assign(state, update)),
      );
      ctx.rpc.register(
        defineRpcFunction({
          name: "get-snapshot",
          type: "query",
          snapshot: true,
          args: [] as const,
          returns: snapshotSchema,
          jsonSerializable: true,
          agent: {
            description:
              "Read the current source analysis. Source bytes are not bundle or RSC payload bytes.",
          },
          handler: () => session.getSnapshot(),
        }),
      );
      ctx.rpc.register(
        defineRpcFunction({
          name: "list-routes",
          type: "query",
          snapshot: true,
          args: [] as const,
          returns: z.array(
            z.object({
              id: z.string(),
              pathname: z.string(),
              clientSourceBytes: z.number(),
              boundaryCount: z.number(),
            }),
          ),
          jsonSerializable: true,
          agent: {
            description:
              "List App Router routes, their client boundaries, and deduplicated local client source bytes.",
          },
          handler: async () =>
            (await session.getSnapshot()).routes.map((route) => ({
              id: route.id,
              pathname: route.pathname,
              clientSourceBytes: route.clientSourceBytes,
              boundaryCount: route.boundaries.length,
            })),
        }),
      );
      ctx.rpc.register(
        defineRpcFunction({
          name: "get-route",
          type: "query",
          args: [z.string()] as const,
          returns: routeSchema,
          jsonSerializable: true,
          agent: {
            description:
              "Explain one route by its unique page-path id, including boundary import chains and server/client module environments.",
          },
          dump: {
            inputs: snapshot.routes.map((route): [string] => [route.id]),
          },
          handler: async (id) => {
            const route = (await session.getSnapshot()).routes.find(
              (route) => route.id === id,
            );
            if (!route) throw new Error(`Unknown route id: ${id}`);
            return route;
          },
        }),
      );
      ctx.rpc.register(
        defineRpcFunction({
          name: "get-source",
          type: "query",
          args: [z.string()] as const,
          returns: z.object({ path: z.string(), source: z.string() }),
          jsonSerializable: true,
          agent: {
            description:
              "Read source for a module in the analyzed snapshot. Arbitrary filesystem paths are rejected.",
          },
          dump: {
            inputs: snapshot.modules.map((file): [string] => [file.path]),
          },
          handler: (file) => session.getSource(file),
        }),
      );
      ctx.rpc.register(
        defineRpcFunction({
          name: "refresh",
          type: "action",
          args: [] as const,
          returns: snapshotSchema,
          jsonSerializable: true,
          handler: () => session.refresh(),
        }),
      );
      if (context.mode === "dev" && options.watch !== false)
        await session.startWatching();
    },
  });
  return { definition, close: () => session.close() };
}
