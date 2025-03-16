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
}
