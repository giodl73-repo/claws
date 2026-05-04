/**
 * `workspace.json` — per-workspace config at the workspace root.
 *
 * **Strategic frame**: oc-paths-substrate ships ONLY the loader and
 * the rule-id glob primitives. The schema is **additive**: each
 * substrate (pinch, oc-doctor, lkg, policy) defines its OWN section
 * type + resolver and reads its slice from the loaded config object.
 * No upfront declaration of which sections exist — adding a new
 * substrate doesn't touch this module.
 *
 *   import { loadWorkspaceConfig } from '@openclaw/oc-path/workspace';
 *   const config = await loadWorkspaceConfig(workspaceDir);
 *   // config is `Record<string, unknown> | null`; consumers cast
 *   // their own section:
 *   const lintSection = config?.['lint'] as MyLintConfigShape | undefined;
 *
 * **File location**: `<workspace-dir>/workspace.json`. Workspace-root
 * adjacent to `policy.jsonc`, `gateway.jsonc`, etc.
 *
 * **CLI precedence convention** (each substrate enforces its own):
 * command-line flags WIN over workspace.json defaults.
 *
 * @module @openclaw/oc-path/workspace/config
 */

import { promises as fs } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

/**
 * Conventional path under the workspace root where the config lives.
 */
export const WORKSPACE_CONFIG_PATH: 'workspace.json' = 'workspace.json';

/**
 * Generic loaded config — opaque shape. Each substrate casts its own
 * section to a typed shape it defines locally.
 */
export type WorkspaceConfig = Readonly<Record<string, unknown>>;

/**
 * Read `workspace.json` from a workspace directory. Returns `null`
 * if the file doesn't exist (not an error — the config is optional).
 * Parse failures throw with a useful message; unknown sections pass
 * through transparently (additive schema).
 */
export async function loadWorkspaceConfig(
  workspaceDir: string,
): Promise<WorkspaceConfig | null> {
  const path = resolvePath(workspaceDir, WORKSPACE_CONFIG_PATH);
  let raw: string;
  try {
    raw = await fs.readFile(path, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as WorkspaceConfig;
  } catch (err) {
    throw new Error(
      `workspace.json parse failed at ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Glob match used for skip / only patterns. Supports `*` (any
 * chars) and `{a,b,c}` (alternation). General-purpose rule-id
 * matcher — kept here because every substrate's resolver uses it.
 */
export function matchRuleIdGlob(glob: string, ruleId: string): boolean {
  if (glob === ruleId || glob === '*') return true;
  let pattern = glob.replace(/[.+^$()|[\]\\]/g, '\\$&');
  pattern = pattern.replace(/\{([^{}]+)\}/g, (_m, body: string) => {
    const alts = body.split(',').map((s) => s.trim());
    return `(?:${alts.join('|')})`;
  });
  pattern = pattern.replace(/\*/g, '.*');
  const re = new RegExp('^' + pattern + '$');
  return re.test(ruleId);
}

/**
 * Filter a registered rule/contribution list by allowlist globs.
 * Empty globs returns input unchanged (the empty-allowlist case is
 * "everything"). General-purpose; used by pinch, oc-doctor, others.
 */
export function filterByOnlyGlobs<T extends { id: string }>(
  items: readonly T[],
  onlyGlobs: readonly string[],
): readonly T[] {
  if (onlyGlobs.length === 0) return items;
  return items.filter((item) =>
    onlyGlobs.some((g) => matchRuleIdGlob(g, item.id)),
  );
}
