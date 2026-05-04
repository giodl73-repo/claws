/**
 * `workspace.json` — per-workspace config that governs lint, doctor,
 * and policy registries via rule-id prefix matching.
 *
 * **Strategic frame**: every substrate ships its own opinionated
 * lint+doctor pack with rule IDs prefixed by namespace
 * (`policy-starter-v0/*`, `lkg-starter-v0/*`, `starter-v0/*`).
 * `workspace.json` lets operators turn rules off, raise/lower
 * severity, allowlist by glob, or pick a non-default policy
 * generator — durably, without retyping CLI flags.
 *
 * Schema is INTENTIONALLY minimal: skip/severity/only for lint,
 * skip for doctor, generator override for policy. Categories ARE
 * rule-id prefixes (no separate category registry needed); operators
 * disable a whole namespace via glob (`--only "policy-starter-v0/*"`
 * or `skip: ["lkg-starter-v0/*"]`).
 *
 * **File location**: `<workspace-dir>/workspace.json`. Same convention
 * as `policy.jsonc`, `gateway.jsonc`, etc. — workspace-root config
 * adjacent to the artifacts it governs.
 *
 * **CLI precedence**: command-line flags (`--skip`, `--severity`,
 * `--only`) WIN over workspace.json. The config provides defaults;
 * flags override per-invocation.
 *
 * @module @openclaw/oc-path/workspace/config
 */

import { promises as fs } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

/**
 * Conventional path under the workspace root where the config lives.
 * Treated as config — workspace-root adjacent to other `*.jsonc` /
 * `*.json` configs.
 */
export const WORKSPACE_CONFIG_PATH: 'workspace.json' = 'workspace.json';

/**
 * Lint severity values — duplicated here to avoid an SDK-cycle
 * dependency on `@bic/pinch`. Structurally identical.
 */
export type WorkspaceLintSeverity = 'info' | 'warning' | 'error';

export interface WorkspaceLintConfig {
  /**
   * Rule IDs (or glob patterns) to skip. Each entry is matched
   * against every registered rule's `id`; matches are excluded
   * from the lint run.
   *   skip: ["policy-starter-v0/tools/duplicate-tool-id"]
   *   skip: ["lkg-starter-v0/*"]   // disable a whole namespace
   */
  readonly skip?: readonly string[];
  /**
   * Per-rule severity overrides. Maps rule ID → effective severity.
   * Operators bump info → warning when a rule earns its keep, or
   * lower warning → info when it's noisy in their codebase.
   *   severity: { "lkg-starter-v0/lkg/sentinel-in-content": "error" }
   */
  readonly severity?: Readonly<Record<string, WorkspaceLintSeverity>>;
  /**
   * Allowlist by glob. When present, ONLY rules whose ID matches
   * one of these globs run. Useful for targeting one namespace at a
   * time during gradual rollout.
   *   only: ["policy-starter-v0/*"]
   */
  readonly only?: readonly string[];
}

export interface WorkspaceDoctorConfig {
  /**
   * Doctor contribution IDs to skip. Same shape as lint.skip; the
   * doctor adapter's `disabledContributionIds` consumes this set.
   */
  readonly skip?: readonly string[];
}

export interface WorkspacePolicyConfig {
  /**
   * Default generator id when `openclaw-policy generate` /
   * `openclaw-policy check` doesn't pass `--generator`. Falls back
   * to `'md'` if neither workspace.json nor CLI flag is set.
   */
  readonly generator?: string;
  /**
   * Default policy file path within the workspace. Falls back to
   * `'policy.jsonc'` (the conventional `POLICY_PATH` constant).
   */
  readonly policyPath?: string;
}

/**
 * Parsed `workspace.json` shape. All fields optional — a minimal
 * config is `{}`; a sensible config might just set `lint.severity`.
 */
