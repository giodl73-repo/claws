import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CLI_VERSION } from "./types.js";

describe("standalone Claw CLI publication guard", () => {
  it("remains private, dependency-free, and protected from publication", async () => {
    const manifest = JSON.parse(await readFile(resolve("packages/cli/package.json"), "utf8")) as {
      private?: boolean;
      version?: string;
      dependencies?: Record<string, string>;
      publishConfig?: unknown;
      scripts?: { prepublishOnly?: string };
    };

    expect(manifest.private).toBe(true);
    expect(manifest.version).toBe(CLI_VERSION);
    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.publishConfig).toBeUndefined();
    expect(manifest.scripts?.prepublishOnly).toContain("publication is disabled");
  });

  it("keeps the packed-artifact proof repository-owned and non-publishing", async () => {
    const rootManifest = JSON.parse(await readFile(resolve("package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const proof = rootManifest.scripts?.["proof:pack"];

    expect(proof).toContain("pnpm build");
    expect(proof).toContain("scripts/prove-packed-cli.mjs");
    expect(proof).not.toMatch(/publish|registry/);
    expect(rootManifest.scripts?.["proof:private"]).toBe("pnpm check && pnpm proof:pack");
  });
});
