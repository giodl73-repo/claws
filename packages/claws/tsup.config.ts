import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['@bic/claws-sdk', '@bic/claws-serve', '@bic/openclaw-workspace', '@bic/openclaw-guardrails', '@bic/openclaw-policy', '@bic/openclaw-snap', '@bic/openclaw-lsp', 'typescript', 'zod', 'chokidar', 'commander'],
});
