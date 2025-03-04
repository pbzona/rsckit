import { Page } from "./file";
import { DependencyCache } from "../cache";
import { Parser } from "../parser";
import { createFinderFn, FinderFunction } from "./utils";
import { printHeading, printMessage } from "@/lib/output";

export class Project {
  public root: string;
  public routes: Set<string>;
  public pages: Set<Page>;
  public cache: DependencyCache;

  constructor(rootPath: string) {
    Parser.init(rootPath);

    // Set up defaults
    this.root = rootPath;
    this.routes = new Set<string>();
    this.cache = DependencyCache.getInstance();
  }

  public async init(): Promise<Project> {
    printHeading(`Initializing project: ${this.root.split("/").slice(-1)[0]}`);

    printMessage("Finding pages...");
    const pages = await this.getPages();

    printMessage("Inferring routes...");
    this.getRoutesForPages(pages);

    printMessage("Parsing pages...");
    await this.parsePages()

    return this;
  }

  // Todo: delete this
  public debug(): void {
    this.cache.debug()
  }

  public async getPages(): Promise<Set<Page>> {
    const findPages: FinderFunction = createFinderFn(this.root, "page");
    const pages = await findPages();
    this.pages = new Set(
      pages.map(page => {
        // Create a new page, cache it before returning
        const p = new Page(page);
        this.cache.addEntry(p);
        return p;
      })
    )
    return this.pages;
  }

  public getRoutesForPages(pages = this.pages): Set<string> {
    for (const page of pages.values()) {
      if (!page.filePath.includes("app")) {
        continue;
      }
      // Split at 'app' because that's the root of the app router
      // Take the second part (index 1) and if you remove the file name
      // that's the route. Yeah I know this is ugly :(
      const route = page.filePath.split("app")[1].replace(/\/page.*$/, "");
      this.routes.add(route === "" ? "/" : route);
    }
    return this.routes;
  }

  public async parsePages(pages = this.pages) {
    for (const page of pages.values()) {
      await page.parseFile();
    }
  }
}
