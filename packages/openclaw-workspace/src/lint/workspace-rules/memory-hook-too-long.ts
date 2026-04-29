/**
 * `OC_MEMORY_HOOK_TOO_LONG` — flag MEMORY.md entries whose first content
 * line ("hook" line in the index format) exceeds 150 characters.
 *
 * Evidence:
 *   - #73691 — MEMORY.md grows unbounded → bootstrap overflow → Gateway
 *     freeze (startup-block class)
 *   - #45415 — explicit feature request for size warning/limit enforcement
 *
 * The 150-char threshold matches the Claude Code memory-system spec
 * ("each entry should be one line, under ~150 characters") and provides
 * a concrete, defensible default. Future schema-DI'd override is left
 * to a follow-up if upstream wants to tune.
 *
 * Severity 'warn': not a hard error (entries can legitimately be longer
 * for complex topics) but flagged so reviewers see the size growth
 * before bootstrap overflow becomes a startup-block.
 *
 * @evidence #73691 #45415
 * @module @bic/openclaw-workspace/lint/workspace-rules/memory-hook-too-long
 */

import type { MemoryAst } from '../../ast/ast-types.js';
import type { MarkdownLintFindingDraft } from '../workspace-types.js';
import type { WorkspaceContext } from '../workspace-types.js';
import type { WorkspaceLintRule } from '../workspace-types.js';

const HOOK_MAX_CHARS = 150;

export const memoryHookTooLongRule: WorkspaceLintRule = {
  code: 'OC_MEMORY_HOOK_TOO_LONG',
  severity: 'warn',
  evidenceIssues: [73691, 45415],
  run(ctx: WorkspaceContext): readonly MarkdownLintFindingDraft[] {
    const drafts: MarkdownLintFindingDraft[] = [];
    for (const file of ctx.files) {
      if (file.kind !== 'memory') continue;
      const ast = file.ast as MemoryAst;
      for (const entry of ast.entries) {
        const hook = locateHook(entry.content);
        if (hook === null) continue;
        if (hook.text.length > HOOK_MAX_CHARS) {
          drafts.push({
            source: 'markdown',
            code: 'OC_MEMORY_HOOK_TOO_LONG',
            severity: 'warn',
            message: `entry '${entry.name}' has a ${hook.text.length}-char hook line; recommend ≤${HOOK_MAX_CHARS} chars to keep MEMORY.md scannable and avoid bootstrap overflow (#73691, #45415)`,
            relPath: file.relPath,
            // entry.line is the heading (1-based); first body line is +1;
            // hook.bodyOffset is the 0-based index of the hook line in
            // entry.content (skipping leading blanks).
            line: entry.line + 1 + hook.bodyOffset,
          });
        }
      }
    }
    return drafts;
  },
};

/**
 * First non-blank line of `content` plus its 0-based offset within the
 * body. Returns null when every line is blank or the body is empty.
 */
function locateHook(content: string): { text: string; bodyOffset: number } | null {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim().length > 0) return { text: lines[i]!, bodyOffset: i };
  }
  return null;
}
