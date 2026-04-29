/**
 * `OC_MEMORY_INDEX_OVER_LIMIT` — flag MEMORY.md files exceeding either
 * the line-count limit (200) or the entry-count limit (50). The line
 * cap matches the documented "files after 200 lines will be truncated"
 * convention; the entry cap is a defensive default to catch unbounded
 * growth before bootstrap overflow.
 *
 * Evidence:
 *   - #73691 — MEMORY.md grows unbounded → bootstrap overflow → Gateway
 *     freeze (startup-block class). This is the rule's load-bearing
 *     justification: bootstrap reads MEMORY.md verbatim, so an
 *     unbounded file freezes startup.
 *   - #45415 — explicit feature request for size warning/limit enforcement
 *
 * Severity 'warn' for line/entry-count overruns (still tolerable); the
 * runtime startup-block is what makes this an actionable warning at
 * lint time rather than a hard error.
 *
 * @evidence #73691 #45415
 * @module @bic/openclaw-workspace/lint/workspace-rules/memory-index-over-limit
 */

import type { MemoryAst } from '../../ast/ast-types.js';
import type {
  MarkdownLintFindingDraft,
  WorkspaceContext,
  WorkspaceLintRule,
} from '../workspace-types.js';

const MAX_LINES = 200;
const MAX_ENTRIES = 50;

export const memoryIndexOverLimitRule: WorkspaceLintRule = {
  code: 'OC_MEMORY_INDEX_OVER_LIMIT',
  severity: 'warn',
  evidenceIssues: [73691, 45415],
  run(ctx: WorkspaceContext): readonly MarkdownLintFindingDraft[] {
    const drafts: MarkdownLintFindingDraft[] = [];
    for (const file of ctx.files) {
      if (file.kind !== 'memory') continue;
      const ast = file.ast as MemoryAst;
      const lineCount = file.raw.split(/\r?\n/).length;
      if (lineCount > MAX_LINES) {
        drafts.push({
          source: 'markdown',
          code: 'OC_MEMORY_INDEX_OVER_LIMIT',
          severity: 'warn',
          message: `MEMORY.md is ${lineCount} lines (limit ${MAX_LINES}); content past line ${MAX_LINES} risks truncation during bootstrap (#73691, #45415)`,
          relPath: file.relPath,
          line: MAX_LINES + 1,
        });
      }
      if (ast.entries.length > MAX_ENTRIES) {
        drafts.push({
          source: 'markdown',
          code: 'OC_MEMORY_INDEX_OVER_LIMIT',
          severity: 'warn',
          message: `MEMORY.md has ${ast.entries.length} entries (recommended ≤${MAX_ENTRIES}); consider splitting topics into separate memory files`,
          relPath: file.relPath,
          line: ast.entries[MAX_ENTRIES]?.line ?? 1,
        });
      }
    }
    return drafts;
  },
};
