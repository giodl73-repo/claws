/**
 * `OC_SKILL_NAME_MISMATCH` — flag SKILL.md files whose frontmatter
 * `name:` doesn't match the parent directory name.
 *
 * Evidence:
 *   - #69475 — Skill SKILL.md description + size fixes (per Anthropic
 *     skill spec) — name/dir consistency is part of the same conformance
 *     family as size + description.
 *
 * Per the Anthropic skill spec, `skills/<dir>/SKILL.md` MUST have
 * `name: <dir>` in frontmatter so the runtime can resolve the skill by
 * directory and verify the manifest is for the expected skill. Mismatch
 * causes silent loading bugs (skill identified by one name, registered
 * by another).
 *
 * Severity 'warn' — #69475 frames this as spec conformance, not a
 * runtime hard-fail. The runtime *may* fail to resolve the skill (and
 * does in some loaders), so the warning is actionable, but the
 * conservative severity avoids over-claiming. Bump to 'error' if and
 * when a tracked issue confirms the runtime hard-fails.
 *
 * @evidence #69475
 * @module @bic/openclaw-workspace/lint/workspace-rules/skill-name-mismatch
 */

import type { SkillsAst } from '../../ast/ast-types.js';
import type {
  MarkdownLintFindingDraft,
  WorkspaceContext,
  WorkspaceLintRule,
} from '../workspace-types.js';

export const skillNameMismatchRule: WorkspaceLintRule = {
  code: 'OC_SKILL_NAME_MISMATCH',
  severity: 'warn',
  evidenceIssues: [69475],
  run(ctx: WorkspaceContext): readonly MarkdownLintFindingDraft[] {
    const drafts: MarkdownLintFindingDraft[] = [];
    for (const file of ctx.files) {
      if (file.kind !== 'skills') continue;
      // Only the per-skill SKILL.md form has a name to verify; the
      // skills/ directory aggregate (no SKILL.md basename) doesn't apply.
      const normalized = file.relPath.replace(/\\/g, '/');
      const segments = normalized.split('/');
      const basename = segments[segments.length - 1];
      if (basename !== 'SKILL.md' && basename !== 'skill.md') continue;
      // Require pattern skills/<dir>/SKILL.md so we can derive the
      // expected name. Top-level SKILL.md (no parent dir) doesn't have
      // an unambiguous expected name; skip with no diagnostic.
      if (segments.length < 3) continue;
      const expectedName = segments[segments.length - 2]!;
      const ast = file.ast as SkillsAst;
      const declaredName = ast.skill.name;
      if (declaredName === null) continue; // missing-name is a separate rule
      if (declaredName !== expectedName) {
        drafts.push({
          source: 'markdown',
          code: 'OC_SKILL_NAME_MISMATCH',
          severity: 'warn',
          message: `skill name '${declaredName}' does not match parent directory '${expectedName}'; runtime resolves skills by directory and may fail to load this skill (#69475)`,
          relPath: file.relPath,
          line: locateNameLine(ast.raw),
          suggestion: expectedName,
        });
      }
    }
    return drafts;
  },
};

/**
 * Find the 1-based line number of the `name:` key inside the YAML
 * frontmatter. Returns 2 (the conventional first frontmatter line) as a
 * defensive fallback if the scan fails — but the scan should succeed
 * for any well-formed SKILL.md since the parser already classified the
 * file as having a `name`.
 */
function locateNameLine(raw: string): number {
  const lines = raw.split(/\r?\n/);
  // Skip into frontmatter — first line should be `---`.
  let i = 0;
  if (lines[0] !== '---') return 2;
  for (i = 1; i < lines.length; i++) {
    if (lines[i] === '---') break;
    if (/^name\s*:/.test(lines[i]!)) return i + 1; // 1-based
  }
  return 2;
}
