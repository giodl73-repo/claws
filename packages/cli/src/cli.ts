#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { applyWithHarness, previewWithHarness } from "./adapters.js";
import { CliError } from "./errors.js";
import { inspectClawSource } from "./remote-source.js";
import {
  INCUBATION_STABILITY,
  OUTCOME_SCHEMA_VERSION,
  type CliOutcome,
  type FailureOutcome,
  type LocalClawPackage,
  type SuccessOutcome,
} from "./types.js";

const usage = `Standalone Claw CLI incubator

Usage:
  claws-dev inspect <source> [--json]
  claws-dev <source> --agent openclaw --dry-run [--json]
  claws-dev <source> --agent openclaw --yes --plan-integrity <digest> [--json]

Sources:
  ./local-package
  clawhub:<package>@<exact-version>

Set OPENCLAW_EXPERIMENTAL_CLAWS=1 to enable this private command.`;

type Io = {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
};

type Dependencies = {
  inspect(source: string): Promise<LocalClawPackage>;
  preview(harness: string, claw: LocalClawPackage): Promise<{ id: string; outcome: unknown }>;
  apply(
    harness: string,
    claw: LocalClawPackage,
    planIntegrity: string,
  ): Promise<{ id: string; outcome: unknown }>;
};

function isExperimentalEnabled(env: NodeJS.ProcessEnv): boolean {
  const value = env.OPENCLAW_EXPERIMENTAL_CLAWS?.trim().toLowerCase();
  return value === "1" || value === "true";
}

function failure(operation: "inspect" | "preview" | "apply", error: unknown): FailureOutcome {
  const diagnostics =
    error instanceof CliError
      ? error.diagnostics
      : [
          {
            code: "internal_error",
            phase: "source" as const,
            message: error instanceof Error ? error.message : String(error),
          },
        ];
  return {
    schemaVersion: OUTCOME_SCHEMA_VERSION,
    stability: INCUBATION_STABILITY,
    operation,
    ok: false,
    ...(error instanceof CliError && error.harness ? { harness: error.harness } : {}),
    diagnostics,
  };
}

function success(
  operation: "inspect" | "preview" | "apply",
  claw: LocalClawPackage,
  harness?: { id: string; outcome: unknown },
): SuccessOutcome {
  return {
    schemaVersion: OUTCOME_SCHEMA_VERSION,
    stability: INCUBATION_STABILITY,
    operation,
    ok: true,
    package: claw.source,
    claw: claw.summary,
    ...(harness ? { harness } : {}),
    diagnostics: [],
  };
}

