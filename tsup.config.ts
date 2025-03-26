import { defineConfig } from 'tsup';
import Sonda from 'sonda/esbuild';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts', 'src/components/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  esbuildPlugins: [
    Sonda({
      enabled: process.env.SONDA === "1",
    })
  ]
});
