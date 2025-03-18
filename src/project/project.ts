import { createFinderFn, FinderFunction } from "./find";

export class Project {
  private findFilesByName: (fileName: string) => FinderFunction;
  public findPages: FinderFunction;

  private constructor(public root: string) {
    this.findFilesByName = (fileName: string) => createFinderFn(
      root, fileName
    )
    this.findPages = this.findFilesByName("page");

    return this;
  }

  // Use static init method to avoid problems with async constructor 
  static async init(root: string): Promise<Project> {
    return new Project(root);
  }

  async getRoutesForPages(pages?: string[]) {
    const _pages = pages ? pages : await this.findPages();

    return _pages.map((page: string) => {
      if (!page.includes("app")) {
        return null;
      }
      // Split at 'app' because that's the root of the app router
      // Take the second part (index 1) and if you remove the file name
      // that's the route. I know this is ugly :(
      const route = page.split("app")[1].replace(/\/page.*$/, "");
      return route === "" ? "/" : route;
    }).filter((page: string | null) => page !== null);
  }
}
