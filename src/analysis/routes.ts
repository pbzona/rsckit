import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Diagnostic } from "./types";

export const sourcePattern = /\.(?:[cm]?[jt]sx?)$/;
const pagePattern = /^page\.(?:jsx?|tsx?)$/;
const entryPattern =
  /^(?:layout|template|loading|error|not-found|global-error)\.(?:jsx?|tsx?)$/;
export const relativePath = (root: string, file: string) =>
  path.relative(root, file).split(path.sep).join("/");

export async function isDirectory(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isDirectory();
  } catch {
    return false;
  }
}

export async function findAppDirectory(root: string, override?: string) {
  const candidates = override
    ? [path.resolve(root, override)]
    : [path.join(root, "app"), path.join(root, "src/app")];
  for (const candidate of candidates) {
    if (await isDirectory(candidate)) return candidate;
  }
  throw new Error(
    `No App Router directory found in ${root}. Use --app-directory to specify one.`,
  );
}

export interface RouteEntry {
  page: string;
  pathname: string;
  entries: string[];
}

export async function discoverRoutes(
  root: string,
  app: string,
  diagnostics: Diagnostic[],
) {
  const routes: RouteEntry[] = [];
  async function visit(directory: string, ancestors: string[]) {
    const files = (await readdir(directory, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    const ownEntries = files
      .filter((file) => file.isFile() && entryPattern.test(file.name))
      .map((file) => relativePath(root, path.join(directory, file.name)));
    const entries = [...ancestors, ...ownEntries];
    for (const file of files) {
      if (
        file.isDirectory() &&
        !file.name.startsWith("_") &&
        !file.name.startsWith(".") &&
        file.name !== "node_modules"
      ) {
        await visit(path.join(directory, file.name), entries);
      } else if (file.isFile() && pagePattern.test(file.name)) {
        const page = relativePath(root, path.join(directory, file.name));
        const segments = relativePath(app, directory)
          .split("/")
          .filter(Boolean);
        if (segments.some((segment) => /^\(\.{1,3}\)/.test(segment))) {
          diagnostics.push({
            level: "warning",
            code: "intercepted-route",
            file: page,
            message:
              "Intercepted route paths are shown as source segments; navigation matching is not inferred.",
          });
        }
        const pathname = `/${segments.filter((segment) => !segment.startsWith("@") && !/^\([^)]*\)$/.test(segment)).join("/")}`;
        routes.push({ page, pathname, entries: [...entries, page] });
      }
    }
  }
  await visit(app, []);
  if (!routes.length)
    diagnostics.push({
      level: "warning",
      code: "no-pages",
      message: "No App Router pages found.",
    });
  return routes.sort((a, b) => a.page.localeCompare(b.page));
}
