import { globby } from "globby";

export const createFinderFn = (root: string, fileName = "*"): FinderFunction => {
  return async () => {
    const files = await globby([`${root}/**/${fileName}.{js,jsx,tsx}`], {
      gitignore: true,
      ignore: [
        "**/node_modules/**",
        "**/.next/**",
        "**/.vercel/**",
        "**/.git/**",
      ]
    })

    return files;
  }
}

export type FinderFunction = () => Promise<string[]>;

