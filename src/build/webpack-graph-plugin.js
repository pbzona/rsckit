import * as fs from "node:fs";
import * as path from "node:path";

export class DependencyGraphPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap("DependencyGraphPlugin", (compilation) => {
      console.log(compilation);
      compilation.hooks.finishModules.tap(
        "DependencyGraphPlugin",
        (modules) => {
          const dependencyGraph = {};

          modules.forEach((module) => {
            if (!module.resource) return;
            const fileName = module.resource.split("/").slice(-1).join("/");
            if (
              module.context.includes("node_modules") ||
              !fileName.startsWith("page")
            )
              return; // Ignore non-JS modules

            // console.log("Module dir:", module.context);
            // console.log(
            //   "Filename:",
            //   module.resource.split("/").slice(-1).join("/"),
            // );
            // console.log("Build info:", module);

            // Initialize entry for the module
            dependencyGraph[module.resource] = [];

            // Iterate through dependencies
            module.dependencies.forEach((dependency) => {
              const mod = compilation.moduleGraph.getModule(dependency);
              if (mod) {
                dependencyGraph[module.resource].push(
                  ...mod.dependencies.map((d) => ({
                    name: d.name || d.names || "Unknown",
                    request: d.request || d.userRequest || "Unknown",
                  })),
                );
              }
            });
          });

          // Define output path (inside Webpack's output folder)
          const outputPath = path.resolve(
            //compiler.options.output.path,
            "/Users/phil/Vercel/Experiments",
            "dependency-graph.json",
          );

          // Write to a file
          fs.appendFileSync(
            outputPath,
            JSON.stringify(dependencyGraph, null, 2),
            "utf-8",
          );

          console.log(`📄 Dependency graph saved to ${outputPath}`);
        },
      );
    });
  }
}
