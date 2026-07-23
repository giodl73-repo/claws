import { defineConfig, defineProject } from "vitest/config";

const sharedExclude = ["**/node_modules/**", "**/dist/**"];

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    forceExit: true,
    testTimeout: 15_000,
    exclude: sharedExclude,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["src/**"],
      exclude: ["src/**/*.d.ts", "src/**/index.ts", "src/types.ts", "src/**/types.ts", "tests/**"],
      thresholds: {
        perFile: true,
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
    projects: [
      defineProject({
        test: {
          name: "unit",
          include: ["tests/**/*.unit.test.ts"],
          forceExit: true,
          testTimeout: 15_000,
          exclude: sharedExclude,
        },
      }),
      defineProject({
        test: {
          name: "integration",
          include: ["tests/**/*.integration.test.ts"],
          forceExit: true,
          testTimeout: 15_000,
          exclude: sharedExclude,
        },
      }),
    ],
  },
});
