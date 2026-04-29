/**
 * `OC_CFG_DEAD_COMMENT` — comment immediately precedes a section that no
 * longer exists per the current schema (the field it documented was
 * removed in an earlier upgrade and the comment now hangs).
 *
 * Cosmetic / post-migration cleanup; NOTE severity.
 *
 * @evidence (none — cosmetic, useful post-migration)
 * @module @bic/openclaw-workspace/lint/rules/dead-comment
 */

import type { LintFindingDraft, LintRule } from '../types.js';

export const deadCommentRule: LintRule = {
  code: 'OC_CFG_DEAD_COMMENT',
  severity: 'note',
  needsSchema: true,
  evidenceIssues: [],
  run(doc, schema) {
    if (!schema) return [];
    if (!doc.root || doc.root.kind !== 'object') return [];
    const findings: LintFindingDraft[] = [];
    // Build a quick (commentEnd → next-member-key) index so we can pair
    // each trailing comment to its following member.
    const known = new Set(schema.knownChildKeys([]));
    if (known.size === 0) return [];
    for (const comment of doc.comments) {
      // Find the nearest following object member by start offset.
      const nextMember = doc.root.members.find((m) => m.key.range.start > comment.end);
      if (!nextMember) continue;
      // If the next member's key is a known child, comment is "alive."
      if (known.has(nextMember.key.value)) continue;
      // Member is unknown — comment may be dead. NOTE only.
      findings.push({
        code: 'OC_CFG_DEAD_COMMENT',
        severity: 'note',
        message: `comment precedes "${nextMember.key.value}" which is no longer a recognized field at the root; the comment may be stale post-migration`,
        location: {
          start: comment.start,
          end: comment.end,
        },
        path: [],
      });
    }
    return findings;
  },
};
