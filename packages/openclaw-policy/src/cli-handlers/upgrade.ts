/**
 * `claws upgrade` — migrate policy artifacts to the current schema version.
 *
 * Thin handler: reports per-artifact migration outcomes via the injected
 * migrator. Fixture default migrator no-ops and reports `already-current`.
 */

import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

export interface MigrationStep {
  readonly artifact: string;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly status: 'migrated' | 'already-current' | 'skipped';
}

export type PolicyMigrator = (workspace: string) => Promise<readonly MigrationStep[]>;

export const defaultMigrator: PolicyMigrator = async (_workspace) => [
  { artifact: 'policy-ir.json', fromVersion: '1.0.0', toVersion: '1.0.0', status: 'already-current' },
  { artifact: 'audit-manifest.json', fromVersion: '1.0.0', toVersion: '1.0.0', status: 'already-current' },
];

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
  const lines: string[] = [`${argv.binaryName} upgrade:`];
  for (const s of steps) {
    lines.push(`  ${s.artifact}: ${s.status} (v${s.fromVersion} -> v${s.toVersion})`);
  }
  return {
    exitCode: 0,
    stdout: `${lines.join('\n')}\n`,
    stderr: '',
  };
}
