import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectLocalPackage } from "./source.js";

const fixture = (name: string) => resolve("packages", "cli", "test", "fixtures", name);

describe("standalone local Claw package inspection", () => {
  it("returns a normalized content-free inspection", async () => {
    const result = await inspectLocalPackage(fixture("valid"));

    expect(result).toMatchObject({
      source: {
        kind: "local-package",
        packageName: "@example/incident-triage-claw",
        packageVersion: "1.0.0",
        fileCount: 5,
      },
      summary: {
        agent: { id: "incident-triage", name: "Incident triage" },
        bootstrapFiles: ["AGENTS.md", "SOUL.md"],
        hasPortablePrompt: false,
        hasPackageBootstrap: false,
        profilePaths: ["profiles/openclaw.yml"],
      },
    });
    expect(JSON.stringify({ source: result.source, summary: result.summary })).not.toContain(
      "Review incoming incidents",
    );
    expect(JSON.stringify(result.summary)).not.toContain("Y29udGVudC1mcmVlLWluc3BlY3Rpb24");
    expect(result.summary.agent).not.toHaveProperty("identity");
    expect(result.source.integrity).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("returns portable schema diagnostics for malformed packages", async () => {
    const error = await inspectLocalPackage(fixture("malformed")).catch((caught) => caught);
    expect(error).toMatchObject({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: "invalid_manifest", phase: "package" }),
      ]),
    });
  });

  it("rejects remote-looking sources without resolving them", async () => {
    await expect(inspectLocalPackage("@example/remote-claw@1.0.0")).rejects.toMatchObject({
      diagnostics: [{ code: "unsupported_source", phase: "source" }],
    });
  });

  it("inspects only the declared payload and ignores workspace dependencies", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "claw-cli-payload-"));
    try {
      await cp(fixture("valid"), root, { recursive: true });
      await mkdir(resolve(root, "node_modules", "unrelated"), { recursive: true });
      await writeFile(resolve(root, "node_modules", "unrelated", "large-build-output.js"), "x");

      const [original, installedWorkspace] = await Promise.all([
        inspectLocalPackage(fixture("valid")),
        inspectLocalPackage(root),
      ]);

      expect(installedWorkspace.source).toMatchObject({
        fileCount: original.source.fileCount,
        byteLength: original.source.byteLength,
        integrity: original.source.integrity,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns a structured diagnostic for malformed JSON manifests", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "claw-cli-json-"));
    try {
      await writeFile(
        resolve(root, "package.json"),
        JSON.stringify({
          name: "@example/malformed-json-claw",
          version: "1.0.0",
          openclaw: { claw: "claw.json" },
        }),
      );
      await writeFile(resolve(root, "claw.json"), "{");

      await expect(inspectLocalPackage(root)).rejects.toMatchObject({
        diagnostics: [{ code: "invalid_claw_manifest", phase: "package", path: "claw.json" }],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not treat noncanonical Markdown filenames as CLAW.md", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "claw-cli-markdown-name-"));
    try {
      await writeFile(
        resolve(root, "package.json"),
        JSON.stringify({
          name: "@example/noncanonical-markdown-claw",
          version: "1.0.0",
          openclaw: { claw: "manifest.md" },
        }),
      );
      await writeFile(resolve(root, "manifest.md"), "---\nschemaVersion: 1\n---\n");

      await expect(inspectLocalPackage(root)).rejects.toMatchObject({
        diagnostics: [{ code: "invalid_claw_manifest", phase: "package", path: "manifest.md" }],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("recognizes an explicitly declared case-variant CLAW.md filename", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "claw-cli-markdown-case-"));
    try {
      await writeFile(
        resolve(root, "package.json"),
        JSON.stringify({
          name: "@example/case-variant-claw",
          version: "1.0.0",
          openclaw: { claw: "claw.md" },
        }),
      );
      await writeFile(
        resolve(root, "claw.md"),
        "---\nschemaVersion: 1\nagent:\n  id: case-variant\n---\n",
      );

      await expect(inspectLocalPackage(root)).resolves.toMatchObject({
        summary: { agent: { id: "case-variant" } },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects competing CLAW.md body and SOUL.md sources", async () => {
    await expect(inspectLocalPackage(fixture("portable-minimal"))).rejects.toMatchObject({
      diagnostics: [
        {
          code: "claw_body_soul_conflict",
          phase: "package",
          path: "$.workspace",
        },
      ],
    });
  });

  it("integrity-binds conventional profiles and package-root bootstrap", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "claw-cli-v1-layers-"));
    try {
      await cp(fixture("valid"), root, { recursive: true });
      await writeFile(resolve(root, "BOOTSTRAP.md"), "# First run\n\nAsk how I work.\n");
      await writeFile(resolve(root, "profiles", "codex.yml"), "schemaVersion: 1\n");
      const first = await inspectLocalPackage(root);
      expect(first.summary).toMatchObject({
        hasPackageBootstrap: true,
        profilePaths: ["profiles/codex.yml", "profiles/openclaw.yml"],
      });
      expect(first.payload.map((entry) => entry.path)).toEqual(
        expect.arrayContaining(["BOOTSTRAP.md", "profiles/codex.yml", "profiles/openclaw.yml"]),
      );

      await writeFile(resolve(root, "profiles", "codex.yml"), "schemaVersion: 1\nmode: project\n");
      const changed = await inspectLocalPackage(root);
      expect(changed.source.integrity).not.toBe(first.source.integrity);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects retired profile pointers with migration guidance", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "claw-cli-profile-pointer-"));
    try {
      await cp(fixture("valid"), root, { recursive: true });
      const manifestPath = resolve(root, "CLAW.md");
      const manifest = await readFile(manifestPath, "utf8");
      await writeFile(
        manifestPath,
        manifest.replace(
          "workspace:\n",
          "metadata:\n  openclaw.config: profiles/openclaw.yml\nworkspace:\n",
        ),
      );
      await expect(inspectLocalPackage(root)).rejects.toMatchObject({
        diagnostics: [
          expect.objectContaining({
            code: "legacy_openclaw_profile_pointer",
            path: "$.metadata.openclaw.config",
          }),
        ],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects empty bootstrap and nonconventional profile names", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "claw-cli-invalid-layers-"));
    try {
      await cp(fixture("valid"), root, { recursive: true });
      await writeFile(resolve(root, "BOOTSTRAP.md"), " \n");
      await expect(inspectLocalPackage(root)).rejects.toMatchObject({
        diagnostics: [expect.objectContaining({ code: "package_bootstrap_invalid" })],
      });
      await rm(resolve(root, "BOOTSTRAP.md"));
      await writeFile(resolve(root, "profiles", "OpenClaw.yaml"), "schemaVersion: 1\n");
      await expect(inspectLocalPackage(root)).rejects.toMatchObject({
        diagnostics: [expect.objectContaining({ code: "invalid_harness_profile_path" })],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.skipIf(process.platform === "win32")(
    "rejects a symlinked profiles directory before enumerating it",
    async () => {
      const root = await mkdtemp(resolve(tmpdir(), "claw-cli-profile-symlink-"));
      const external = await mkdtemp(resolve(tmpdir(), "claw-cli-external-profiles-"));
      try {
        await cp(fixture("valid"), root, { recursive: true });
        await rm(resolve(root, "profiles"), { recursive: true });
        await writeFile(resolve(external, "private.yml"), "schemaVersion: 1\n");
        await symlink(external, resolve(root, "profiles"), "dir");

        await expect(inspectLocalPackage(root)).rejects.toMatchObject({
          diagnostics: [
            {
              code: "unsafe_harness_profile",
              phase: "package",
              path: "profiles",
            },
          ],
        });
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(external, { recursive: true, force: true });
      }
    },
  );

  it("reserves root BOOTSTRAP.md for native seed-once onboarding", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "claw-cli-bootstrap-target-"));
    try {
      await cp(fixture("valid"), root, { recursive: true });
      const manifestPath = resolve(root, "CLAW.md");
      const manifest = await readFile(manifestPath, "utf8");
      await writeFile(
        manifestPath,
        manifest.replace(
          "  bootstrapFiles:\n",
          "  files:\n    - source: workspace/AGENTS.md\n      path: BOOTSTRAP.md\n  bootstrapFiles:\n",
        ),
      );
      await expect(inspectLocalPackage(root)).rejects.toMatchObject({
        diagnostics: [expect.objectContaining({ code: "invalid_manifest" })],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
