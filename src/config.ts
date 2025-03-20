// Hard coding these while I work on getting this functional, this
// will probably be a config file eventually 

import path from "node:path";

export const Config = {
  projectDirectory: path.resolve(process.cwd(), "../test-project"),
  outputDirectory: path.resolve(process.cwd(), ".rsckit")
}
