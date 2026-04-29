/**
 * Cross-file (workspace-level) lint surface — types and contracts.
 *
 * The existing JSONC-only `lint(doc, opts)` engine handles single-file
 * `OC_CFG_*` rules. This module adds the substrate for rules that:
 *   - Operate on markdown ASTs (AGENTS.md, MEMORY.md, SOUL.md, SKILL.md)
 *   - Cross-reference between files (e.g. agent → tools, gov rule →
 *     agent), which a single-file context can't see.
 *
 * Workspace rules consume a `WorkspaceContext` (all parsed files +
 * optional schema) and produce `MarkdownLintFindingDraft[]`. The
 * `lintWorkspace` engine stamps `ocUri` and merges with JSONC findings
 * so callers get a unified ordered result.
 *
 * Backward-compat: the existing single-file `lint(doc, opts)` API and
 * `LintFinding` shape are unchanged. Workspace findings are a separate
 * `MarkdownLintFinding` type so JSONC-only consumers don't see new
 * fields they have to deal with.
 *
 * @module @bic/openclaw-workspace/lint/workspace-types
 */

import type { JsoncDocument } from '../ast/jsonc/ast-types.js';
import type { DiscoveredWorkspaceFile } from '../staging/discover.js';
import type {
  LintCode,
  LintFinding,
  LintSchema,
  LintSeverity,
} from './types.js';

/**
 * What workspace rules see: every parsed workspace file plus an
 * optional handle to the openclaw.json JSONC document for rules that
 * need to correlate config keys with markdown content.
 */
export interface WorkspaceContext {
  /** All discovered + parsed workspace files. */
  readonly files: readonly DiscoveredWorkspaceFile[];
  /** Parsed openclaw.json JSONC document, if present. */
  readonly configDoc?: JsoncDocument;
  /** Relative path of the config file (typically 'openclaw.json'). */
  readonly configRelPath?: string;
}

/**
 * A finding from a markdown-targeted or cross-file rule. Discriminated
 * by `source: 'markdown'`. Location is line/column-only — markdown
 * ASTs track lines, not byte offsets, so byte ranges aren't meaningful
 * here.
 */
export interface MarkdownLintFinding {
  readonly source: 'markdown';
  readonly code: LintCode;
  readonly severity: LintSeverity;
  readonly message: string;
  /** Workspace-relative path of the offending file. */
  readonly relPath: string;
  /** 1-based line number. */
  readonly line: number;
  /** 1-based column number; optional if the rule resolves only to line. */
  readonly column?: number;
  readonly suggestion?: string;
  /** `oc://<file>/...` URI form. Engine-stamped; rules don't compute. */
  readonly ocUri: string;
}

/** Workspace-stamped JSONC finding — adds explicit relPath + discriminant. */
export type StampedJsoncLintFinding = LintFinding & {
  readonly source: 'jsonc';
  readonly relPath: string;
};

export type WorkspaceLintFinding = StampedJsoncLintFinding | MarkdownLintFinding;

/** Workspace rules return drafts; engine stamps ocUri. */
export type MarkdownLintFindingDraft = Omit<MarkdownLintFinding, 'ocUri'>;

/**
 * A workspace lint rule. Pure-AST or schema-aware (the rule decides
 * whether to use the schema). Returns ordered drafts referencing one
 * or more files.
 */
export interface WorkspaceLintRule {
  readonly code: LintCode;
  readonly severity: LintSeverity;
  readonly evidenceIssues: readonly number[];
  readonly run: (
    ctx: WorkspaceContext,
    schema: LintSchema | undefined,
  ) => readonly MarkdownLintFindingDraft[];
}
