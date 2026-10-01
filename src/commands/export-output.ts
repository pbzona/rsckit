import { lstat } from "node:fs/promises";

export async function assertNewOutputDirectory(directory: string) {
  try {
    await lstat(directory);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return;
    throw error;
  }
  throw new Error(
    `Export directory already exists: ${directory}. Choose a new --output path.`,
  );
}
