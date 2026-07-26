import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
    expect(manifest.version).toBe("0.0.0-private");
    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.publishConfig).toBeUndefined();
    expect(manifest.scripts?.prepublishOnly).toContain("publication is disabled");
  });
});
