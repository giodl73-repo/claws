import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'scenario/index': 'src/scenario/index.ts',
    'governance/index': 'src/governance/index.ts',
    'matchers/index': 'src/matchers/index.ts',
    'security/scanner': 'src/security/scanner.ts',
    'gateway-sim': 'src/gateway-sim.ts',
    'gateway-sim/report': 'src/gateway-sim/report.ts',
    'gateway-sim/mock-governance-host': 'src/gateway-sim/mock-governance-host.ts',
    'gateway-sim/plugin-loader': 'src/gateway-sim/plugin-loader.ts',
    'gateway-sim/timing': 'src/gateway-sim/timing.ts',
    'tool-call-builder': 'src/tool-call-builder.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
