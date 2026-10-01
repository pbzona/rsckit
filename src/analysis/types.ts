import { z } from "zod";

export const diagnosticSchema = z.object({
  level: z.enum(["warning", "error"]),
  code: z.string(),
  file: z.string().optional(),
  message: z.string(),
});
export const importSchema = z.object({
  specifier: z.string(),
  kind: z.enum(["static", "dynamic", "reexport", "require"]),
  status: z.enum(["local", "external", "asset", "unresolved"]),
  target: z.string().optional(),
});
export const moduleSchema = z.object({
  path: z.string(),
  useClient: z.boolean(),
  useServer: z.boolean(),
  sourceBytes: z.number(),
  imports: z.array(importSchema),
});
export const boundarySchema = z.object({
  id: z.string(),
  parent: z.string().nullable(),
  child: z.string(),
  importChain: z.array(z.string()),
  clientModules: z.array(z.string()),
  sourceBytes: z.number(),
});
export const routeSchema = z.object({
  id: z.string(),
  pathname: z.string(),
  page: z.string(),
  entries: z.array(z.string()),
  boundaries: z.array(boundarySchema),
  modules: z.array(
    z.object({
      path: z.string(),
      environments: z.array(z.enum(["server", "client"])),
    }),
  ),
  clientSourceBytes: z.number(),
});
export const snapshotSchema = z.object({
  schemaVersion: z.literal(1),
  root: z.string(),
  appDirectory: z.string(),
  generatedAt: z.string(),
  routes: z.array(routeSchema),
  modules: z.array(moduleSchema),
  diagnostics: z.array(diagnosticSchema),
  measurements: z.object({
    sourceBytes: z.literal("UTF-8 source bytes; excludes packages and assets"),
    payloadBytes: z.null(),
  }),
});

export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type ModuleInfo = z.infer<typeof moduleSchema>;
export type ImportInfo = z.infer<typeof importSchema>;
export type Boundary = z.infer<typeof boundarySchema>;
export type Route = z.infer<typeof routeSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export interface AnalysisOptions {
  root?: string;
  appDirectory?: string;
  tsconfig?: string;
}
