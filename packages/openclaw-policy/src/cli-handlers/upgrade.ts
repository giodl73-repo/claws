/**
 * `claws upgrade` — migrate policy artifacts to the current schema version.
 *
 * Delegates the actual on-disk work to the library-layer
 * `migratePolicyArtifacts` function (see src/migrate.ts). The handler is
 * a thin argv→library adapter that renders results per the CLI surface.
 *
 * Behavior:
 *   - stat + parse `.openclaw/policy/policy-ir.json` + `audit-manifest.json`
 *   - bump the `version` field on each artifact older than current
 *   - render per-artifact status + exit code
 *   - `--dry-run` inspects without writing
 *
 * Exit codes:
 *   0 — all artifacts current (or successfully migrated)
 *   1 — one or more artifacts failed migration (parse error, write fail)
 *   2 — usage error
 */

import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';
import {
  migratePolicyArtifacts,
  CURRENT_POLICY_SCHEMA_VERSION as LIB_CURRENT,
  type MigrationArtifactResult,
  type MigratePolicyArtifactsResult,
} from '../migrate.js';

export const CURRENT_POLICY_SCHEMA_VERSION = LIB_CURRENT;

/** Alias retained for tests that expect the legacy type name. */
export type MigrationStep = MigrationArtifactResult;

export type PolicyMigrator = (workspace: string) => Promise<readonly MigrationStep[]>;

/**
 * Default migrator delegates to the library migratePolicyArtifacts. Wraps
 * in a writing mode; the handler's `--dry-run` flag dispatches to a
 * dry-run pass-through.
 */
export const defaultMigrator: PolicyMigrator = async (workspace) => {
  const result: MigratePolicyArtifactsResult = await migratePolicyArtifacts({ workspace });
  return result.steps;
};

export const dryRunMigrator: PolicyMigrator = async (workspace) => {
  const result = await migratePolicyArtifacts({ workspace, dryRun: true });
  return result.steps;
};

export async function handle(
  argv: HandlerArgv,
  migrator: PolicyMigrator = defaultMigrator,
): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const workspace = typeof flags['workspace'] === 'string' ? flags['workspace'] : argv.cwd;
  if (typeof workspace !== 'string' || workspace === '') {
    return renderErr(argv.binaryName, 'upgrade', 'workspace path required', 2);
  }

  const activeMigrator = flags['dry-run'] === true ? dryRunMigrator : migrator;

  const steps = await activeMigrator(workspace);
  const hasError = steps.some((s) => s.status === 'error');
  const lines: string[] = [`${argv.binaryName} upgrade:`];
  for (const s of steps) {
    const detail = s.detail !== undefined ? ` — ${s.detail}` : '';
    lines.push(
      `  ${s.artifact}: ${s.status} (v${s.fromVersion} -> v${s.toVersion})${detail}`,
    );
  }
  return {
    exitCode: hasError ? 1 : 0,
    stdout: `${lines.join('\n')}\n`,
    stderr: '',
  };
}
