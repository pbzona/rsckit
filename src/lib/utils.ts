import * as fs from "node:fs/promises";
import path from "node:path";
import { printError } from "./output";

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (err) {
    return false;
  }
}

export const getAppDirFromRoot = async (root: string) => {
  try {
    return (await dirExists(path.resolve(root, "app")))
      ? path.resolve(root, "app")
      : path.resolve(root, "src/app");
  } catch (error) {
    printError(String(error));
    if (error instanceof Error) {
      throw error;
    }
  }
};

export const displayName = (filePath: string) => {
  return filePath.split("/").slice(-2).join("/");
};

export const pageDisplayName = (filePath: string) => {
  // Find the FIRST occurrence of "app" surrounded by path separators
  const match = filePath.match(/(^|[\\\/])app[\\\/]/);

  if (match) {
    const endOfMatch = (match.index ?? 0) + match[0].length;
    return "/" + filePath.substring(endOfMatch);
  }

  // Handle case where path ends with /app (though unlikely for a file)
  if (filePath.match(/(^|[\\\/])app$/)) {
    return "/";
  }

  return displayName(filePath);
};

export const fileNameFromPath = (filePath: string) => {
  return path.basename(filePath).replace(path.extname(filePath), "");
};
