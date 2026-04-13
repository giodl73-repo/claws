import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'ir/index': 'src/ir/index.ts',
    'compile/index': 'src/compile/index.ts',
    'governance/index': 'src/governance/index.ts',
    'emit/index': 'src/emit/index.ts',
    'adapter/index': 'src/adapter/index.ts',
    'detect/index': 'src/detect/index.ts',
    'types/index': 'src/types/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
