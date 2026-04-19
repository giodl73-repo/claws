/**
 * WorkspaceState types — typed read-model of an OC workspace.
 *
 * @module @bic/openclaw-workspace/path/types
 */

import { OC_WORKSPACE_FILES } from './oc-files.js';

export { OC_WORKSPACE_FILES } from './oc-files.js';
export type { OcWorkspaceFile as WorkspaceFileName } from './oc-files.js';

/**
 * Subset of `OC_WORKSPACE_FILES` the parser surfaces as typed
 * `SectionBase` fields on `WorkspaceState`.
 */
export const OC_PARSED_FILES = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'MEMORY.md',
  'IDENTITY.md',
  'USER.md',
  'HEARTBEAT.md',
] as const satisfies ReadonlyArray<(typeof OC_WORKSPACE_FILES)[number]>;

export type OcParsedFile = (typeof OC_PARSED_FILES)[number];

/** Parsed H2 section from a markdown file. */
export interface ParsedSection {
  readonly heading: string;
  readonly body: string;
  readonly line: number;
}

/** Base shape shared by every section — lossless raw + parsed headings. */
export interface SectionBase {
  readonly raw: string;
  readonly preamble: string;
  readonly sections: readonly ParsedSection[];
}

export type SoulSection = SectionBase;
export type MemorySection = SectionBase;
export type IdentitySection = SectionBase;
export type ToolsSection = SectionBase;
export type AgentsSection = SectionBase;
export type UserSection = SectionBase;
export type HeartbeatSection = SectionBase;

/**
 * Typed read-model of an OC workspace directory.
 */
export interface WorkspaceState {
  readonly workspaceRoot: string;
  readonly soul: SoulSection;
  readonly memory: MemorySection | null;
  readonly identity: IdentitySection | null;
  readonly tools: ToolsSection | null;
  readonly agents: AgentsSection | null;
  readonly user: UserSection | null;
  readonly heartbeat: HeartbeatSection | null;
}

/**
 * Error thrown when the required SOUL.md file is missing from the workspace.
 */
export class WorkspaceError extends Error {
  readonly code: string;
  readonly workspaceRoot: string;

  constructor(message: string, workspaceRoot: string, code = 'WORKSPACE_SOUL_MISSING') {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
    this.workspaceRoot = workspaceRoot;
  }
}
