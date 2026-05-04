/**
 * Parse phase — read a workspace file into a typed AST.
 *
 * Migrated to `@bic/oc-paths-substrate` as part of the policy → oc-paths
 * migration: every workspace file now flows through one of the four
 * universal parsers (`parseMd` / `parseJsonc` / `parseJsonl` /
 * `parseYaml`). The discriminator that policy historically used —
 * `WorkspaceFileKind` ('soul' | 'tools' | 'agents' | …) — is preserved
 * here as a basename-based role ID; today every entry resolves to
 * `parseMd`, but the dispatch is open for non-md additions later.
 *
 * @module @bic/openclaw-policy/compile/parse
 */

import {
  parseMd,
  type MdAst,
  type Diagnostic as OcDiagnostic,
} from '@bic/oc-paths-substrate';

import type { Diagnostic } from '../types/index.js';

/**
 * Workspace-file role discriminator policy uses to dispatch which
 * extractors fire on which file. Mirrors the old `WorkspaceFileKind`
 * 9-entry union; intentionally kept basename-derived rather than
 * kind-derived (md/jsonc/jsonl/yaml) so extractors can target a
 * specific named artifact ("SOUL.md is the deny-rule home") rather
 * than every md file in the workspace.
 *
 * If new openclaw-canonical artifacts arrive, extend this union AND
 * `BASENAME_TO_ROLE` together.
 */
export type WorkspaceFileKind =
  | 'soul'
  | 'tools'
  | 'agents'
  | 'memory'
  | 'identity'
  | 'user'
  | 'skill'
  | 'heartbeat'
  | 'bootstrap';

/**
 * Mapping from canonical openclaw basenames to policy's
 * `WorkspaceFileKind`. The match is exact-basename.
 */
export const BASENAME_TO_ROLE: Readonly<Record<string, WorkspaceFileKind>> = {
  'SOUL.md': 'soul',
  'TOOLS.md': 'tools',
  'AGENTS.md': 'agents',
  'MEMORY.md': 'memory',
  'IDENTITY.md': 'identity',
  'USER.md': 'user',
  'SKILL.md': 'skill',
  'HEARTBEAT.md': 'heartbeat',
  'BOOTSTRAP.md': 'bootstrap',
};

/**
 * Inverse — role to canonical basename. Used in extractors that emit
 * `oc://<basename>/...` paths.
 */
export const ROLE_TO_BASENAME: Readonly<Record<WorkspaceFileKind, string>> = {
  soul: 'SOUL.md',
  tools: 'TOOLS.md',
  agents: 'AGENTS.md',
  memory: 'MEMORY.md',
  identity: 'IDENTITY.md',
  user: 'USER.md',
  skill: 'SKILL.md',
  heartbeat: 'HEARTBEAT.md',
  bootstrap: 'BOOTSTRAP.md',
};

/**
 * What `parseWorkspaceFile` returns. The `ast` field is now the
 * universal `MdAst` from oc-paths-substrate (kind-agnostic at the
 * structural level; policy's role discriminator is `kind` above).
 */
export interface ParsedFile {
  readonly kind: WorkspaceFileKind;
  readonly path: string;
  readonly ast: MdAst;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Re-export the `MdAst` shape under the policy-side
 * `WorkspaceAst` name so consumers that imported the type from this
 * module continue to typecheck during the migration window.
 */
export type WorkspaceAst = MdAst;

/**
 * Parse a workspace file by role. Today every role resolves to
 * `parseMd`; the dispatch is centralised here so non-md additions
 * (a future `gateway.jsonc`-as-policy-input role, etc.) only need
 * to extend the switch.
 */
export function parseWorkspaceFile(
  kind: WorkspaceFileKind,
  path: string,
  raw: string,
): ParsedFile {
  const result = parseMd(raw);
  const diagnostics: Diagnostic[] = result.diagnostics.map((d: OcDiagnostic) => ({
    code: 'OC-POLICY-W-PARSE',
    severity: d.severity === 'error' ? 'error' : 'warning',
    message: d.message,
    path,
    line: d.line,
  }));
  return { kind, path, ast: result.ast, diagnostics };
}
