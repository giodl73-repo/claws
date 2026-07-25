import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";

function capture() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: {
        write(value: string | Uint8Array) {
          stdout += value.toString();
          return true;
        },
      },
      stderr: {
        write(value: string | Uint8Array) {
          stderr += value.toString();
          return true;
        },
      },
    },
    output: () => ({ stdout, stderr }),
  };
}

describe("private CLI surface", () => {
  it("prints a stable JSON inspection without prompt content", async () => {
    const sink = capture();
    const exitCode = await runCli(
      ["inspect", resolve("test", "fixtures", "valid"), "--json"],
      sink.io,
    );
    const output = sink.output();
    expect(exitCode).toBe(0);
    expect(output.stderr).toBe("");
    const value = JSON.parse(output.stdout) as Record<string, unknown>;
    expect(value).toMatchObject({
      schemaVersion: "claw.cliOutcome.v0",
      stability: "private-prototype",
      operation: "inspect",
      ok: true,
    });
    expect(output.stdout).not.toContain("Review incoming incidents");
  });

  it("reports an unknown harness adapter structurally", async () => {
    const sink = capture();
    const exitCode = await runCli(
      ["preview", resolve("test", "fixtures", "valid"), "--agent", "hermes", "--dry-run", "--json"],
      sink.io,
    );
    expect(exitCode).toBe(3);
    expect(JSON.parse(sink.output().stderr)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "unknown_adapter", phase: "adapter", path: "hermes" }],
    });
  });

  it("recognizes OpenClaw but keeps delegation out of slice 1", async () => {
    const sink = capture();
    const exitCode = await runCli(
      [
        "preview",
        resolve("test", "fixtures", "valid"),
        "--agent",
        "openclaw",
        "--dry-run",
        "--json",
      ],
      sink.io,
    );
    expect(exitCode).toBe(3);
    expect(JSON.parse(sink.output().stderr)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "adapter_not_implemented", phase: "adapter" }],
    });
  });

  it("reports argument parser failures without a stack trace", async () => {
    const sink = capture();
    const exitCode = await runCli(["inspect", "--unknown", "--json"], sink.io);
    expect(exitCode).toBe(2);
    expect(JSON.parse(sink.output().stderr)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "invalid_arguments", phase: "arguments" }],
    });
  });
});
