export const OUTCOME_SCHEMA_VERSION = "claw.cliOutcome.v0" as const;
export const PROTOTYPE_STABILITY = "private-prototype" as const;

export type DiagnosticPhase = "arguments" | "source" | "package" | "adapter";

export type Diagnostic = {
  code: string;
  phase: DiagnosticPhase;
  message: string;
  path?: string;
};

export type LocalPackageSource = {
  kind: "local-package";
  path: string;
  packageName: string;
  packageVersion: string;
  integrity: string;
  byteLength: number;
  fileCount: number;
};

export type ClawInspection = {
  manifestPath: string;
  schemaVersion: 1;
  agent: {
    id: string;
    name?: string;
    description?: string;
  };
  summary: {
    bootstrapFiles: string[];
    workspaceFileCount: number;
    skillCount: number;
    pluginCount: number;
    mcpServerCount: number;
    cronJobCount: number;
  };
  hasPortablePrompt: boolean;
  openClawProfilePath?: string;
};

type OutcomeBase = {
  schemaVersion: typeof OUTCOME_SCHEMA_VERSION;
  stability: typeof PROTOTYPE_STABILITY;
  operation: "inspect" | "preview";
};

export type SuccessOutcome = OutcomeBase & {
  ok: true;
  source: LocalPackageSource;
  claw: ClawInspection;
  diagnostics: [];
};

export type FailureOutcome = OutcomeBase & {
  ok: false;
  diagnostics: Diagnostic[];
};

export type CliOutcome = SuccessOutcome | FailureOutcome;
