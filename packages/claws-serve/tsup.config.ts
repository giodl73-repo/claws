import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    '@bic/claws-sdk',
    '@bic/claws-sdk',
    '@bic/claws-sdk',
    '@bic/openclaw-workspace',
    '@bic/openclaw-guardrails',
    '@bic/openclaw-policy',
    '@bic/openclaw-snap',
    '@bic/openclaw-lsp',
    'typescript',
    'zod',
    'chokidar',
    'express',
    'ws',
  ],
});
