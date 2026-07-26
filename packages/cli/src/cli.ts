#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { applyWithHarness, previewWithHarness } from "./adapters.js";
import { createClawPackage, type CreateClawOptions } from "./create.js";
import { CliError } from "./errors.js";
import { inspectClawSource } from "./source-providers.js";
import {
  CLI_VERSION,
  INCUBATION_STABILITY,
  OUTCOME_SCHEMA_VERSION,
  type CliOutcome,
  type FailureOutcome,
  type LocalClawPackage,
  type SuccessOutcome,
} from "./types.js";

const usage = `Standalone Claw CLI incubator

Usage:
  claws-dev create <output> --id <agent-id> --name <name> --description <text> --soul <SOUL.md> [options]
  claws-dev inspect <source> [--json]
  claws-dev <source> --agent openclaw --dry-run [--json]
  claws-dev <source> --agent openclaw --yes --plan-integrity <digest> [--json]

Sources:
  ./local-package
  clawhub:<package>@<exact-version>
  github:<owner>/<repo>@<40-character-commit>[#package/path]

Create options:
  --agents <AGENTS.md>
  --skill <local-skill-directory|clawhub:package@version> (repeatable)
  --plugin <clawhub:package@version> (repeatable)
  --package <package-name> --version <exact-version>

Set OPENCLAW_EXPERIMENTAL_CLAWS=1 to enable this experimental command.`;

type Io = {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
};

type Dependencies = {
  create?(options: CreateClawOptions): Promise<LocalClawPackage>;
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

function failure(
  operation: "create" | "inspect" | "preview" | "apply",
  error: unknown,
): FailureOutcome {
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
  operation: "create" | "inspect" | "preview" | "apply",
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
    ...("artifactIntegrity" in outcome.package
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
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    io.stdout.write(`${usage}\n`);
    return 0;
  }
  if (argv.length === 1 && (argv[0] === "--version" || argv[0] === "-v")) {
    io.stdout.write(`${CLI_VERSION}\n`);
    return 0;
  }
  const dependencies = options.dependencies ?? {
    create: (createOptions: CreateClawOptions) => createClawPackage(createOptions),
    inspect: (source: string) => inspectClawSource(source, { env }),
    preview: (harness: string, claw: LocalClawPackage) =>
      previewWithHarness(harness, claw, undefined, env),
    apply: (harness: string, claw: LocalClawPackage, planIntegrity: string) =>
      applyWithHarness(harness, claw, planIntegrity, undefined, env),
  };
  const createCommand = argv[0] === "create";
  const inspectCommand = argv[0] === "inspect";
  const requestedApply = !inspectCommand && argv.includes("--yes");
  const operation = createCommand
    ? "create"
    : inspectCommand
      ? "inspect"
      : requestedApply
        ? "apply"
        : "preview";
  const args = createCommand || inspectCommand ? argv.slice(1) : argv;

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

  if (createCommand) {
    let outcome: CliOutcome;
    let json = argv.includes("--json");
    try {
      const parsed = parseArgs({
        args,
        allowPositionals: true,
        strict: true,
        options: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          soul: { type: "string" },
          agents: { type: "string" },
          package: { type: "string" },
          version: { type: "string" },
          skill: { type: "string", multiple: true },
          plugin: { type: "string", multiple: true },
          json: { type: "boolean", default: false },
        },
      });
      json = parsed.values.json === true;
      const output = parsed.positionals[0];
      if (
        !output ||
        parsed.positionals.length !== 1 ||
        typeof parsed.values.id !== "string" ||
        typeof parsed.values.name !== "string" ||
        typeof parsed.values.description !== "string" ||
        typeof parsed.values.soul !== "string"
      ) {
        throw new CliError({
          code: "invalid_create_arguments",
          phase: "arguments",
          message:
            "create requires one output directory plus --id, --name, --description, and --soul.",
        });
      }
      const create = dependencies.create ?? createClawPackage;
      const claw = await create({
        output,
        agentId: parsed.values.id,
        name: parsed.values.name,
        description: parsed.values.description,
        soulPath: parsed.values.soul,
        ...(typeof parsed.values.agents === "string" ? { agentsPath: parsed.values.agents } : {}),
        ...(typeof parsed.values.package === "string"
          ? { packageName: parsed.values.package }
          : {}),
        ...(typeof parsed.values.version === "string" ? { version: parsed.values.version } : {}),
        ...(parsed.values.skill ? { skills: parsed.values.skill } : {}),
        ...(parsed.values.plugin ? { plugins: parsed.values.plugin } : {}),
      });
      outcome = success("create", claw);
    } catch (error) {
      outcome = failure("create", error);
    }
    const output = json ? JSON.stringify(outcome, null, 2) : renderHuman(outcome);
    (outcome.ok ? io.stdout : io.stderr).write(`${output}\n`);
    return outcome.ok ? 0 : 2;
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
        message: "Provide exactly one local package or exact remote Claw coordinate.",
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
