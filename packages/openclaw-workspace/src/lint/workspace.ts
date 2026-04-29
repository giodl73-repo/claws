/**
 * `lintWorkspace(ctx, opts)` — workspace-level lint engine.
 *
 * Composes:
 *   1. The existing JSONC `lint(configDoc, opts)` for openclaw.json rules.
 *   2. Workspace-rule registry for cross-file / markdown rules.
 *
 * Returns a unified `WorkspaceLintFinding[]`, sorted first by `relPath`
 * (alphabetical) then by location-within-file. The discriminated union
 * (`source: 'jsonc' | 'markdown'`) lets renderers branch on shape:
 * JSONC findings carry byte offsets + path + ocUri; markdown findings
 * carry line/column + ocUri.
 *
 * Backward-compat invariant: the single-file `lint(doc, opts)` entry
 * and existing `LintFinding` shape are untouched. This module is
 * additive.
 *
 * @module @bic/openclaw-workspace/lint/workspace
 */

import { formatOcPath } from '../path/oc-path.js';
import { lint as lintDoc } from './index.js';
import type { LintOptions } from './types.js';
import { ALL_WORKSPACE_RULES } from './workspace-registry.js';
import type {
  StampedJsoncLintFinding,
  WorkspaceContext,
  WorkspaceLintFinding,
} from './workspace-types.js';

export function lintWorkspace(
  ctx: WorkspaceContext,
  opts: LintOptions = {},
): WorkspaceLintFinding[] {
  const findings: WorkspaceLintFinding[] = [];

  // 1. JSONC config rules (delegating to the existing engine).
  if (ctx.configDoc !== undefined) {
    const relPath = ctx.configRelPath ?? 'openclaw.json';
    const jsonFindings = lintDoc(ctx.configDoc, opts);
    for (const f of jsonFindings) {
      const stamped: StampedJsoncLintFinding = { ...f, source: 'jsonc', relPath };
      findings.push(stamped);
    }
  }

  // 2. Workspace rules (cross-file / markdown).
  for (const rule of ALL_WORKSPACE_RULES) {
    if (opts.enabledCodes && !opts.enabledCodes.has(rule.code)) continue;
    const drafts = rule.run(ctx, opts.schema);
    for (const draft of drafts) {
      const ocUri = formatOcPath({ file: draft.relPath });
      findings.push({ ...draft, ocUri });
    }
  }

  // 3. Order: by relPath alphabetical, then by location within file.
  findings.sort((a, b) => {
    if (a.relPath !== b.relPath) return a.relPath.localeCompare(b.relPath);
    if (a.source === 'jsonc' && b.source === 'jsonc') {
      return a.location.start - b.location.start;
    }
    if (a.source === 'markdown' && b.source === 'markdown') {
      if (a.line !== b.line) return a.line - b.line;
      return (a.column ?? 0) - (b.column ?? 0);
    }
    // Mixed source within the same relPath shouldn't happen in
    // practice (JSONC findings only attach to openclaw.json, markdown
    // findings only attach to .md files), but keep the sort total.
    return a.source === 'jsonc' ? -1 : 1;
  });

  return findings;
}

export { ALL_WORKSPACE_RULES } from './workspace-registry.js';
export type {
  WorkspaceContext,
  WorkspaceLintFinding,
  WorkspaceLintRule,
  MarkdownLintFinding,
  MarkdownLintFindingDraft,
  StampedJsoncLintFinding,
} from './workspace-types.js';
