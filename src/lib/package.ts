import { readdirSync } from "node:fs";

type ParentSearchPredicate = (dir: string) => boolean;

const containsPackageJson: ParentSearchPredicate = (dir: string) => {
  return readdirSync(dir).includes("package.json");
};

// Crawl up the file tree until it finds a package.json
// todo: handle errors lol
export const findParentPackage = (
  currentDir: string,
  predicate: ParentSearchPredicate = containsPackageJson,
): string => {
  if (predicate(currentDir)) {
    return currentDir;
  }

  const dirs = currentDir.split("/");
  const parent = dirs.slice(0, -1).join("/");

  return findParentPackage(parent, predicate);
};
