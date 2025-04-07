import { globby } from "globby";

// Function to find files of a certain name by globbing
export type FinderFunction = () => Promise<string[]>;

// Factory for FinderFunction
export const createFinderFn = (
  root: string,
  fileName = "*",
): FinderFunction => {
  return async () => {
    const files = await globby([`${root}/**/${fileName}.{js,jsx,tsx}`], {
      gitignore: true,
      ignore: [
        "**/node_modules/**",
        "**/.next/**",
        "**/.vercel/**",
        "**/.git/**",
      ],
    });

    return files;
  };
};

// Derive routes from the detected page.tsx paths
// Note that this is not the internal Next.js implementation, so don't
// rely on it for critical needs
export function inferRoutesFromPagePaths(pages: string[]): string[] {
  return pages
    .map((page: string) => {
      if (!page.includes("app")) {
        return null;
      }
      // Split at 'app' because that's the root of the app router
      // Take the second part (index 1) and if you remove the file name
      // that's the route. I know this is ugly :(
      const route = page.split("app")[1].replace(/\/page.*$/, "");
      return route === "" ? "/" : route;
    })
    .filter((page: string | null) => page !== null);
}
