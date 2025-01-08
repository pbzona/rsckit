import path from 'node:path';
import dependencyTree, { Tree, TreeInnerNode } from "dependency-tree";
import { mightContainReactComponent } from './parser';

/**
 * Generates a dependency tree for a given file within a project.
 *
 * @param file - The path to the file for which to generate the dependency tree.
 * @param projectRoot - The root directory of the project.
 * @param relative - Optional. If true, the paths in the tree will be relative to the project root. Defaults to false.
 * @returns The dependency tree of the specified file. If `relative` is true, the paths in the tree will be relative to the project root.
 */
export const getDependencyTree = (file: string, projectRoot: string, relative = false) => {
  const tsConfig = path.join(projectRoot, "tsconfig.json");
  const tree = dependencyTree({
    filename: file,
    directory: projectRoot,
    tsConfig,
    filter: (file) => mightContainReactComponent(file),
    detectiveConfig: {
      typescript: true
    }
  });
  return relative ? createRelativePathTree(tree, projectRoot) : tree;
};

/**
 * Converts an absolute path tree to a relative path tree based on a given base directory.
 *
 * @param tree - The tree structure where keys are absolute paths and values can be either strings (leaf nodes) or nested trees.
 * @param baseDir - The base directory to be removed from the absolute paths to create relative paths.
 * @returns A new tree structure with relative paths instead of absolute paths.
 */
export function createRelativePathTree(tree: Tree, baseDir: string): Tree {
  // If tree is a string (leaf node), just convert the path
  if (typeof tree === "string") {
    return tree.replace(baseDir, "").replace(/^\//, "");
  }

  const result: TreeInnerNode = {};

  for (const [absolutePath, value] of Object.entries(tree)) {
    // Convert absolute path to relative
    const relativePath = absolutePath.replace(baseDir, "").replace(/^\//, "");

    // Recursively handle nested dependencies
    result[relativePath] = createRelativePathTree(value, baseDir);
  }

  return result;
}

/**
 * Recursively flattens a nested object/tree.
 *
 * @param ob - The object to be flattened.
 * @returns A new object with flattened keys.
 *
 * @example
 * ```typescript
 * const nestedObject = {
 *   a: {
 *     b: {
 *       c: 1
 *     }
 *   },
 *   d: 2
 * };
 * const flatObject = flatten(nestedObject);
 * console.log(flatObject);
 * // Output: { 'a.b.c': 1, d: 2 }
 * ```
 */
type FlattenedObject = {
  [key: string]: unknown;
};

/**
 * Flattens a nested object into a single level object with keys representing the path to each value.
 *
 * @param obj - The object to flatten. Can be a generic record or a Tree structure.
 * @param separator - The string used to separate keys in the flattened object. Defaults to "..".
 * @param parentKey - The base key to prepend to each key in the flattened object. Defaults to an empty string.
 * @param result - The object that accumulates the flattened key-value pairs. Defaults to an empty object.
 * @returns A flattened object with keys representing the path to each value.
 */
export function flatten(
  obj: Record<string, any> | Tree, // Do i really need the more abstract type or is this only for trees?
  separator = "..",
  parentKey = "",
  result: FlattenedObject = {},
): FlattenedObject {
  for (const [key, value] of Object.entries(obj)) {
    // Construct the new key with parent key if it exists
    const newKey = parentKey ? `${parentKey}${separator}${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Check if the object is empty
      if (Object.keys(value).length === 0) {
        result[newKey] = {};
      } else {
        // Recurse for non-empty objects
        flatten(value, separator, newKey, result);
      }
    } else {
      // For non-object values, assign directly
      result[newKey] = value;
    }
  }

  return result;
}

