/**
 * `OC_MEMORY_DEAD_LINK` — flag markdown links inside MEMORY.md entries
 * that point to relative paths not present in the workspace.
 *
 * Evidence: no specific upstream issue tracks "MEMORY.md dead links" as
 * a class today. Including this rule in the substrate because (a)
 * dead links are the dominant maintenance bug after a file rename,
 * (b) the cost is one cross-reference walk per memory entry, and
 * (c) cross-file-consistency rules are exactly what the workspace
 * lint substrate exists for. Will move to evidence-anchored once a
 * tracker issue surfaces, or remove if reviewers find it noisy.
 *
 * Scope: relative-path links only. External URLs (`http://`, `https://`,
 * `mailto:`), anchor-only links (`#section`), and `..` traversals that
 * escape the workspace root are ignored. The resolution check uses
 * the workspace file set captured at parse time — the rule does NOT
 * touch the filesystem.
 *
 * Severity 'note': low-priority; broken links don't block startup and
 * may be intentional during in-progress work. Catches the dominant
 * case of "I renamed the file but forgot to update the index."
 *
 * @module @bic/openclaw-workspace/lint/workspace-rules/memory-dead-link
 */

import type { MemoryAst } from '../../ast/ast-types.js';
import type {
  MarkdownLintFindingDraft,
  WorkspaceContext,
  WorkspaceLintRule,
} from '../workspace-types.js';

const LINK_PATTERN = /\[([^\]]*)\]\(([^)]+)\)/g;

export const memoryDeadLinkRule: WorkspaceLintRule = {
  code: 'OC_MEMORY_DEAD_LINK',
  severity: 'note',
  evidenceIssues: [],
  run(ctx: WorkspaceContext): readonly MarkdownLintFindingDraft[] {
    const drafts: MarkdownLintFindingDraft[] = [];
    // Index workspace files by their relPath for O(1) link resolution.
    // We accept any relPath in the workspace (including non-classified
    // files) — the rule's job is "does this link target exist in the
    // workspace", not "is this link target a known kind".
    const knownPaths = new Set(ctx.files.map((f) => f.relPath));

    for (const file of ctx.files) {
      if (file.kind !== 'memory') continue;
      const ast = file.ast as MemoryAst;
      for (const entry of ast.entries) {
        const lines = entry.content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          for (const match of line.matchAll(LINK_PATTERN)) {
            const target = match[2]!.trim();
            if (isExternalOrAnchor(target)) continue;
            // Strip query/fragment for resolution.
            const resolveTarget = target.split(/[#?]/)[0]!;
            if (resolveTarget.length === 0) continue;
            // Resolve relative to the file's parent directory.
            const resolved = resolveRelative(file.relPath, resolveTarget);
            if (resolved === null) continue; // traverses past root — suppress
            if (!knownPaths.has(resolved)) {
              drafts.push({
                source: 'markdown',
                code: 'OC_MEMORY_DEAD_LINK',
                severity: 'note',
                message: `entry '${entry.name}' links to '${resolveTarget}' which doesn't exist in the workspace`,
                relPath: file.relPath,
                // entry.line is the 1-based heading line; first body
                // line is entry.line + 1; within-body offset `i` is
                // 0-based, so the offending line is entry.line + 1 + i.
                line: entry.line + 1 + i,
                suggestion: target,
              });
            }
          }
        }
      }
    }
    return drafts;
  },
};

function isExternalOrAnchor(target: string): boolean {
  if (target.startsWith('http://')) return true;
  if (target.startsWith('https://')) return true;
  if (target.startsWith('mailto:')) return true;
  if (target.startsWith('#')) return true;
  if (target.startsWith('//')) return true; // protocol-relative
  return false;
}

/**
 * Pure-string resolution against forward-slash relPaths. Returns
 * `null` when the target's `..` segments traverse past the workspace
 * root — the link is malformed relative to the workspace, and the
 * rule should suppress the diagnostic rather than false-positive on a
 * coincidental root-level filename.
 */
function resolveRelative(fromRelPath: string, target: string): string | null {
  if (target.startsWith('/')) return target.slice(1);
  const parentParts = fromRelPath.split('/').slice(0, -1);
  const targetParts = target.split('/');
  const stack: string[] = [...parentParts];
  for (const part of targetParts) {
    if (part === '.') continue;
    if (part === '..') {
      if (stack.length === 0) return null; // traverses past root
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  return stack.join('/');
}
