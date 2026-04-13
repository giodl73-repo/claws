import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'scenario/index': 'src/scenario/index.ts',
    'governance/index': 'src/governance/index.ts',
    'matchers/index': 'src/matchers/index.ts',
    'security/scanner': 'src/security/scanner.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
