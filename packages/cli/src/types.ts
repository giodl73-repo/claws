import type { ClawManifest } from "@claws/reference-private";

export const OUTCOME_SCHEMA_VERSION = "claw.cliOutcome.v0" as const;
export const INCUBATION_STABILITY = "private-incubation" as const;
export const CLI_VERSION = "0.0.0-private" as const;

export type CliDiagnostic = {
  code: string;
  phase: "arguments" | "source" | "package" | "adapter";
  message: string;
  path?: string;
};

export type ClawPackageSource =
  | {
      kind: "local-package";
      path: string;
      packageName: string;
      packageVersion: string;
      integrity: string;
      byteLength: number;
      fileCount: number;
    }
  | {
      kind: "clawhub-package";
      ref: string;
      registry: string;
      packageName: string;
      packageVersion: string;
      integrity: string;
      artifactIntegrity: string;
      artifactKind: "legacy-zip" | "npm-pack";
      byteLength: number;
      fileCount: number;
    }
  | {
      kind: "github-package";
      ref: string;
      repository: string;
      commit: string;
      packagePath: string;
      packageName: string;
      packageVersion: string;
      integrity: string;
      artifactIntegrity: string;
      artifactKind: "github-tarball";
      byteLength: number;
      fileCount: number;
    };

export type LocalClawPackage = {
  source: ClawPackageSource;
  manifest: ClawManifest;
  manifestPath: string;
  payload: Array<{ path: string; bytes: Buffer }>;
  summary: {
    agent: Pick<ClawManifest["agent"], "id" | "name" | "description">;
    bootstrapFiles: string[];
    workspaceFileCount: number;
    skillCount: number;
    pluginCount: number;
    mcpServerCount: number;
    cronJobCount: number;
    hasPortablePrompt: boolean;
    hasPackageBootstrap: boolean;
    profilePaths: string[];
  };
};

type OutcomeBase = {
  schemaVersion: typeof OUTCOME_SCHEMA_VERSION;
  stability: typeof INCUBATION_STABILITY;
  operation: "create" | "inspect" | "preview" | "apply";
};

export type SuccessOutcome = OutcomeBase & {
  ok: true;
  package: LocalClawPackage["source"];
  claw: LocalClawPackage["summary"];
  harness?: { id: string; outcome: unknown };
  diagnostics: [];
};

export type FailureOutcome = OutcomeBase & {
  ok: false;
  harness?: { id: string; outcome: unknown };
  diagnostics: CliDiagnostic[];
};

export type CliOutcome = SuccessOutcome | FailureOutcome;
