/**
 * `OC_MEMORY_RAW_CANDIDATE_LEAK` — flag MEMORY.md entries containing raw
 * dreaming-pipeline markers (`Candidate:`, `daily-log` snippets) that
 * should have been distilled before promotion to the canonical memory.
 *
 * Evidence:
 *   - #67580 — Dreaming promotion writes raw Candidate data into
 *     MEMORY.md (no distillation)
 *   - #67363 — memory-core dreaming deep phase promotes raw verbatim
 *     daily-log snippets to MEMORY.md without distillation
 *   - #68774 — related distillation gap
 *
 * Detection patterns (case-insensitive):
 *   - `Candidate:` line prefix — the dreaming-pipeline candidate marker
 *   - `daily-log/` path prefix — raw daily-log snippet leak
 *   - `[dream:` prefix — dreaming-internal trace leak
 *   - `<promotion-raw>` literal — explicit "did not distill" sentinel
 *
 * Severity 'warn' — the entry is still readable but signals an upstream
 * pipeline bug. Catching it at lint time gives operators a way to
 * surface the issue before MEMORY.md grows unbounded.
 *
 * @evidence #67580 #67363 #68774
 * @module @bic/openclaw-workspace/lint/workspace-rules/memory-raw-candidate-leak
 */

import type { MemoryAst } from '../../ast/ast-types.js';
import type {
  MarkdownLintFindingDraft,
  WorkspaceContext,
  WorkspaceLintRule,
} from '../workspace-types.js';

const LEAK_MARKERS: ReadonlyArray<{ pattern: RegExp; description: string }> = [
  { pattern: /^\s*Candidate:/i, description: 'raw "Candidate:" marker' },
  { pattern: /\bdaily-log\//, description: 'raw daily-log path' },
  { pattern: /\[dream:/i, description: 'dreaming-internal trace prefix' },
  { pattern: /<promotion-raw>/, description: 'undistilled-promotion sentinel' },
];

export const memoryRawCandidateLeakRule: WorkspaceLintRule = {
  code: 'OC_MEMORY_RAW_CANDIDATE_LEAK',
  severity: 'warn',
  evidenceIssues: [67580, 67363, 68774],
  run(ctx: WorkspaceContext): readonly MarkdownLintFindingDraft[] {
    const drafts: MarkdownLintFindingDraft[] = [];
    for (const file of ctx.files) {
      if (file.kind !== 'memory') continue;
      const ast = file.ast as MemoryAst;
      for (const entry of ast.entries) {
        const lines = entry.content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          for (const { pattern, description } of LEAK_MARKERS) {
            if (pattern.test(line)) {
              drafts.push({
                source: 'markdown',
                code: 'OC_MEMORY_RAW_CANDIDATE_LEAK',
                severity: 'warn',
                message: `entry '${entry.name}' contains ${description} on body line ${i + 1} — looks like undistilled dreaming-pipeline output (#67580, #67363, #68774)`,
                relPath: file.relPath,
                // entry.line is the heading; first body line is +1; `i` is
                // the 0-based within-body offset.
                line: entry.line + 1 + i,
              });
              break; // one finding per line is enough
            }
          }
        }
      }
    }
    return drafts;
  },
};
