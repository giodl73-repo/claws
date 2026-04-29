/**
 * @bic/openclaw-workspace/lint — JSONC config lint engine.
 *
 * Entry point: `lint(doc, opts?)` returns `LintFinding[]` ordered by source
 * offset. Rules are stateless and produce findings independently; the
 * engine is just a fold over `ALL_RULES`.
 *
 * @module @bic/openclaw-workspace/lint
 */

import type { JsoncDocument } from '../ast/jsonc/ast-types.js';
import { buildLineStarts, locateOffsetWithStarts } from '../ast/jsonc/parse.js';
import { formatOcConfigUri } from '../path/oc-config-uri.js';
import type { LintCode, LintFinding, LintFindingDraft, LintOptions, LintRule } from './types.js';
import { ALL_RULES } from './registry.js';
// Import directly from the registry (not from workspace.ts) to avoid a
// circular-import cycle: workspace.ts imports `lint` from this file.
import { ALL_WORKSPACE_RULES } from './workspace-registry.js';

export function lint(doc: JsoncDocument, opts: LintOptions = {}): LintFinding[] {
  const drafts: LintFindingDraft[] = [];
  for (const rule of ALL_RULES) {
    if (opts.enabledCodes && !opts.enabledCodes.has(rule.code)) continue;
    if (rule.needsSchema && !opts.schema) continue;
    const ruleFindings = rule.run(doc, opts.schema);
    for (const f of ruleFindings) drafts.push(f);
  }
  drafts.sort((a, b) => a.location.start - b.location.start);
  // Build lineStarts once if any findings need line/col resolution.
  // Skipping the build entirely when the doc produced no findings keeps
  // clean docs at zero overhead.
  if (drafts.length === 0) return [];
  const lineStarts = buildLineStarts(doc.source);
  // Stamp line/col + ocUri from path, and weave the URI into message text
  // so plain-log surfaces (CI logs, stderr) carry the deep-linkable form
  // even when the structured ocUri field isn't rendered.
  return drafts.map((f) => {
    const { line, column } = locateOffsetWithStarts(lineStarts, f.location.start);
    const ocUri = formatOcConfigUri(f.path);
    const message = f.path.length > 0 ? `${f.message} (${ocUri})` : f.message;
    return {
      ...f,
      message,
      location: { start: f.location.start, end: f.location.end, line, column },
      ocUri,
    };
  });
}

export { ALL_RULES } from './registry.js';
export { ALL_WORKSPACE_RULES } from './workspace-registry.js';
export { lintWorkspace } from './workspace.js';
export type { LintCode, LintFinding, LintOptions, LintRule, LintSchema, LintSeverity, SchemaKind } from './types.js';
export type {
  MarkdownLintFinding,
  MarkdownLintFindingDraft,
  StampedJsoncLintFinding,
  WorkspaceContext,
  WorkspaceLintFinding,
  WorkspaceLintRule,
} from './workspace-types.js';

/**
 * Workspace-discovery diagnostic codes, separate from the lint-rule
 * `LintCode` union because they're emitted by `discoverWorkspaceFiles`
 * (the read+classify+parse pipeline) rather than by lint rules.
 * Listed here for programmatic enumeration (docs, config UI, CI gates).
 */
export type DiscoveryCode =
  | 'OC_WS_UNKNOWN_FILE'
  | 'OC_WS_CASING_VIOLATION'
  | 'OC_WS_LEGACY_BASENAME';

export const ALL_DISCOVERY_CODES: readonly DiscoveryCode[] = [
  'OC_WS_UNKNOWN_FILE',
  'OC_WS_CASING_VIOLATION',
  'OC_WS_LEGACY_BASENAME',
] as const;

/**
 * Every lint code emitted by this package — both single-file JSONC rules
 * (from `ALL_RULES`) and workspace-level rules (from `ALL_WORKSPACE_RULES`).
 * Discovery diagnostics live in `ALL_DISCOVERY_CODES` separately.
 *
 * Useful for downstream consumers that need to render a complete code
 * catalog, configure per-code overrides, or assert exhaustive coverage
 * in tests.
 */
export const ALL_LINT_CODES: readonly LintCode[] = [
  ...ALL_RULES.map((r) => r.code),
  ...ALL_WORKSPACE_RULES.map((r) => r.code),
];
