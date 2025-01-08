import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts', 'src/components/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
