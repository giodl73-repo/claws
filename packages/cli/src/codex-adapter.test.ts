import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyCodexWorkspace, previewCodexWorkspace } from "./codex-adapter.js";
import { inspectLocalPackage } from "./source.js";

const fixture = resolve("packages", "cli", "test", "fixtures", "codex-basic");
const blockedFixture = resolve("packages", "cli", "test", "fixtures", "openclaw-basic");
const temporaryRoots: string[] = [];

async function targetPath(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "claws-codex-adapter-test-"));
  temporaryRoots.push(parent);
  return join(parent, "workspace");
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Codex workspace adapter", () => {
  it("previews portable instructions and assets while ignoring a foreign profile", async () => {
    const claw = await inspectLocalPackage(fixture);
    const target = await targetPath();

    const first = await previewCodexWorkspace(claw, target);
    const second = await previewCodexWorkspace(claw, target);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schemaVersion: "claw.codexWorkspacePlan.v0",
      ready: true,
      target: resolve(target),
      ignoredProfiles: ["profiles/openclaw.yml"],
      blockers: [],
      actions: [
        { action: "write", path: "AGENTS.md" },
        { action: "write", path: "schemas/review.schema.json" },
      ],
    });
    expect(first.planIntegrity).toMatch(/^sha256:[0-9a-f]{64}$/);
    await expect(access(target)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("applies the exact reviewed plan into a new Codex workspace", async () => {
    const claw = await inspectLocalPackage(fixture);
    const target = await targetPath();
    const plan = await previewCodexWorkspace(claw, target);

    const result = await applyCodexWorkspace(claw, target, plan.planIntegrity);

    expect(result).toEqual({
      schemaVersion: "claw.codexWorkspaceResult.v0",
      status: "complete",
      target: resolve(target),
      filesWritten: 2,
      planIntegrity: plan.planIntegrity,
    });
    const agents = await readFile(join(target, "AGENTS.md"), "utf8");
    expect(agents).toContain("Review code for correctness, security, and missing tests.");
    expect(agents).toContain("## Operating Instructions");
    expect(agents).toContain("Inspect adjacent code and tests before changing behavior.");
    await expect(
      readFile(join(target, "schemas", "review.schema.json"), "utf8"),
    ).resolves.toContain('"findings"');
  });

  it("rejects stale consent without creating the target", async () => {
    const claw = await inspectLocalPackage(fixture);
    const target = await targetPath();

    await expect(
      applyCodexWorkspace(claw, target, `sha256:${"0".repeat(64)}`),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "codex_plan_changed", phase: "adapter" }],
    });
    await expect(access(target)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails closed when the package requires unsupported host behavior", async () => {
    const claw = await inspectLocalPackage(blockedFixture);
    const target = await targetPath();
    const plan = await previewCodexWorkspace(claw, target);

    expect(plan.ready).toBe(false);
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "codex_package_bootstrap_unsupported" }),
      ]),
    );
    await expect(applyCodexWorkspace(claw, target, plan.planIntegrity)).rejects.toMatchObject({
      diagnostics: [{ code: "codex_plan_blocked", phase: "adapter" }],
    });
    await expect(access(target)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("blocks workspace paths nested beneath the generated AGENTS.md file", async () => {
    const claw = await inspectLocalPackage(fixture);
    const target = await targetPath();
    const conflicting = {
      ...claw,
      manifest: {
        ...claw.manifest,
        workspace: {
          ...claw.manifest.workspace,
          files: [
            ...claw.manifest.workspace.files,
            { source: "assets/review.schema.json", path: "AGENTS.md/extra.json" },
          ],
        },
      },
    };

    const plan = await previewCodexWorkspace(conflicting, target);

    expect(plan).toMatchObject({
      ready: false,
      blockers: [{ code: "codex_agents_target_conflict", path: "AGENTS.md/extra.json" }],
    });
    await expect(
      applyCodexWorkspace(conflicting, target, plan.planIntegrity),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "codex_plan_blocked", phase: "adapter" }],
    });
    await expect(access(target)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("normalizes portable path separators before preview and apply", async () => {
    const claw = await inspectLocalPackage(fixture);
    const target = await targetPath();
    const withWindowsPath = {
      ...claw,
      manifest: {
        ...claw.manifest,
        workspace: {
          ...claw.manifest.workspace,
          files: claw.manifest.workspace.files.map((file) => ({
            ...file,
            path: file.path.replaceAll("/", "\\"),
          })),
        },
      },
    };

    const plan = await previewCodexWorkspace(withWindowsPath, target);
    expect(plan.actions).toContainEqual(
      expect.objectContaining({ path: "schemas/review.schema.json" }),
    );

    await applyCodexWorkspace(withWindowsPath, target, plan.planIntegrity);
    await expect(
      readFile(join(target, "schemas", "review.schema.json"), "utf8"),
    ).resolves.toContain('"findings"');
  });

  it("never overlays an existing target directory", async () => {
    const claw = await inspectLocalPackage(fixture);
    const target = await targetPath();
    await mkdir(target);

    await expect(previewCodexWorkspace(claw, target)).rejects.toMatchObject({
      diagnostics: [{ code: "codex_target_exists", phase: "adapter" }],
    });
  });

  it("fails closed if the target appears after consent", async () => {
    const claw = await inspectLocalPackage(fixture);
    const target = await targetPath();
    const plan = await previewCodexWorkspace(claw, target);
    await mkdir(target);
    await writeFile(join(target, "owned.txt"), "keep\n");

    await expect(applyCodexWorkspace(claw, target, plan.planIntegrity)).rejects.toMatchObject({
      diagnostics: [{ code: "codex_target_exists", phase: "adapter" }],
    });
    await expect(readFile(join(target, "owned.txt"), "utf8")).resolves.toBe("keep\n");
    await expect(access(join(target, "AGENTS.md"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
