import { randomBytes } from "node:crypto";
import { access, readFile, rm, utimes } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyWithHarness,
  previewWithHarness,
  runAdapterProcess,
  type AdapterRuntime,
} from "./adapters.js";
import { inspectLocalPackage } from "./source.js";

const validFixture = resolve("packages", "cli", "test", "fixtures", "valid");
const bodyOnlyFixture = resolve("packages", "cli", "test", "fixtures", "body-only");
const promptWithSoulFixture = resolve("packages", "cli", "test", "fixtures", "portable-minimal");

describe("standalone harness adapters", () => {
  beforeEach(() => {
    vi.stubEnv("OPENCLAW_CLI_ENTRY", resolve("test", "fake-openclaw.mjs"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("delegates OpenClaw preview without reproducing lifecycle policy", async () => {
    const claw = await inspectLocalPackage(validFixture);
    let delegatedRoot: string | undefined;
    const run = vi.fn<AdapterRuntime["run"]>().mockImplementation(async (_command, args) => {
      delegatedRoot = args[3];
      expect(delegatedRoot).toBeDefined();
      await expect(readFile(resolve(delegatedRoot!, "CLAW.md"), "utf8")).resolves.toContain(
        "incident-triage",
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({ schemaVersion: "openclaw.clawAddPlan.v1", dryRun: true }),
        stderr: "",
      };
    });

    const result = await previewWithHarness("openclaw", claw, { run });

    expect(result).toEqual({
      id: "openclaw",
      outcome: { schemaVersion: "openclaw.clawAddPlan.v1", dryRun: true },
    });
    expect(run).toHaveBeenCalledOnce();
    const [, args, env, cwd, timeoutMs] = run.mock.calls[0] ?? [];
    expect(args).toEqual([
      resolve("test", "fake-openclaw.mjs"),
      "claws",
      "add",
      delegatedRoot,
      "--dry-run",
      "--json",
    ]);
    expect(delegatedRoot).not.toBe(
      claw.source.kind === "local-package" ? claw.source.path : undefined,
    );
    await expect(access(delegatedRoot!)).resolves.toBeUndefined();
    expect(env?.OPENCLAW_EXPERIMENTAL_CLAWS).toBe("1");
    expect(cwd).toBe(resolve("test"));
    expect(timeoutMs).toBe(120_000);
  });

  it("delegates consented OpenClaw apply with exact plan integrity", async () => {
    const claw = await inspectLocalPackage(validFixture);
    let delegatedRoot: string | undefined;
    const planIntegrity = `sha256:${"a".repeat(64)}`;
    const run = vi.fn<AdapterRuntime["run"]>().mockImplementation(async (_command, args) => {
      delegatedRoot = args[3];
      await expect(readFile(resolve(delegatedRoot!, "CLAW.md"), "utf8")).resolves.toContain(
        "incident-triage",
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          schemaVersion: "openclaw.clawAddResult.v1",
          status: "complete",
          planIntegrity,
        }),
        stderr: "",
      };
    });

    const result = await applyWithHarness("openclaw", claw, planIntegrity, { run });

    expect(result).toEqual({
      id: "openclaw",
      outcome: {
        schemaVersion: "openclaw.clawAddResult.v1",
        status: "complete",
        planIntegrity,
      },
    });
    const [, args, , , timeoutMs] = run.mock.calls[0] ?? [];
    expect(args).toEqual([
      resolve("test", "fake-openclaw.mjs"),
      "claws",
      "add",
      delegatedRoot,
      "--yes",
      "--plan-integrity",
      planIntegrity,
      "--json",
    ]);
    expect(timeoutMs).toBe(600_000);
    await expect(access(delegatedRoot!)).resolves.toBeUndefined();
  });

  it("uses the same content-addressed host path across preview and apply", async () => {
    const claw = await inspectLocalPackage(validFixture);
    const delegatedRoots: string[] = [];
    const run = vi.fn<AdapterRuntime["run"]>().mockImplementation(async (_command, args) => {
      delegatedRoots.push(args[3]!);
      return {
        exitCode: 0,
        stdout: JSON.stringify({ planIntegrity: `sha256:${"e".repeat(64)}` }),
        stderr: "",
      };
    });

    await previewWithHarness("openclaw", claw, { run });
    await applyWithHarness("openclaw", claw, `sha256:${"e".repeat(64)}`, { run });

    expect(delegatedRoots).toHaveLength(2);
    expect(delegatedRoots[0]).toBe(delegatedRoots[1]);
    await expect(access(delegatedRoots[0]!)).resolves.toBeUndefined();
  });

  it("expires an inactive reviewed snapshot after the consent window", async () => {
    const claw = await inspectLocalPackage(validFixture);
    const roots: string[] = [];
    const run = vi.fn<AdapterRuntime["run"]>().mockImplementation(async (_command, args) => {
      roots.push(args[3]!);
      return { exitCode: 0, stdout: "{}", stderr: "" };
    });
    const withIntegrity = (integrity: string) => ({
      ...claw,
      source: { ...claw.source, integrity: `sha256:${integrity}` },
    });
    const expired = withIntegrity(randomBytes(32).toString("hex"));
    const current = withIntegrity(randomBytes(32).toString("hex"));

    try {
      await previewWithHarness("openclaw", expired, { run });
      const expiredAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
      await utimes(roots[0]!, expiredAt, expiredAt);
      await previewWithHarness("openclaw", current, { run });

      await expect(access(roots[0]!)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(access(roots[1]!)).resolves.toBeUndefined();
    } finally {
      await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
    }
  });

  it("serializes concurrent publications at the snapshot cache limit", async () => {
    const claw = await inspectLocalPackage(validFixture);
    const roots: string[] = [];
    const run = vi.fn<AdapterRuntime["run"]>().mockImplementation(async (_command, args) => {
      roots.push(args[3]!);
      return { exitCode: 0, stdout: "{}", stderr: "" };
    });
    const claws = Array.from({ length: 17 }, () => ({
      ...claw,
      source: {
        ...claw.source,
        integrity: `sha256:${randomBytes(32).toString("hex")}`,
      },
    }));

    try {
      const results = await Promise.allSettled(
        claws.map((candidate) => previewWithHarness("openclaw", candidate, { run })),
      );
      const rejected = results.filter((result) => result.status === "rejected");

      expect(new Set(roots).size).toBeLessThanOrEqual(16);
      expect(rejected.length).toBeGreaterThan(0);
      for (const result of rejected) {
        expect(result.reason).toMatchObject({
          diagnostics: [{ code: "snapshot_cache_full", phase: "adapter" }],
        });
      }
    } finally {
      await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
    }
  });

  it("fails closed for unknown harnesses", async () => {
    const claw = await inspectLocalPackage(validFixture);
    await expect(previewWithHarness("hermes", claw)).rejects.toMatchObject({
      diagnostics: [{ code: "unknown_adapter", phase: "adapter" }],
    });
  });

  it("preserves a rejected harness-native preview outcome", async () => {
    const claw = await inspectLocalPackage(validFixture);
    const outcome = {
      schemaVersion: "openclaw.clawAddPlan.v1",
      ok: false,
      blockers: [{ code: "capability_consent_required" }],
    };
    const run = vi.fn<AdapterRuntime["run"]>().mockResolvedValue({
      exitCode: 2,
      stdout: JSON.stringify(outcome),
      stderr: "",
    });

    await expect(previewWithHarness("openclaw", claw, { run })).rejects.toMatchObject({
      diagnostics: [{ code: "adapter_preview_failed", phase: "adapter" }],
      harness: { id: "openclaw", outcome },
    });
  });

  it("preserves a partial harness-native apply outcome", async () => {
    const claw = await inspectLocalPackage(validFixture);
    const outcome = {
      schemaVersion: "openclaw.clawAddResult.v1",
      status: "partial",
      error: { code: "package_install_failed" },
    };
    const run = vi.fn<AdapterRuntime["run"]>().mockResolvedValue({
      exitCode: 1,
      stdout: JSON.stringify(outcome),
      stderr: "",
    });

    await expect(
      applyWithHarness("openclaw", claw, `sha256:${"b".repeat(64)}`, { run }),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "adapter_apply_failed", phase: "adapter" }],
      harness: { id: "openclaw", outcome },
    });
  });

  it("rejects body-only prompts until the OpenClaw adapter supports them", async () => {
    const claw = await inspectLocalPackage(bodyOnlyFixture);
    const run = vi.fn<AdapterRuntime["run"]>();

    await expect(previewWithHarness("openclaw", claw, { run })).rejects.toMatchObject({
      diagnostics: [{ code: "openclaw_portable_prompt_unsupported", phase: "adapter" }],
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects portable prompts even when the package declares SOUL.md", async () => {
    const claw = await inspectLocalPackage(promptWithSoulFixture);
    const run = vi.fn<AdapterRuntime["run"]>();

    await expect(previewWithHarness("openclaw", claw, { run })).rejects.toMatchObject({
      diagnostics: [{ code: "openclaw_portable_prompt_unsupported", phase: "adapter" }],
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("classifies process launch failures as adapter failures", async () => {
    const claw = await inspectLocalPackage(validFixture);
    const run = vi
      .fn<AdapterRuntime["run"]>()
      .mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    await expect(previewWithHarness("openclaw", claw, { run })).rejects.toMatchObject({
      diagnostics: [{ code: "adapter_launch_failed", phase: "adapter" }],
    });
  });

  it("forcefully bounds a stalled harness process", async () => {
    await expect(
      runAdapterProcess(
        process.execPath,
        ["-e", "setInterval(() => {}, 1_000)"],
        process.env,
        undefined,
        50,
      ),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "adapter_timeout", phase: "adapter" }],
    });
  });
});
