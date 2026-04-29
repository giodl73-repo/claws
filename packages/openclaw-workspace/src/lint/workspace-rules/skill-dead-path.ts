/**
 * `OC_SKILL_DEAD_PATH` — flag SKILL.md body content containing
 * hardcoded absolute paths that look like they should have been
 * parameterized (e.g. `/data/.clawdbot/`).
 *
 * Evidence:
 *   - #57143 — gh-issues skill references hardcoded /data/.clawdbot/ path
 *
 * Hardcoded absolute paths in skill bodies are a portability bug:
 * skills authored on one machine reference paths that don't exist on
 * another. The runtime hits an ENOENT and the skill fails opaquely.
 * Catching this at lint time gives the author a chance to use a
 * parameter or relative reference instead.
 *
 * Detection: regex match for known offender patterns + a generic
 * "absolute Unix-style path with a recognizable user-data fragment"
 * heuristic. Tuned to avoid false positives on legitimate path
 * documentation (e.g. `~/.openclaw/state` is fine — it's clearly
 * documentation; bare `/data/.clawdbot/x.json` is not).
 *
 * Severity 'note' — heuristic; may have false positives. Surfaced as a
 * gentle prompt rather than a hard error.
 *
 * @evidence #57143
 * @module @bic/openclaw-workspace/lint/workspace-rules/skill-dead-path
 */

import type { SkillsAst } from '../../ast/ast-types.js';
import type {
  MarkdownLintFindingDraft,
  WorkspaceContext,
  WorkspaceLintRule,
} from '../workspace-types.js';

/**
 * Patterns that look like personal-machine absolute paths inside skill
 * bodies. Each entry has a regex + a description for the diagnostic.
 */
const DEAD_PATH_PATTERNS: ReadonlyArray<{ pattern: RegExp; description: string }> = [
  // Specific instance from #57143.
  { pattern: /\/data\/\.clawdbot\b/, description: 'hardcoded /data/.clawdbot/ path' },
  // Generic personal data paths (bare absolute, no leading ~).
  { pattern: /^\s*\/Users\/[A-Za-z0-9_.-]+\//m, description: 'hardcoded /Users/<user>/ path' },
  { pattern: /^\s*\/home\/[A-Za-z0-9_.-]+\//m, description: 'hardcoded /home/<user>/ path' },
  // Windows user paths (rare in skill bodies but happens).
  { pattern: /\bC:\\Users\\[A-Za-z0-9_.-]+\\/, description: 'hardcoded C:\\Users\\<user>\\ path' },
];

export const skillDeadPathRule: WorkspaceLintRule = {
  code: 'OC_SKILL_DEAD_PATH',
  severity: 'note',
  evidenceIssues: [57143],
  run(ctx: WorkspaceContext): readonly MarkdownLintFindingDraft[] {
    const drafts: MarkdownLintFindingDraft[] = [];
    for (const file of ctx.files) {
      if (file.kind !== 'skills') continue;
      const normalized = file.relPath.replace(/\\/g, '/');
      const basename = normalized.slice(normalized.lastIndexOf('/') + 1);
      if (basename !== 'SKILL.md' && basename !== 'skill.md') continue;
      const ast = file.ast as SkillsAst;
      const lines = ast.skill.body.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        for (const { pattern, description } of DEAD_PATH_PATTERNS) {
          // For multiline `^...$/m` patterns we still test per-line for
          // a clean match, but keeping the patterns separate lets us
          // emit a specific message per pattern.
          if (pattern.test(line)) {
            drafts.push({
              source: 'markdown',
              code: 'OC_SKILL_DEAD_PATH',
              severity: 'note',
              message: `body contains ${description} on line ${i + 1}; consider parameterizing or using a workspace-relative reference (#57143)`,
              relPath: file.relPath,
              // Body lines start after frontmatter; we don't track the
              // exact frontmatter end, so we report relative to body.
              // Editor extensions can resolve to the underlying file.
              line: i + 1,
            });
            break;
          }
        }
      }
    }
    return drafts;
  },
};
