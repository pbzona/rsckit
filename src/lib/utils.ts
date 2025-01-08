import * as fs from 'node:fs/promises';
import path from 'node:path';
import { printError } from './output';

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
    return await dirExists(path.resolve(root, 'app')) ?
      path.resolve(root, 'app') :
      path.resolve(root, 'src/app');
  } catch (error) {
    printError(error);
    if (error instanceof Error) {
      throw error;
    }
  }
}

