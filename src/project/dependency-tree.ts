import { Project } from "./project";
import { formatBytes } from "@/lib/bytes";
import chalk from "chalk";

export async function printDependencyTree(
  project: Project,
  filePath: string,
  depth = 1,
  maxDepth = 3,
  maxSiblings = Number.POSITIVE_INFINITY,
  visited = new Set<string>(),
) {
  if (depth > maxDepth) return;

  if (visited.has(filePath)) return;
  visited.add(filePath);

  try {
    const file = await project.getSourceFile(filePath);
    if (!file) return;

    const siblingFiles = await Promise.all(
      file.dependencies.map(async (dep) => {
        try {
          return { path: dep, file: await project.getSourceFile(dep) };
        } catch {
          return { path: dep, file: undefined };
        }
      }),
    );

    // Sort by size descending
    siblingFiles.sort((a, b) => {
      const sizeA = a.file?.size || 0;
      const sizeB = b.file?.size || 0;
      if (sizeA !== sizeB) {
        return sizeB - sizeA;
      }
      // Secondary sort by path for stability
      return a.path.localeCompare(b.path);
    });

    let leafCount = 0;
    let skippedLeaves = 0;

    for (const { path: dep, file: depFile } of siblingFiles) {
      const isNodeModule = dep.includes("node_modules");

      // Determine if it's a branch (has children and we are not at max depth)
      // Note: node_modules are effectively leaves in this visualization
      let isBranch = false;
      if (
        !isNodeModule &&
        depth < maxDepth &&
        !visited.has(dep) &&
        depFile &&
        depFile.dependencies.length > 0
      ) {
        isBranch = true;
      }

      // If it is a branch, we always show it.
      // If it is a leaf, we check the limit.
      if (!isBranch) {
        if (
          maxSiblings !== Number.POSITIVE_INFINITY &&
          leafCount >= maxSiblings
        ) {
          skippedLeaves++;
          continue;
        }
        leafCount++;
      }

      const prefix = "  ".repeat(depth);
      const relativeName = dep.split("/").slice(-2).join("/");

      let isClient = false;
      let size = 0;

      if (depFile) {
        isClient = depFile.useClient;
        size = depFile.size;
      }

      const sizeLabel =
        size > 0
          ? isClient
            ? chalk.bold.cyan(` (${formatBytes(size)})`)
            : chalk.gray(` (${formatBytes(size)})`)
          : "";

      const label = isNodeModule
        ? chalk.gray(relativeName)
        : isClient
          ? chalk.cyan(relativeName) + sizeLabel
          : chalk.yellow(relativeName) + sizeLabel;

      console.log(`${prefix}└─ ${label}`);

      if (!isNodeModule) {
        await printDependencyTree(
          project,
          dep,
          depth + 1,
          maxDepth,
          maxSiblings,
          visited,
        );
      }
    }

    if (skippedLeaves > 0) {
      const prefix = "  ".repeat(depth);
      console.log(`${prefix}└─ ${chalk.gray(`... ${skippedLeaves} more`)}`);
    }
  } catch (e) {
    // Ignore missing files
  }
}
