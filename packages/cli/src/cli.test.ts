import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runCli } from "./cli.js";
import { CliError } from "./errors.js";
import { inspectLocalPackage } from "./source.js";

const validFixture = resolve("packages", "cli", "test", "fixtures", "valid");

function output() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: {
        write: (value: string | Uint8Array) => {
          stdout += value.toString();
          return true;
        },
      },
      stderr: {
        write: (value: string | Uint8Array) => {
          stderr += value.toString();
          return true;
        },
      },
    },
    read: () => ({ stdout, stderr }),
  };
}

describe("standalone Claw CLI", () => {
  it.each([
    ["--help", "Usage:"],
    ["-h", "Usage:"],
    ["--version", "0.0.0-private"],
    ["-v", "0.0.0-private"],
  ])("returns ungated %s output", async (flag, expected) => {
    const capture = output();

    const exitCode = await runCli([flag], { io: capture.io, env: {} });

    expect(exitCode).toBe(0);
    expect(capture.read().stdout).toContain(expected);
    expect(capture.read().stderr).toBe("");
  });

  it("is unavailable without the existing experimental Claws gate", async () => {
    const capture = output();
    const exitCode = await runCli(["inspect", validFixture, "--json"], {
      io: capture.io,
      env: {},
    });

    expect(exitCode).toBe(2);
    expect(JSON.parse(capture.read().stderr)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "experimental_claws_disabled" }],
    });
  });

  it("returns content-free inspection JSON", async () => {
    const capture = output();
    const exitCode = await runCli(["inspect", validFixture, "--json"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
    });

    expect(exitCode).toBe(0);
    const result = JSON.parse(capture.read().stdout);
    expect(result).toMatchObject({
      schemaVersion: "claw.cliOutcome.v0",
      stability: "private-incubation",
      operation: "inspect",
      ok: true,
      claw: { agent: { id: "incident-triage" } },
    });
    expect(capture.read().stdout).not.toContain("Review incoming incidents");
  });

  it("passes the runner environment to remote source inspection", async () => {
    const capture = output();
    const exitCode = await runCli(
      ["inspect", "clawhub:@example/incident-triage-claw@1.0.0", "--json"],
      {
        io: capture.io,
        env: {
          OPENCLAW_EXPERIMENTAL_CLAWS: "1",
          CLAWHUB_REGISTRY_URL: "http://127.0.0.1:9",
        },
      },
    );

    expect(exitCode).toBe(2);
    expect(JSON.parse(capture.read().stderr)).toMatchObject({
      diagnostics: [{ code: "clawhub_request_failed" }],
    });
  });

  it("dispatches dry-run preview through the selected adapter", async () => {
    const capture = output();
    const preview = vi.fn().mockResolvedValue({ id: "openclaw", outcome: { dryRun: true } });
    const apply = vi.fn();
    const exitCode = await runCli([validFixture, "--agent", "openclaw", "--dry-run", "--json"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { inspect: inspectLocalPackage, preview, apply },
    });

    expect(exitCode).toBe(0);
    expect(preview).toHaveBeenCalledWith(
      "openclaw",
      expect.objectContaining({ source: expect.objectContaining({ kind: "local-package" }) }),
    );
    expect(JSON.parse(capture.read().stdout)).toMatchObject({
      operation: "preview",
      harness: { id: "openclaw", outcome: { dryRun: true } },
    });
  });

  it("prints the consent digest in human preview output", async () => {
    const capture = output();
    const planIntegrity = `sha256:${"d".repeat(64)}`;
    const preview = vi.fn().mockResolvedValue({
      id: "openclaw",
      outcome: { dryRun: true, planIntegrity },
    });
    const apply = vi.fn();
    const exitCode = await runCli([validFixture, "--agent", "openclaw", "--dry-run"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { inspect: inspectLocalPackage, preview, apply },
    });

    expect(exitCode).toBe(0);
    expect(capture.read().stdout).toContain(`plan integrity: ${planIntegrity}`);
  });

  it("returns a rejected harness-native outcome with adapter diagnostics", async () => {
    const capture = output();
    const harness = { id: "openclaw", outcome: { ok: false, blockers: ["consent"] } };
    const preview = vi
      .fn()
      .mockRejectedValue(
        new CliError(
          { code: "adapter_preview_failed", phase: "adapter", message: "Rejected." },
          { harness },
        ),
      );
    const apply = vi.fn();
    const exitCode = await runCli([validFixture, "--agent", "openclaw", "--dry-run", "--json"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { inspect: inspectLocalPackage, preview, apply },
    });

    expect(exitCode).toBe(3);
    expect(JSON.parse(capture.read().stderr)).toMatchObject({
      ok: false,
      harness,
      diagnostics: [{ code: "adapter_preview_failed" }],
    });
  });

  it("dispatches consented apply with the reviewed plan integrity", async () => {
    const capture = output();
    const preview = vi.fn();
    const planIntegrity = `sha256:${"c".repeat(64)}`;
    const apply = vi.fn().mockResolvedValue({
      id: "openclaw",
      outcome: { schemaVersion: "openclaw.clawAddResult.v1", status: "complete" },
    });
    const exitCode = await runCli(
      [validFixture, "--agent", "openclaw", "--yes", "--plan-integrity", planIntegrity, "--json"],
      {
        io: capture.io,
        env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
        dependencies: { inspect: inspectLocalPackage, preview, apply },
      },
    );

    expect(exitCode).toBe(0);
    expect(apply).toHaveBeenCalledWith("openclaw", expect.any(Object), planIntegrity);
    expect(preview).not.toHaveBeenCalled();
    expect(JSON.parse(capture.read().stdout)).toMatchObject({
      operation: "apply",
      harness: { id: "openclaw", outcome: { status: "complete" } },
    });
  });

  it("rejects apply without plan integrity before source inspection", async () => {
    const capture = output();
    const inspect = vi.fn();
    const preview = vi.fn();
    const apply = vi.fn();
    const exitCode = await runCli([validFixture, "--agent", "openclaw", "--yes", "--json"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { inspect, preview, apply },
    });

    expect(exitCode).toBe(2);
    expect(inspect).not.toHaveBeenCalled();
    expect(JSON.parse(capture.read().stderr)).toMatchObject({
      operation: "apply",
      diagnostics: [{ code: "plan_integrity_required", phase: "arguments" }],
    });
  });

  it("rejects ambiguous preview and apply flags before source inspection", async () => {
    const capture = output();
    const inspect = vi.fn();
    const preview = vi.fn();
    const apply = vi.fn();
    const exitCode = await runCli(
      [validFixture, "--agent", "openclaw", "--dry-run", "--yes", "--json"],
      {
        io: capture.io,
        env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
        dependencies: { inspect, preview, apply },
      },
    );

    expect(exitCode).toBe(2);
    expect(inspect).not.toHaveBeenCalled();
    expect(JSON.parse(capture.read().stderr)).toMatchObject({
      diagnostics: [{ code: "operation_required", phase: "arguments" }],
    });
  });
});
