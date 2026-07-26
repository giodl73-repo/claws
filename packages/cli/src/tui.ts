import * as prompts from "@clack/prompts";
import pc from "picocolors";
import type { LocalClawPackage } from "./types.js";

export const TUI_CANCELLED = Symbol("tui-cancelled");

export type TerminalSpinner = {
  start(message: string): void;
  stop(message: string): void;
};

export type TerminalUi = {
  intro(): void;
  spinner(): TerminalSpinner;
  note(message: string, title: string): void;
  text(options: {
    message: string;
    placeholder?: string;
    initialValue?: string;
  }): Promise<string | typeof TUI_CANCELLED>;
  confirm(message: string): Promise<boolean | typeof TUI_CANCELLED>;
  cancel(message: string): void;
  outro(message: string): void;
};

export const defaultTerminalUi: TerminalUi = {
  intro() {
    prompts.intro(pc.bgCyan(pc.black(pc.bold(" claws "))));
  },
  spinner() {
    return prompts.spinner();
  },
  note(message, title) {
    prompts.note(message, title);
  },
  async text(options) {
    const result = await prompts.text(options);
    return prompts.isCancel(result) ? TUI_CANCELLED : result;
  },
  async confirm(message) {
    const result = await prompts.confirm({ message });
    return prompts.isCancel(result) ? TUI_CANCELLED : result;
  },
  cancel(message) {
    prompts.cancel(message);
  },
  outro(message) {
    prompts.outro(message);
  },
};

function sourceLabel(claw: LocalClawPackage): string {
  switch (claw.source.kind) {
    case "local-package":
      return `local · ${claw.source.path}`;
    case "clawhub-package":
      return `ClawHub · ${claw.source.ref}`;
    case "github-package":
      return `GitHub · ${claw.source.repository}@${claw.source.commit.slice(0, 12)}`;
  }
}

export function formatClawSummary(claw: LocalClawPackage): string {
  const summary = claw.summary;
  return [
    `${summary.agent.name ?? summary.agent.id} (${claw.source.packageName}@${claw.source.packageVersion})`,
    summary.agent.description ?? "No description",
    "",
    `Agent       ${summary.agent.id}`,
    `Source      ${sourceLabel(claw)}`,
    `Persona     ${summary.hasPortablePrompt ? "portable CLAW.md body" : "workspace files only"}`,
    `Workspace   ${summary.workspaceFileCount} files`,
    `Skills      ${summary.skillCount}`,
    `Plugins     ${summary.pluginCount}`,
    `MCP         ${summary.mcpServerCount}`,
    `Schedules   ${summary.cronJobCount}`,
    `Integrity   ${claw.source.integrity}`,
  ].join("\n");
}

export function formatHarnessPlan(outcome: unknown): string {
  if (outcome === undefined) {
    return "The harness returned no plan details.";
  }
  if (typeof outcome === "string") {
    return outcome;
  }
  return JSON.stringify(outcome, null, 2);
}

export async function withSpinner<T>(
  ui: TerminalUi,
  start: string,
  complete: string,
  operation: () => Promise<T>,
): Promise<T> {
  const spinner = ui.spinner();
  spinner.start(start);
  try {
    const result = await operation();
    spinner.stop(complete);
    return result;
  } catch (error) {
    spinner.stop(`${start.replace(/…$/, "")} failed`);
    throw error;
  }
}
