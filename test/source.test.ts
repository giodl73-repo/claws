import { link, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectLocalPackage } from "../src/source.js";

const fixture = (name: string) => resolve("test", "fixtures", name);
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("local Claw package inspection", () => {
  it("returns a content-free normalized inspection", async () => {
    const result = await inspectLocalPackage(fixture("valid"));
    expect(result).toMatchObject({
      source: {
        kind: "local-package",
        packageName: "@example/incident-triage-claw",
        packageVersion: "1.0.0",
        fileCount: 4,
      },
      claw: {
        manifestPath: "CLAW.md",
        schemaVersion: 1,
        agent: { id: "incident-triage", name: "Incident triage" },
        summary: { bootstrapFiles: ["AGENTS.md", "SOUL.md"] },
        hasPortablePrompt: true,
        openClawProfilePath: "profiles/openclaw.yml",
      },
    });
    expect(JSON.stringify(result)).not.toContain("Review incoming incidents");
    expect(result.source.integrity).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it.each([
    ["malformed", "invalid_claw_manifest"],
    ["unsupported-version", "invalid_claw_manifest"],
    ["unsafe-path", "invalid_claw_manifest_path"],
  ])("rejects the %s package", async (name, code) => {
    await expect(inspectLocalPackage(fixture(name))).rejects.toMatchObject({
      diagnostics: [{ code, phase: "package" }],
    });
  });

  it("rejects remote-looking sources without resolving them", async () => {
    await expect(inspectLocalPackage("@example/remote-claw@1.0.0")).rejects.toMatchObject({
      diagnostic: { code: "unsupported_source", phase: "source" },
    });
  });

  it("rejects hardlinked package files", async () => {
    const root = await mkdtemp(join(tmpdir(), "claw-cli-hardlink-"));
    temporaryRoots.push(root);
    await mkdir(join(root, "workspace"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        name: "@example/hardlink-claw",
        version: "1.0.0",
        openclaw: { claw: "CLAW.md" },
      }),
    );
    await writeFile(join(root, "CLAW.md"), "---\nschemaVersion: 1\nagent: { id: linked }\n---\n");
    await link(join(root, "CLAW.md"), join(root, "workspace", "linked.md"));

    await expect(inspectLocalPackage(root)).rejects.toMatchObject({
      diagnostic: { code: "linked_package_entry", phase: "source" },
    });
  });
});
