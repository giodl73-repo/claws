import { resolve } from "node:path";
import { defineConfig } from "tsdown";

const packageRoot = resolve(import.meta.dirname);

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: () => true,
  },
  entry: [resolve(packageRoot, "src", "cli.ts")],
  format: "esm",
  outDir: resolve(packageRoot, "dist"),
  platform: "node",
  target: "node22",
});
