import { describe, expect, it } from "vitest";
import { parseClawManifest } from "./schema.js";

const manifest = { schemaVersion: 1, agent: { id: "travel-planner" } };

describe("Claw categories", () => {
  it("preserves optional portable category slugs", () => {
    const parsed = parseClawManifest({ ...manifest, categories: ["travel", "personal"] });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.manifest.categories).toEqual(["travel", "personal"]);
    }
    expect(parseClawManifest(manifest).ok).toBe(true);
    expect(parseClawManifest({ ...manifest, categories: ["custom"] }).ok).toBe(true);
  });

  it.each([
    { categories: [] },
    { categories: ["travel", "travel"] },
    { categories: ["Travel"] },
    { categories: ["travel", "personal", "health", "research"] },
  ])("rejects invalid category declarations %j", ({ categories }) => {
    const parsed = parseClawManifest({ ...manifest, categories });
    expect(parsed.ok).toBe(false);
    expect(
      parsed.diagnostics.some((diagnostic) => diagnostic.path?.startsWith("$.categories")),
    ).toBe(true);
  });
});
