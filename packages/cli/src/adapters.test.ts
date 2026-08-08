import { randomBytes } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
const codexFixture = resolve("packages", "cli", "test", "fixtures", "codex-basic");

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
    expect(timeoutMs).toBe(300_000);
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

  it("dispatches preview and apply through the Codex workspace adapter", async () => {
    const claw = await inspectLocalPackage(codexFixture);
    const parent = await mkdtemp(join(tmpdir(), "claws-codex-dispatch-test-"));
    const target = join(parent, "workspace");

    try {
      const preview = await previewWithHarness("codex", claw, undefined, process.env, { target });
      const plan = preview.outcome as { planIntegrity: string };
      const applied = await applyWithHarness(
        "codex",
        claw,
        plan.planIntegrity,
        undefined,
        process.env,
        { target },
      );

      expect(preview).toMatchObject({
        id: "codex",
        outcome: { ready: true, target: resolve(target) },
      });
      expect(applied).toMatchObject({
        id: "codex",
        outcome: { status: "complete", target: resolve(target) },
      });
      await expect(readFile(join(target, "AGENTS.md"), "utf8")).resolves.toContain(
        "Review code for correctness",
      );
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("previews one portable package through OpenClaw and Codex host adapters", async () => {
    const claw = await inspectLocalPackage(codexFixture);
    const parent = await mkdtemp(join(tmpdir(), "claws-cross-harness-test-"));
    const target = join(parent, "workspace");
    const run = vi.fn<AdapterRuntime["run"]>().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ schemaVersion: "openclaw.clawAddPlan.v1", ready: true }),
      stderr: "",
    });

    try {
      const [openclaw, codex] = await Promise.all([
        previewWithHarness("openclaw", claw, { run }),
        previewWithHarness("codex", claw, undefined, process.env, { target }),
      ]);

      expect(openclaw).toMatchObject({
        id: "openclaw",
        outcome: { schemaVersion: "openclaw.clawAddPlan.v1", ready: true },
      });
      expect(codex).toMatchObject({
        id: "codex",
        outcome: { schemaVersion: "claw.codexWorkspacePlan.v0", ready: true },
      });
      expect(run).toHaveBeenCalledOnce();
      await expect(access(target)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
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

  it.each([
    [
      "openclaw: Node.js >=24.15.0 <25 is required (current: v24.14.0).",
      "incompatible_openclaw_runtime",
    ],
    ["error: unknown command 'claws'", "openclaw_claws_unsupported"],
    ["OpenClaw config is invalid", "openclaw_config_invalid"],
  ])("classifies non-JSON OpenClaw failures: %s", async (stderr, code) => {
    const claw = await inspectLocalPackage(validFixture);
    const run = vi.fn<AdapterRuntime["run"]>().mockResolvedValue({
      exitCode: 1,
      stdout: "",
      stderr,
    });

    await expect(previewWithHarness("openclaw", claw, { run })).rejects.toMatchObject({
      diagnostics: [{ code, phase: "adapter" }],
    });
  });

  it.runIf(process.platform === "win32")(
    "discovers an installed OpenClaw command shim on Windows PATH",
    async () => {
      const root = await mkdtemp(join(tmpdir(), "claws-openclaw-shim-test-"));
      const shim = join(root, "openclaw.cmd");
      await writeFile(shim, "@exit /b 0\r\n", "utf8");
      const claw = await inspectLocalPackage(validFixture);
      const run = vi.fn<AdapterRuntime["run"]>().mockResolvedValue({
        exitCode: 0,
        stdout: "{}",
        stderr: "",
      });

      try {
        await previewWithHarness(
          "openclaw",
          claw,
          { run },
          {
            Path: root,
            ComSpec: "C:\\Windows\\System32\\cmd.exe",
          },
        );

        const [command, args, childEnv, , , windowsVerbatimArguments] = run.mock.calls[0] ?? [];
        expect(command).toBe("C:\\Windows\\System32\\cmd.exe");
        expect(args?.slice(0, 3)).toEqual(["/d", "/s", "/c"]);
        expect(args?.[3]).toContain('"%OPENCLAW_CLAWS_ARG_0%"');
        expect(childEnv?.OPENCLAW_CLAWS_ARG_0).toBe(shim);
        expect(childEnv?.OPENCLAW_CLAWS_ARG_1).toBe("claws");
        expect(childEnv?.OPENCLAW_CLAWS_ARG_2).toBe("add");
        expect(windowsVerbatimArguments).toBe(true);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it.runIf(process.platform === "win32")(
    "preserves percent signs while executing an installed Windows command shim",
    async () => {
      const parent = await mkdtemp(join(tmpdir(), "claws-openclaw-percent-test-"));
      const root = join(parent, "percent-%CLAW_TEST_EXPANDED%");
      await mkdir(root);
      const shim = join(root, "openclaw.cmd");
      await writeFile(shim, "@echo {}\r\n", "utf8");
      const claw = await inspectLocalPackage(validFixture);

      try {
        await expect(
          previewWithHarness("openclaw", claw, undefined, {
            Path: root,
            ComSpec: "C:\\Windows\\System32\\cmd.exe",
            CLAW_TEST_EXPANDED: "corrupted",
          }),
        ).resolves.toMatchObject({ outcome: {} });
      } finally {
        await rm(parent, { recursive: true, force: true });
      }
    },
  );

  it.runIf(process.platform === "win32")(
    "rejects quotes before invoking a Windows command shim",
    async () => {
      const root = await mkdtemp(join(tmpdir(), "claws-openclaw-quote-test-"));
      const shim = join(root, "openclaw.cmd");
      await writeFile(shim, "@echo {}\r\n", "utf8");
      const claw = await inspectLocalPackage(validFixture);

      try {
        await expect(
          applyWithHarness("openclaw", claw, 'x" & echo injected & rem "', undefined, {
            Path: root,
            ComSpec: "C:\\Windows\\System32\\cmd.exe",
          }),
        ).rejects.toMatchObject({
          diagnostics: [{ code: "unsafe_openclaw_invocation", phase: "adapter" }],
        });
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

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

  it("delegates a portable CLAW.md body for OpenClaw to map to SOUL.md", async () => {
    const claw = await inspectLocalPackage(bodyOnlyFixture);
    let delegatedRoot: string | undefined;
    const run = vi.fn<AdapterRuntime["run"]>().mockImplementation(async (_command, args) => {
      delegatedRoot = args[3];
      await expect(readFile(resolve(delegatedRoot!, "CLAW.md"), "utf8")).resolves.toContain(
        "Provide concise, evidence-backed assistance.",
      );
      return { exitCode: 0, stdout: JSON.stringify({ dryRun: true }), stderr: "" };
    });

    await expect(previewWithHarness("openclaw", claw, { run })).resolves.toEqual({
      id: "openclaw",
      outcome: { dryRun: true },
    });
    expect(run).toHaveBeenCalledOnce();
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

  it("distinguishes non-mutating preview timeouts from uncertain apply timeouts", async () => {
    const preview = runAdapterProcess(
      process.execPath,
      ["-e", "setInterval(() => {}, 1_000)"],
      process.env,
      undefined,
      50,
    );
    const apply = runAdapterProcess(
      process.execPath,
      ["-e", "setInterval(() => {}, 1_000)"],
      process.env,
      undefined,
      50,
      false,
      true,
    );

    await expect(preview).rejects.toMatchObject({
      diagnostics: [{ message: expect.stringContaining("preview did not permit mutation") }],
    });
    await expect(apply).rejects.toMatchObject({
      diagnostics: [{ message: expect.stringContaining("mutation may be partial") }],
    });
  });
});
