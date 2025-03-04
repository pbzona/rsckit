// Hard coding these while I work on getting this functional, this
// will be a config file eventually 

import path from "node:path";

export const config = {
  projectDirectory: path.resolve(process.cwd(), "../test-project")
}