function harnessPlanIntegrity(outcome: SuccessOutcome): string | undefined {
  const native = outcome.harness?.outcome;
  if (!native || typeof native !== "object" || Array.isArray(native)) {
    return undefined;
  }
  const value = (native as Record<string, unknown>).planIntegrity;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function renderHuman(outcome: CliOutcome): string {
  if (!outcome.ok) {
    return outcome.diagnostics
      .map((entry) => `${entry.code}: ${entry.message}${entry.path ? ` (${entry.path})` : ""}`)
      .join("\n");
  }
  return [
    `${outcome.claw.agent.name ?? outcome.claw.agent.id} (${outcome.package.packageName}@${outcome.package.packageVersion})`,
    `agent: ${outcome.claw.agent.id}`,
    `portable prompt: ${outcome.claw.hasPortablePrompt ? "yes" : "no"}`,
    `integrity: ${outcome.package.integrity}`,
    ...(outcome.package.kind === "clawhub-package"
      ? [`artifact integrity: ${outcome.package.artifactIntegrity}`]
      : []),
    ...(outcome.harness ? [`harness ${outcome.operation}: ${outcome.harness.id}`] : []),
    ...(harnessPlanIntegrity(outcome) ? [`plan integrity: ${harnessPlanIntegrity(outcome)}`] : []),
  ].join("\n");
}

export async function runCli(
  argv: string[],
  options: {
    io?: Io;
    env?: NodeJS.ProcessEnv;
    dependencies?: Dependencies;
  } = {},
): Promise<number> {
  const io = options.io ?? { stdout: process.stdout, stderr: process.stderr };
  const env = options.env ?? process.env;
  const dependencies = options.dependencies ?? {
    inspect: (source: string) => inspectClawSource(source, { env }),
    preview: (harness: string, claw: LocalClawPackage) =>
      previewWithHarness(harness, claw, undefined, env),
    apply: (harness: string, claw: LocalClawPackage, planIntegrity: string) =>
      applyWithHarness(harness, claw, planIntegrity, undefined, env),
  };
  const inspectCommand = argv[0] === "inspect";
  const requestedApply = !inspectCommand && argv.includes("--yes");
  const operation = inspectCommand ? "inspect" : requestedApply ? "apply" : "preview";
  const args = inspectCommand ? argv.slice(1) : argv;

  if (!isExperimentalEnabled(env)) {
    const outcome = failure(
      operation,
      new CliError({
        code: "experimental_claws_disabled",
        phase: "arguments",
        message:
          "Standalone Claws are experimental. Set OPENCLAW_EXPERIMENTAL_CLAWS=1 for this process.",
      }),
    );
    io.stderr.write(
      `${argv.includes("--json") ? JSON.stringify(outcome, null, 2) : renderHuman(outcome)}\n`,
    );
    return 2;
  }

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        agent: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        yes: { type: "boolean", default: false },
        "plan-integrity": { type: "string" },
        json: { type: "boolean", default: false },
      },
    });
  } catch (error) {
    const outcome = failure(
      operation,
      new CliError({
        code: "invalid_arguments",
        phase: "arguments",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    io.stderr.write(
      `${argv.includes("--json") ? JSON.stringify(outcome, null, 2) : renderHuman(outcome)}\n`,
    );
    return 2;
  }

  let outcome: CliOutcome;
  try {
    const source = parsed.positionals[0];
    if (!source || parsed.positionals.length !== 1) {
      throw new CliError({
        code: "invalid_arguments",
        phase: "arguments",
        message: "Provide exactly one local package or exact ClawHub coordinate.",
      });
    }
    if (inspectCommand) {
      if (
        parsed.values.agent !== undefined ||
        parsed.values["dry-run"] === true ||
        parsed.values.yes === true ||
        parsed.values["plan-integrity"] !== undefined
      ) {
        throw new CliError({
          code: "invalid_arguments",
          phase: "arguments",
          message: "inspect does not accept --agent or --dry-run.",
        });
      }
      const claw = await dependencies.inspect(source);
      outcome = success("inspect", claw);
    } else {
      const harness = parsed.values.agent;
      if (typeof harness !== "string" || harness.length === 0) {
        throw new CliError({
          code: "missing_adapter",
          phase: "arguments",
          message: "Preview requires --agent <harness>.",
        });
      }
      const dryRun = parsed.values["dry-run"] === true;
      const yes = parsed.values.yes === true;
      const planIntegrity = parsed.values["plan-integrity"];
      const consentPlanIntegrity = typeof planIntegrity === "string" ? planIntegrity : undefined;
      if (dryRun === yes) {
        throw new CliError({
          code: "operation_required",
          phase: "arguments",
          message: "Choose exactly one operation: --dry-run to preview or --yes to apply.",
        });
      }
      if (dryRun && planIntegrity !== undefined) {
        throw new CliError({
          code: "unexpected_plan_integrity",
          phase: "arguments",
          message: "--plan-integrity is accepted only with --yes.",
        });
      }
      if (yes && !consentPlanIntegrity) {
        throw new CliError({
          code: "plan_integrity_required",
          phase: "arguments",
          message: "Apply requires --plan-integrity from the exact dry-run plan.",
        });
      }
      const claw = await dependencies.inspect(source);
      outcome = dryRun
        ? success("preview", claw, await dependencies.preview(harness, claw))
        : success("apply", claw, await dependencies.apply(harness, claw, consentPlanIntegrity!));
    }
  } catch (error) {
    outcome = failure(operation, error);
  }

  const output = parsed.values.json ? JSON.stringify(outcome, null, 2) : renderHuman(outcome);
  (outcome.ok ? io.stdout : io.stderr).write(`${output}\n`);
  return outcome.ok ? 0 : outcome.diagnostics[0]?.phase === "adapter" ? 3 : 2;
}

const invokedAsMain = (() => {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invokedAsMain) {
  if (process.argv.length <= 2) {
    process.stderr.write(`${usage}\n`);
    process.exitCode = 2;
  } else {
    process.exitCode = await runCli(process.argv.slice(2));
  }
}
