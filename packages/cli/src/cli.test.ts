import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runCli } from "./cli.js";
import { CliError } from "./errors.js";
import { inspectLocalPackage } from "./source.js";
import { TUI_CANCELLED, type TerminalUi } from "./tui.js";

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

function terminalUi(answers: Array<string | boolean | typeof TUI_CANCELLED> = []) {
  const events: string[] = [];
  const next = () => {
    const answer = answers.shift();
    if (answer === undefined) {
      throw new Error("Missing terminal UI answer.");
    }
    return answer;
  };
  const ui: TerminalUi = {
    intro: () => events.push("intro"),
    spinner: () => ({
      start: (message) => events.push(`spinner:start:${message}`),
      stop: (message) => events.push(`spinner:stop:${message}`),
    }),
    note: (message, title) => events.push(`note:${title}:${message}`),
    text: async ({ message }) => {
      events.push(`text:${message}`);
      const answer = next();
      if (typeof answer !== "string" && answer !== TUI_CANCELLED) {
        throw new Error(`Expected a text answer for ${message}.`);
      }
      return answer;
    },
    confirm: async (message) => {
      events.push(`confirm:${message}`);
      const answer = next();
      if (typeof answer !== "boolean" && answer !== TUI_CANCELLED) {
        throw new Error(`Expected a confirmation answer for ${message}.`);
      }
      return answer;
    },
    cancel: (message) => events.push(`cancel:${message}`),
    outro: (message) => events.push(`outro:${message}`),
  };
  return { ui, events };
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

  it("dispatches Claw construction without invoking a harness", async () => {
    const capture = output();
    const create = vi.fn().mockResolvedValue(await inspectLocalPackage(validFixture));
    const inspect = vi.fn();
    const preview = vi.fn();
    const apply = vi.fn();
    const exitCode = await runCli(
      [
        "create",
        "./new-claw",
        "--id",
        "analyst",
        "--name",
        "Analyst",
        "--description",
        "Analyzes evidence.",
        "--soul",
        "./SOUL.md",
        "--bootstrap",
        "./BOOTSTRAP.md",
        "--skill",
        "./skills/research",
        "--plugin",
        "clawhub:@example/plugin@1.0.0",
        "--json",
      ],
      {
        io: capture.io,
        env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
        dependencies: { create, inspect, preview, apply },
      },
    );

    expect(exitCode).toBe(0);
    expect(create).toHaveBeenCalledWith({
      output: "./new-claw",
      agentId: "analyst",
      name: "Analyst",
      description: "Analyzes evidence.",
      soulPath: "./SOUL.md",
      bootstrapPath: "./BOOTSTRAP.md",
      skills: ["./skills/research"],
      plugins: ["clawhub:@example/plugin@1.0.0"],
    });
    expect(inspect).not.toHaveBeenCalled();
    expect(preview).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(JSON.parse(capture.read().stdout)).toMatchObject({ operation: "create", ok: true });
  });

  it("prompts for missing construction inputs in an interactive terminal", async () => {
    const capture = output();
    const terminal = terminalUi([
      "./new-claw",
      "analyst",
      "Analyst",
      "Analyzes evidence.",
      "./SOUL.md",
    ]);
    const create = vi.fn().mockResolvedValue(await inspectLocalPackage(validFixture));
    const inspect = vi.fn();
    const preview = vi.fn();
    const apply = vi.fn();

    const exitCode = await runCli(["create"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { create, inspect, preview, apply },
      interactive: true,
      ui: terminal.ui,
    });

    expect(exitCode).toBe(0);
    expect(create).toHaveBeenCalledWith({
      output: "./new-claw",
      agentId: "analyst",
      name: "Analyst",
      description: "Analyzes evidence.",
      soulPath: "./SOUL.md",
    });
    expect(terminal.events).toEqual(
      expect.arrayContaining([
        "intro",
        "text:Where should the Claw be created?",
        "spinner:start:Constructing Claw…",
        expect.stringContaining("note:Claw Created:"),
        expect.stringContaining("outro:Created "),
      ]),
    );
    expect(capture.read()).toEqual({ stdout: "", stderr: "" });
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

  it("passes an explicit new workspace target to the Codex adapter", async () => {
    const capture = output();
    const target = resolve(".tmp", "codex-workspace");
    const preview = vi.fn().mockResolvedValue({
      id: "codex",
      outcome: { ready: true, planIntegrity: `sha256:${"7".repeat(64)}` },
    });
    const apply = vi.fn();

    const exitCode = await runCli(
      [validFixture, "--agent", "codex", "--target", target, "--dry-run", "--json"],
      {
        io: capture.io,
        env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
        dependencies: { inspect: inspectLocalPackage, preview, apply },
      },
    );

    expect(exitCode).toBe(0);
    expect(preview).toHaveBeenCalledWith("codex", expect.any(Object), { target });
    expect(apply).not.toHaveBeenCalled();
    expect(JSON.parse(capture.read().stdout)).toMatchObject({
      operation: "preview",
      harness: { id: "codex", outcome: { ready: true } },
    });
  });

  it("requires a Codex target before inspecting package bytes", async () => {
    const capture = output();
    const inspect = vi.fn();
    const preview = vi.fn();
    const apply = vi.fn();

    const exitCode = await runCli([validFixture, "--agent", "codex", "--dry-run", "--json"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { inspect, preview, apply },
    });

    expect(exitCode).toBe(2);
    expect(inspect).not.toHaveBeenCalled();
    expect(JSON.parse(capture.read().stderr)).toMatchObject({
      diagnostics: [{ code: "codex_target_required", phase: "arguments" }],
    });
  });

  it("previews, confirms, and applies one interactive command with the exact plan", async () => {
    const capture = output();
    const terminal = terminalUi([true]);
    const claw = await inspectLocalPackage(validFixture);
    const inspect = vi.fn().mockResolvedValue(claw);
    const planIntegrity = `sha256:${"e".repeat(64)}`;
    const preview = vi.fn().mockResolvedValue({
      id: "openclaw",
      outcome: { dryRun: true, planIntegrity, actions: [{ kind: "agent.create" }] },
    });
    const apply = vi.fn().mockResolvedValue({
      id: "openclaw",
      outcome: { schemaVersion: "openclaw.clawAddResult.v1", status: "complete" },
    });

    const exitCode = await runCli([validFixture, "--agent", "openclaw"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { inspect, preview, apply },
      interactive: true,
      ui: terminal.ui,
    });

    expect(exitCode).toBe(0);
    expect(preview).toHaveBeenCalledWith("openclaw", claw);
    expect(apply).toHaveBeenCalledWith("openclaw", claw, planIntegrity);
    expect(terminal.events).toEqual(
      expect.arrayContaining([
        expect.stringContaining("note:Claw Package:"),
        expect.stringContaining("note:openclaw Apply Plan:"),
        "confirm:Apply this Claw to openclaw?",
        "spinner:start:Applying Claw…",
        expect.stringContaining("outro:"),
      ]),
    );
    expect(capture.read()).toEqual({ stdout: "", stderr: "" });
  });

  it("leaves the harness untouched when interactive apply is declined", async () => {
    const capture = output();
    const terminal = terminalUi([false]);
    const preview = vi.fn().mockResolvedValue({
      id: "openclaw",
      outcome: { dryRun: true, planIntegrity: `sha256:${"f".repeat(64)}` },
    });
    const apply = vi.fn();

    const exitCode = await runCli([validFixture, "--agent", "openclaw"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { inspect: inspectLocalPackage, preview, apply },
      interactive: true,
      ui: terminal.ui,
    });

    expect(exitCode).toBe(0);
    expect(apply).not.toHaveBeenCalled();
    expect(terminal.events).toContain("cancel:No changes applied");
  });

  it("keeps JSON mode non-interactive even when attached to a terminal", async () => {
    const capture = output();
    const terminal = terminalUi([true]);
    const inspect = vi.fn();
    const preview = vi.fn();
    const apply = vi.fn();

    const exitCode = await runCli([validFixture, "--agent", "openclaw", "--json"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { inspect, preview, apply },
      interactive: true,
      ui: terminal.ui,
    });

    expect(exitCode).toBe(2);
    expect(inspect).not.toHaveBeenCalled();
    expect(terminal.events).toEqual([]);
    expect(JSON.parse(capture.read().stderr)).toMatchObject({
      diagnostics: [{ code: "operation_required" }],
    });
  });

  it("keeps explicit preview output non-interactive when attached to a terminal", async () => {
    const capture = output();
    const terminal = terminalUi();
    const preview = vi.fn().mockResolvedValue({ id: "openclaw", outcome: { dryRun: true } });
    const apply = vi.fn();

    const exitCode = await runCli([validFixture, "--agent", "openclaw", "--dry-run"], {
      io: capture.io,
      env: { OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      dependencies: { inspect: inspectLocalPackage, preview, apply },
      interactive: true,
      ui: terminal.ui,
    });

    expect(exitCode).toBe(0);
    expect(terminal.events).toEqual([]);
    expect(capture.read().stdout).toContain("harness preview: openclaw");
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
