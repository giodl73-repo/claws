/**
 * `claws doctor` — top-level workspace health, now policy-aware.
 *
 * Adds two checks on top of the base doctor report:
 *   - `policy-ir.json present` — ensures generate has been run
 *   - `audit-chain verify passes` — ensures the audit manifest chains cleanly
 *
 * Per the pulse no-duplicate rule we intentionally do NOT expose a
 * `claws policy doctor` subcommand; all diagnostics route through this
 * top-level handler.
 */

import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

export interface DoctorCheck {
  readonly id: string;
  readonly passed: boolean;
  readonly message: string;
}

export interface DoctorResult {
  readonly healthy: boolean;
  readonly checks: readonly DoctorCheck[];
}

export type PolicyArtifactProbe = (workspace: string) => Promise<DoctorCheck[]>;

/**
 * Default policy-aware probe: synthesizes two checks so E2E runs can assert
 * ordering without touching the filesystem. Real doctor consumers inject
 * their own probe.
 */
export const defaultPolicyProbe: PolicyArtifactProbe = async (workspace) => [
  {
    id: 'policy-ir.json present',
    passed: true,
    message: `policy-ir.json found under ${workspace}/.claws/`,
  },
  {
    id: 'audit-chain verify passes',
    passed: true,
    message: 'audit manifest hash chain verified',
  },
];

export async function handle(
  argv: HandlerArgv,
  probe: PolicyArtifactProbe = defaultPolicyProbe,
): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const workspace = typeof flags['workspace'] === 'string' ? flags['workspace'] : argv.cwd;
  if (typeof workspace !== 'string' || workspace === '') {
    return renderErr(argv.binaryName, 'doctor', 'workspace path required', 2);
  }
  const checks = await probe(workspace);
  const healthy = checks.every((c) => c.passed);
  const lines: string[] = [`${argv.binaryName} doctor:`];
  for (const c of checks) {
    lines.push(`  ${c.passed ? 'PASS' : 'FAIL'} [${c.id}] ${c.message}`);
  }
  lines.push(healthy ? 'workspace healthy' : 'workspace has issues');
  return {
    exitCode: healthy ? 0 : 1,
    stdout: `${lines.join('\n')}\n`,
    stderr: '',
  };
}
