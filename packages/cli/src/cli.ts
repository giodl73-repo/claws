#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { applyWithHarness, previewWithHarness } from "./adapters.js";
import { createClawPackage, type CreateClawOptions } from "./create.js";
import { CliError } from "./errors.js";
import { inspectClawSource } from "./source-providers.js";
import {
  defaultTerminalUi,
  formatClawSummary,
  formatHarnessPlan,
  TUI_CANCELLED,
  type TerminalUi,
  withSpinner,
} from "./tui.js";
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
  claws-dev create [output] [--id <agent-id> --name <name> --description <text> --soul <SOUL.md>] [options]
  claws-dev inspect <source> [--json]
  claws-dev <source> --agent openclaw
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

In a terminal, the default command previews the host plan and asks before apply.
Missing create identity options are prompted. Explicit execution flags retain
their non-interactive output contract.

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
    interactive?: boolean;
    ui?: TerminalUi;
  } = {},
): Promise<number> {
  const io = options.io ?? { stdout: process.stdout, stderr: process.stderr };
  const env = options.env ?? process.env;
  const explicitExecution = argv.includes("--dry-run") || argv.includes("--yes");
  const interactive =
    !argv.includes("--json") &&
    !explicitExecution &&
    (options.interactive ??
      (options.io === undefined && process.stdin.isTTY === true && process.stdout.isTTY === true));
  const ui = options.ui ?? defaultTerminalUi;
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
      if (parsed.positionals.length > 1) {
        throw new CliError({
          code: "invalid_create_arguments",
          phase: "arguments",
          message: "create accepts only one output directory.",
        });
      }
      let output = parsed.positionals[0];
      let agentId = parsed.values.id;
      let name = parsed.values.name;
      let description = parsed.values.description;
      let soulPath = parsed.values.soul;
      if (interactive) {
        ui.intro();
        const prompt = async (
          current: string | undefined,
          message: string,
          placeholder: string,
        ): Promise<string> => {
          const value = current ?? (await ui.text({ message, placeholder }));
          if (value === TUI_CANCELLED) {
            throw TUI_CANCELLED;
          }
          return value;
        };
        output = await prompt(output, "Where should the Claw be created?", "./my-claw");
        agentId = await prompt(agentId, "Agent id", "financial-analyst");
        name = await prompt(name, "Agent name", "Financial Analyst");
        description = await prompt(
          description,
          "What does this agent do?",
          "Analyzes companies from primary sources.",
        );
        soulPath = await prompt(soulPath, "Existing SOUL.md to embed in CLAW.md", "./SOUL.md");
      }
      if (
        !output ||
        typeof agentId !== "string" ||
        typeof name !== "string" ||
        typeof description !== "string" ||
        typeof soulPath !== "string"
      ) {
        throw new CliError({
          code: "invalid_create_arguments",
          phase: "arguments",
          message:
            "create requires one output directory plus --id, --name, --description, and --soul.",
        });
      }
      const create = dependencies.create ?? createClawPackage;
      const createOptions = {
        output,
        agentId,
        name,
        description,
        soulPath,
        ...(typeof parsed.values.agents === "string" ? { agentsPath: parsed.values.agents } : {}),
        ...(typeof parsed.values.package === "string"
          ? { packageName: parsed.values.package }
          : {}),
        ...(typeof parsed.values.version === "string" ? { version: parsed.values.version } : {}),
        ...(parsed.values.skill ? { skills: parsed.values.skill } : {}),
        ...(parsed.values.plugin ? { plugins: parsed.values.plugin } : {}),
      } satisfies CreateClawOptions;
      const claw = interactive
        ? await withSpinner(ui, "Constructing Claw…", "Claw package validated", () =>
            create(createOptions),
          )
        : await create(createOptions);
      outcome = success("create", claw);
      if (interactive) {
        ui.note(formatClawSummary(claw), "Claw Created");
        ui.outro(`Created ${claw.source.packageName}@${claw.source.packageVersion}`);
        return 0;
      }
    } catch (error) {
      if (interactive && error === TUI_CANCELLED) {
        ui.cancel("Claw creation cancelled");
        return 0;
      }
      outcome = failure("create", error);
    }
    if (interactive && !outcome.ok) {
      ui.cancel(renderHuman(outcome));
      return 2;
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
  let activeOperation: "create" | "inspect" | "preview" | "apply" = operation;
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
      if (interactive) {
        ui.intro();
      }
      const claw = interactive
        ? await withSpinner(ui, "Inspecting Claw…", "Claw package validated", () =>
            dependencies.inspect(source),
          )
        : await dependencies.inspect(source);
      outcome = success("inspect", claw);
      if (interactive) {
        ui.note(formatClawSummary(claw), "Claw Package");
        ui.outro("Inspection complete");
        return 0;
      }
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
      const interactiveApply = interactive && !dryRun && !yes;
      const planIntegrity = parsed.values["plan-integrity"];
      const consentPlanIntegrity = typeof planIntegrity === "string" ? planIntegrity : undefined;
      if (!interactiveApply && dryRun === yes) {
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
      if (interactive) {
        ui.intro();
      }
      const claw = interactive
        ? await withSpinner(ui, "Resolving Claw…", "Claw package validated", () =>
            dependencies.inspect(source),
          )
        : await dependencies.inspect(source);
      if (interactive) {
        ui.note(formatClawSummary(claw), "Claw Package");
      }
      if (dryRun || interactiveApply) {
        activeOperation = "preview";
        const preview = interactive
          ? await withSpinner(ui, "Preparing host plan…", "Host plan ready", () =>
              dependencies.preview(harness, claw),
            )
          : await dependencies.preview(harness, claw);
        outcome = success("preview", claw, preview);
        if (interactive) {
          ui.note(formatHarnessPlan(preview.outcome), `${harness} Apply Plan`);
        }
        if (dryRun) {
          if (interactive) {
            const integrity = harnessPlanIntegrity(outcome);
            ui.outro(integrity ? `Preview complete · ${integrity}` : "Preview complete");
            return 0;
          }
        } else {
          const integrity = harnessPlanIntegrity(outcome);
          if (!integrity) {
            throw new CliError({
              code: "adapter_plan_integrity_missing",
              phase: "adapter",
              message: "The harness preview did not return a consent plan integrity.",
              path: harness,
            });
          }
          const confirmed = await ui.confirm(`Apply this Claw to ${harness}?`);
          if (confirmed === TUI_CANCELLED || !confirmed) {
            ui.cancel("No changes applied");
            return 0;
          }
          activeOperation = "apply";
          const applied = await withSpinner(ui, "Applying Claw…", "Claw applied", () =>
            dependencies.apply(harness, claw, integrity),
          );
          outcome = success("apply", claw, applied);
          ui.outro(`${claw.summary.agent.name ?? claw.summary.agent.id} is ready`);
          return 0;
        }
      } else {
        activeOperation = "apply";
        outcome = success(
          "apply",
          claw,
          await dependencies.apply(harness, claw, consentPlanIntegrity!),
        );
      }
    }
  } catch (error) {
    outcome = failure(activeOperation, error);
  }

  if (interactive && !outcome.ok) {
    ui.cancel(renderHuman(outcome));
    return outcome.diagnostics[0]?.phase === "adapter" ? 3 : 2;
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
