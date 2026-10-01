import { defineConfig } from "tsup";
import Sonda from "sonda/esbuild";

export default defineConfig({
  entry: [
    "src/cli.ts",
    "src/index.ts",
    "src/components/index.ts",
    "src/analysis/index.ts",
    "src/devframe/index.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  ignoreWatch: ["**/*.test.ts", "_internal/**", "coverage/**"],
  sourcemap: true,
  esbuildPlugins: [
    Sonda({
      enabled: process.env.SONDA === "1",
    }),
  ],
});
