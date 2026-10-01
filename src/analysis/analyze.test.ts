import { mkdtemp, mkdir, writeFile, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyzeProject } from "./analyze";
import { readSnapshot, saveSnapshot } from "./store";

let root: string;
async function file(name: string, source: string) {
  const target = path.join(root, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, source);
}
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "rsckit-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("retains client context through unmarked modules and handles dual environments and cycles", async () => {
  await file("app/page.tsx", 'import "../shared"; import "../client";');
  await file("client.tsx", '"use client"; import "./shared";');
  await file("shared.ts", 'import "./nested";');
  await file("nested.tsx", '"use client"; import "./shared";');
  const snapshot = await analyzeProject({ root });
  const route = snapshot.routes[0];
  expect(route.boundaries.map((boundary) => boundary.child).sort()).toEqual([
    "client.tsx",
    "nested.tsx",
  ]);
  expect(
    route.modules.find((module) => module.path === "shared.ts")?.environments,
  ).toEqual(["client", "server"]);
  expect(
    route.boundaries.find((boundary) => boundary.child === "client.tsx")
      ?.clientModules,
  ).toEqual(["client.tsx", "nested.tsx", "shared.ts"]);
  const clientBytes = snapshot.modules
    .filter((module) => module.path !== "app/page.tsx")
    .reduce((sum, module) => sum + module.sourceBytes, 0);
  expect(route.clientSourceBytes).toBe(clientBytes);
});

it("does not create a second boundary inside a client graph", async () => {
  await file("app/page.tsx", 'import "../client";');
  await file("client.tsx", '"use client"; import "./unmarked";');
  await file("unmarked.ts", 'import "./nested";');
  await file("nested.tsx", '"use client";');
  expect(
    (await analyzeProject({ root })).routes[0].boundaries.map(
      (boundary) => boundary.child,
    ),
  ).toEqual(["client.tsx"]);
});

it("composes layouts and groups while keeping parallel routes distinct and excluding private folders", async () => {
  await file("src/app/layout.tsx", 'import "../../provider";');
  await file("provider.tsx", '"use client";');
  await file("src/app/(shop)/products/[id]/page.ts", "export default 1;");
  await file(
    "src/app/(shop)/products/[id]/@modal/page.jsx",
    "export default 2;",
  );
  await file("src/app/_private/page.tsx", "export default 3;");
  await file("other/page.tsx", "export default 4;");
  const snapshot = await analyzeProject({ root });
  expect(snapshot.routes).toHaveLength(2);
  expect(snapshot.routes.map((route) => route.pathname)).toEqual([
    "/products/[id]",
    "/products/[id]",
  ]);
  expect(snapshot.routes[0].entries).toContain("src/app/layout.tsx");
  expect(snapshot.routes[0].boundaries[0].child).toBe("provider.tsx");
});

it("resolves tsconfig aliases and extended configs, skips type-only edges, and keeps dynamic/reexport imports", async () => {
  await file(
    "base.json",
    '{"compilerOptions":{"baseUrl":".","paths":{"~/*":["src/*"]}}}',
  );
  await file("tsconfig.json", '{"extends":"./base.json"}');
  await file(
    "app/page.tsx",
    'import type { Missing } from "./missing"; import { type Other } from "./also-missing"; export { value } from "~/barrel"; import("~/dynamic");',
  );
  await file("src/barrel.ts", 'export { value } from "./client";');
  await file("src/client.ts", '"use client"; export const value = 1;');
  await file("src/dynamic.ts", '"use client";');
  const snapshot = await analyzeProject({ root });
  expect(snapshot.diagnostics).toEqual([]);
  expect(
    snapshot.routes[0].boundaries.map((boundary) => boundary.child).sort(),
  ).toEqual(["src/client.ts", "src/dynamic.ts"]);
  expect(
    snapshot.modules
      .find((module) => module.path === "app/page.tsx")
      ?.imports.map((edge) => edge.kind),
  ).toEqual(["reexport", "dynamic"]);
});

it("only recognizes directives in the module prologue", async () => {
  await file(
    "app/page.tsx",
    'export default function Page() { "use client"; return null; }',
  );
  expect((await analyzeProject({ root })).modules[0].useClient).toBe(false);
});

it("reports missing/computed imports and parse errors, but records external packages and assets separately", async () => {
  await file(
    "app/page.tsx",
    'import "./missing"; import "react"; import "./style.css"; import(variable); const broken = ;',
  );
  const snapshot = await analyzeProject({ root });
  expect(snapshot.diagnostics.map((item) => item.code).sort()).toEqual([
    "computed-import",
    "parse-error",
    "unresolved-import",
  ]);
  expect(snapshot.modules[0].imports.map((edge) => edge.status)).toEqual([
    "unresolved",
    "external",
    "asset",
  ]);
});

it("does not pull use-server action implementations into client source totals", async () => {
  await file("app/page.tsx", '"use client"; import "../actions";');
  await file("actions.ts", '"use server"; import "./secret";');
  await file("secret.ts", "export const key = 1;");
  const snapshot = await analyzeProject({ root });
  expect(snapshot.routes[0].boundaries[0].clientModules).toEqual([
    "app/page.tsx",
  ]);
  expect(snapshot.diagnostics[0].code).toBe("server-reference");
});

it("revalidates edits, new routes, removed dependencies, and config changes on every scan", async () => {
  await file("app/page.tsx", 'import "../client";');
  await file("client.ts", '"use client";');
  expect((await analyzeProject({ root })).routes[0].boundaries).toHaveLength(1);
  await file("client.ts", "export const value = 1;");
  expect((await analyzeProject({ root })).routes[0].boundaries).toHaveLength(0);
  await file("app/new/page.tsx", '"use client";');
  await unlink(path.join(root, "client.ts"));
  const snapshot = await analyzeProject({ root });
  expect(snapshot.routes).toHaveLength(2);
  expect(snapshot.diagnostics[0].code).toBe("unresolved-import");
});

it("round-trips versioned snapshots without changing cwd", async () => {
  await file("app/page.tsx", "export default 1;");
  const cwd = process.cwd();
  const snapshot = await analyzeProject({ root });
  const output = await saveSnapshot(snapshot);
  expect(await readSnapshot(output)).toEqual(snapshot);
  expect(process.cwd()).toBe(cwd);
  await writeFile(output, '{"schemaVersion":0}');
  await expect(readSnapshot(output)).rejects.toThrow();
});

it("re-resolves aliases after config edits and supports a custom app directory", async () => {
  await file("web/page.tsx", 'import "@/choice";');
  await file("one/choice.ts", '"use client";');
  await file("two/choice.ts", "export const value = 1;");
  await file(
    "tsconfig.json",
    '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["one/*"]}}}',
  );
  const options = { root, appDirectory: "web" };
  expect((await analyzeProject(options)).routes[0].boundaries[0].child).toBe(
    "one/choice.ts",
  );
  await file(
    "tsconfig.json",
    '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["two/*"]}}}',
  );
  expect((await analyzeProject(options)).routes[0].boundaries).toHaveLength(0);
});

it("fails explicitly for missing App Router roots and malformed configs", async () => {
  await expect(analyzeProject({ root })).rejects.toThrow("No App Router");
  await file("app/page.tsx", "export default 1;");
  await file("tsconfig.json", "{broken");
  await expect(analyzeProject({ root })).rejects.toThrow();
});
