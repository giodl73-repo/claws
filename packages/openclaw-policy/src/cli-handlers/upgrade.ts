/**
 * `claws upgrade` — report migration status for policy artifacts.
 *
 * The library does NOT yet expose a `migratePolicyArtifacts` function;
 * `atom:policy-artifact-migration` is registered in
 * `.craft/plans/claws-cli-handler-wiring.md` and flagged to pulse 47.5.5
 * (library-gap-completion). Until that ships, this handler performs a
 * real on-disk version check and reports status without synthesizing
 * migrations.
 *
 * Behavior:
 *   - stat `.openclaw/policy/policy-ir.json` + `.openclaw/policy/audit-manifest.json`
 *   - parse their `version` field
 *   - compare against `CURRENT_POLICY_SCHEMA_VERSION`
 *   - emit a per-artifact line (`already-current` | `needs-migration` | `missing`)
 *   - exit 0 if nothing needs migration (all current or missing)
 *   - exit 1 if any artifact carries a version older than current
 *     (migration library not yet available — flagged to pulse 47.5.5)
 *
 * The `PolicyMigrator` injection seam is preserved so future wiring to a
 * real library migrator is a one-line swap.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

export const CURRENT_POLICY_SCHEMA_VERSION = '1.0.0';

export interface MigrationStep {
  readonly artifact: string;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly status: 'migrated' | 'already-current' | 'needs-migration' | 'missing';
}

export type PolicyMigrator = (workspace: string) => Promise<readonly MigrationStep[]>;

const ARTIFACTS: readonly { readonly name: string; readonly rel: string }[] = [
  { name: 'policy-ir.json', rel: '.openclaw/policy/policy-ir.json' },
  { name: 'audit-manifest.json', rel: '.openclaw/policy/audit-manifest.json' },
];

async function inspectArtifact(
  workspace: string,
  artifact: { readonly name: string; readonly rel: string },
): Promise<MigrationStep> {
  const path = join(workspace, artifact.rel);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return {
      artifact: artifact.name,
      fromVersion: 'n/a',
      toVersion: CURRENT_POLICY_SCHEMA_VERSION,
      status: 'missing',
    };
  }

  let parsed: { version?: unknown };
  try {
    parsed = JSON.parse(raw) as { version?: unknown };
  } catch {
    return {
      artifact: artifact.name,
      fromVersion: 'unknown',
      toVersion: CURRENT_POLICY_SCHEMA_VERSION,
      status: 'needs-migration',
    };
  }

  const fromVersion = typeof parsed.version === 'string' ? parsed.version : 'unknown';
  const status: MigrationStep['status'] =
    fromVersion === CURRENT_POLICY_SCHEMA_VERSION ? 'already-current' : 'needs-migration';

  return {
    artifact: artifact.name,
    fromVersion,
    toVersion: CURRENT_POLICY_SCHEMA_VERSION,
    status,
  };
}

/**
 * Default migrator: inspects artifacts on disk and reports status.
 * Does NOT mutate files — the migration library function is pending
 * (atom:policy-artifact-migration, pulse 47.5.5).
 */
export const defaultMigrator: PolicyMigrator = async (workspace) => {
  const steps: MigrationStep[] = [];
  for (const artifact of ARTIFACTS) {
    steps.push(await inspectArtifact(workspace, artifact));
  }
  return steps;
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
  const steps = await migrator(workspace);
  const needsMigration = steps.some((s) => s.status === 'needs-migration');
  const lines: string[] = [`${argv.binaryName} upgrade:`];
  for (const s of steps) {
    lines.push(`  ${s.artifact}: ${s.status} (v${s.fromVersion} -> v${s.toVersion})`);
  }
  if (needsMigration) {
    lines.push(
      'migration library not yet available (atom:policy-artifact-migration, pulse 47.5.5)',
    );
  }
  return {
    exitCode: needsMigration ? 1 : 0,
    stdout: `${lines.join('\n')}\n`,
    stderr: '',
  };
}
