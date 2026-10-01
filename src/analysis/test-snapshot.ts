import type { Snapshot } from "./types";

export function testSnapshot(): Snapshot {
  return {
    schemaVersion: 1,
    root: "/project",
    appDirectory: "app",
    generatedAt: "2026-10-01T00:00:00.000Z",
    routes: [],
    modules: [],
    diagnostics: [],
    measurements: {
      sourceBytes: "UTF-8 source bytes; excludes packages and assets",
      payloadBytes: null,
    },
  };
}
