#!/usr/bin/env node
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { getHarnessAdapter } from "./adapters.js";
import { PrototypeDiagnosticsError, PrototypeError } from "./errors.js";
import { inspectLocalPackage } from "./source.js";
import {
  OUTCOME_SCHEMA_VERSION,
  PROTOTYPE_STABILITY,
  type CliOutcome,
  type FailureOutcome,
  type SuccessOutcome,
} from "./types.js";

const usage = `Private standalone Claw CLI prototype

Usage:
  node dist/src/cli.js inspect <local-package> [--json]
  node dist/src/cli.js preview <local-package> --agent <harness> --dry-run [--json]

No public package or executable name has been selected.`;

type Io = {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
};

function failure(operation: "inspect" | "preview", error: unknown): FailureOutcome {
  if (error instanceof PrototypeDiagnosticsError) {
    return {
      schemaVersion: OUTCOME_SCHEMA_VERSION,
      stability: PROTOTYPE_STABILITY,
      operation,
      ok: false,
      diagnostics: error.diagnostics,
    };
  }
  const diagnostic =
    error instanceof PrototypeError
      ? error.diagnostic
      : {
          code: "internal_error",
          phase: "source" as const,
          message: error instanceof Error ? error.message : String(error),
        };
  return {
    schemaVersion: OUTCOME_SCHEMA_VERSION,
    stability: PROTOTYPE_STABILITY,
    operation,
    ok: false,
    diagnostics: [diagnostic],
  };
}

function success(
  operation: "inspect" | "preview",
  inspected: Awaited<ReturnType<typeof inspectLocalPackage>>,
): SuccessOutcome {
  return {
    schemaVersion: OUTCOME_SCHEMA_VERSION,
    stability: PROTOTYPE_STABILITY,
    operation,
    ok: true,
    source: inspected.source,
    claw: inspected.claw,
    diagnostics: [],
  };
}

function renderHuman(outcome: CliOutcome): string {
  if (!outcome.ok) {
    return outcome.diagnostics
      .map((entry) => `${entry.code}: ${entry.message}${entry.path ? ` (${entry.path})` : ""}`)
      .join("\n");
  }
  return [
    `${outcome.claw.agent.name ?? outcome.claw.agent.id} (${outcome.source.packageName}@${outcome.source.packageVersion})`,
    `agent: ${outcome.claw.agent.id}`,
    `portable prompt: ${outcome.claw.hasPortablePrompt ? "yes" : "no"}`,
    `integrity: ${outcome.source.integrity}`,
  ].join("\n");
}

export async function runCli(
  argv: string[],
  io: Io = { stdout: process.stdout, stderr: process.stderr },
): Promise<number> {
  const command = argv[0];
  if (command !== "inspect" && command !== "preview") {
    io.stderr.write(`${usage}\n`);
    return 2;
  }

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv.slice(1),
      allowPositionals: true,
      strict: true,
      options: {
        agent: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        json: { type: "boolean", default: false },
      },
    });
  } catch (error) {
    const outcome = failure(
      command,
      new PrototypeError(
        "invalid_arguments",
        "arguments",
        error instanceof Error ? error.message : String(error),
      ),
    );
    const output = argv.includes("--json")
      ? JSON.stringify(outcome, null, 2)
      : renderHuman(outcome);
    io.stderr.write(`${output}\n`);
    return 2;
  }

  const source = parsed.positionals[0];
  let outcome: CliOutcome;
  try {
    if (!source || parsed.positionals.length !== 1) {
      throw new PrototypeError(
        "invalid_arguments",
        "arguments",
        "Provide exactly one local Claw package directory.",
      );
    }
    const inspected = await inspectLocalPackage(source);
    if (command === "preview") {
      const agent = parsed.values.agent;
      if (typeof agent !== "string" || !agent) {
        throw new PrototypeError(
          "missing_adapter",
          "arguments",
          "Preview requires --agent <harness>.",
        );
      }
      if (!parsed.values["dry-run"]) {
        throw new PrototypeError(
          "dry_run_required",
          "arguments",
          "The private prototype supports preview only with --dry-run.",
        );
      }
      await getHarnessAdapter(agent).preview({ package: inspected, dryRun: true });
    }
    outcome = success(command, inspected);
  } catch (error) {
    outcome = failure(command, error);
  }

  const output = parsed.values.json ? JSON.stringify(outcome, null, 2) : renderHuman(outcome);
  (outcome.ok ? io.stdout : io.stderr).write(`${output}\n`);
  return outcome.ok ? 0 : outcome.diagnostics[0]?.phase === "adapter" ? 3 : 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}
