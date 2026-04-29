/**
 * `OC_SKILL_TOO_LONG` — flag SKILL.md files exceeding the 500-line
 * best-practice cap from the Anthropic skill spec.
 *
 * Evidence:
 *   - #50972 — gh-issues SKILL.md exceeds 500-line best practice (865
 *     lines)
 *
 * Per the upstream skill spec, individual SKILL.md files should stay
 * under 500 lines. Long files signal that the skill should be split,
 * decomposed into helper utilities, or the body should be moved into
 * supporting files referenced from a shorter primary.
 *
 * Severity 'note' — best-practice violation, not a correctness issue.
 * Surfaces as a quality nudge so reviewers see it during PR review.
 *
 * @evidence #50972
 * @module @bic/openclaw-workspace/lint/workspace-rules/skill-too-long
 */

import type {
  MarkdownLintFindingDraft,
  WorkspaceContext,
  WorkspaceLintRule,
} from '../workspace-types.js';

const MAX_LINES = 500;

export const skillTooLongRule: WorkspaceLintRule = {
  code: 'OC_SKILL_TOO_LONG',
  severity: 'note',
  evidenceIssues: [50972],
  run(ctx: WorkspaceContext): readonly MarkdownLintFindingDraft[] {
    const drafts: MarkdownLintFindingDraft[] = [];
    for (const file of ctx.files) {
      if (file.kind !== 'skills') continue;
      const normalized = file.relPath.replace(/\\/g, '/');
      const basename = normalized.slice(normalized.lastIndexOf('/') + 1);
      if (basename !== 'SKILL.md' && basename !== 'skill.md') continue;
      const lineCount = file.raw.split(/\r?\n/).length;
      if (lineCount > MAX_LINES) {
        drafts.push({
          source: 'markdown',
          code: 'OC_SKILL_TOO_LONG',
          severity: 'note',
          message: `SKILL.md is ${lineCount} lines (best practice: ≤${MAX_LINES}); consider splitting into supporting files referenced from a shorter primary (#50972)`,
          relPath: file.relPath,
          line: MAX_LINES + 1,
        });
      }
    }
    return drafts;
  },
};