export interface WorkspaceConfig {
  /** Schema version of the workspace.json shape. Defaults to "0.1.0". */
  readonly version?: string;
  readonly lint?: WorkspaceLintConfig;
  readonly doctor?: WorkspaceDoctorConfig;
  readonly policy?: WorkspacePolicyConfig;
}

/**
 * Read `workspace.json` from a workspace directory. Returns `null`
 * if the file doesn't exist (not an error — the config is optional).
 * Parse failures throw with a useful message; unknown fields are
 * SILENTLY accepted at runtime (operators using a future schema
 * version don't get hard-broken by an older loader).
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
 * chars) and `{a,b,c}` (alternation), same as the lint runner's
 * `appliesTo` matcher.
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
 * Resolve the effective lint config given (a) workspace.json, (b)
 * CLI flag overrides. CLI wins over workspace; the merged shape is
 * what the runner consumes.
 *
 * Empty/undefined workspace.json gives the same shape as the CLI
 * flags alone — callers can always pass `null` for the config.
 */
export interface ResolvedLintOverrides {
  readonly disabledRuleIds: ReadonlySet<string>;
  readonly severityOverrides: Readonly<Record<string, WorkspaceLintSeverity>>;
  readonly onlyGlobs: readonly string[];
}

export function resolveLintOverrides(
  config: WorkspaceConfig | null,
  cliFlags: {
    readonly skip?: readonly string[];
    readonly severity?: Readonly<Record<string, WorkspaceLintSeverity>>;
    readonly only?: readonly string[];
  },
  registeredRuleIds: readonly string[],
): ResolvedLintOverrides {
  // 1. Start from workspace.json (the durable defaults).
  const wsSkipGlobs = config?.lint?.skip ?? [];
  const wsSeverity = config?.lint?.severity ?? {};
  const wsOnly = config?.lint?.only ?? [];

  // Expand glob-form skips against registered rule IDs.
  const disabled = new Set<string>();
  for (const glob of wsSkipGlobs) {
    for (const id of registeredRuleIds) {
      if (matchRuleIdGlob(glob, id)) disabled.add(id);
    }
  }
  // 2. CLI --skip is an exact-id list (per pinch's existing flag
  // shape); add to disabled set.
  for (const id of cliFlags.skip ?? []) disabled.add(id);

  // 3. Severity merge: workspace defaults, CLI overrides per id.
  const severity: Record<string, WorkspaceLintSeverity> = { ...wsSeverity };
  if (cliFlags.severity !== undefined) {
    for (const [id, sev] of Object.entries(cliFlags.severity)) {
      severity[id] = sev;
    }
  }

  // 4. Only globs: union of workspace + CLI. If either is set, the
  // union forms the allowlist; rules not matching any glob are
  // implicitly disabled (matches CLI semantics).
  const onlyGlobs: string[] = [...wsOnly, ...(cliFlags.only ?? [])];

  return {
    disabledRuleIds: disabled,
    severityOverrides: severity,
    onlyGlobs,
  };
}

/**
 * Filter a registered rule/contribution list by `onlyGlobs`. Returns
 * the input unchanged when no globs are set (the empty-allowlist
 * case is "everything"). Otherwise returns the subset whose `id`
 * matches at least one glob.
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

/**
 * Resolve the effective doctor skip set given (a) workspace.json,
 * (b) CLI flag override. Returns the combined set of disabled
 * contribution IDs. Glob-expanded against the registered set.
 */
export function resolveDoctorOverrides(
  config: WorkspaceConfig | null,
  cliFlags: {
    readonly skip?: readonly string[];
  },
  registeredContributionIds: readonly string[],
): ReadonlySet<string> {
  const disabled = new Set<string>();
  for (const glob of config?.doctor?.skip ?? []) {
    for (const id of registeredContributionIds) {
      if (matchRuleIdGlob(glob, id)) disabled.add(id);
    }
  }
  for (const id of cliFlags.skip ?? []) disabled.add(id);
  return disabled;
}
