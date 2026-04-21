/**
 * `claws doctor` — top-level workspace health, policy-aware.
 *
 * Two checks on top of the base doctor report:
 *   - `policy-ir.json present` — stat `<workspace>/.openclaw/policy/policy-ir.json`
 *   - `audit-chain verify passes` — read `<workspace>/.openclaw/policy/audit-manifest.json`
 *     as a chain-verify payload and delegate to `verifyAudit`.
 *
 * Per the pulse no-duplicate rule we intentionally do NOT expose a
 * `claws policy doctor` subcommand; all diagnostics route through this
 * top-level handler.
 *
 * The `PolicyArtifactProbe` injection seam is preserved so unit tests can
 * supply fake probes; real users get `realPolicyProbe` by default.
 */

import { stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';
import { verifyAudit } from '../ops/verify-audit.js';
import type { AuditEntry } from '@bic/openclaw-guardrails/audit';

export interface DoctorCheck {
  readonly id: string;
  readonly passed: boolean;
  readonly message: string;
}

export interface DoctorResult {
  readonly healthy: boolean;
  readonly checks: readonly DoctorCheck[];
}

export type PolicyArtifactProbe = (
  workspace: string,
  env?: Record<string, string | undefined>,
) => Promise<DoctorCheck[]>;

const POLICY_IR_REL = '.openclaw/policy/policy-ir.json';
const AUDIT_MANIFEST_REL = '.openclaw/policy/audit-manifest.json';

async function checkPolicyIr(workspace: string): Promise<DoctorCheck> {
  const path = join(workspace, POLICY_IR_REL);
  try {
    await stat(path);
    return {
      id: 'policy-ir.json present',
      passed: true,
      message: `policy-ir.json found at ${path}`,
    };
  } catch {
    return {
      id: 'policy-ir.json present',
      passed: false,
      message: `policy-ir.json missing at ${path}; run claws policy generate`,
    };
  }
}

async function checkAuditChain(
  workspace: string,
  env: Record<string, string | undefined>,
): Promise<DoctorCheck> {
  const path = join(workspace, AUDIT_MANIFEST_REL);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return {
      id: 'audit-chain verify passes',
      passed: false,
      message: `audit-manifest.json missing at ${path}; run claws policy generate`,
    };
  }

  let parsed: { chain?: AuditEntry[]; genesis?: string };
  try {
    parsed = JSON.parse(raw) as { chain?: AuditEntry[]; genesis?: string };
  } catch (err) {
    return {
      id: 'audit-chain verify passes',
      passed: false,
      message: `audit-manifest.json parse failed: ${(err as Error).message}`,
    };
  }

  if (!Array.isArray(parsed.chain)) {
    return {
      id: 'audit-chain verify passes',
      passed: false,
      message: `audit-manifest.json missing 'chain' array`,
    };
  }

  const hmacHex = env['OPENCLAW_AUDIT_HMAC_KEY'];
  if (typeof hmacHex !== 'string' || hmacHex.length === 0) {
    return {
      id: 'audit-chain verify passes',
      passed: false,
      message: 'OPENCLAW_AUDIT_HMAC_KEY env var required to verify chain',
    };
  }

  let hmacKey: Buffer;
  try {
    hmacKey = Buffer.from(hmacHex, 'hex');
    if (hmacKey.length === 0) {
      throw new Error('empty HMAC key after hex decode');
    }
  } catch (err) {
    return {
      id: 'audit-chain verify passes',
      passed: false,
      message: `OPENCLAW_AUDIT_HMAC_KEY invalid: ${(err as Error).message}`,
    };
  }

  const result = verifyAudit({
    chain: parsed.chain,
    hmacKey,
    ...(parsed.genesis !== undefined ? { expectedGenesis: parsed.genesis } : {}),
  });

  if (!result.valid) {
    return {
      id: 'audit-chain verify passes',
      passed: false,
      message: `chain broken at ${result.brokenAt ?? 'unknown'} (length=${result.length})`,
    };
  }

  return {
    id: 'audit-chain verify passes',
    passed: true,
    message: `audit manifest hash chain verified (entries=${result.length})`,
  };
}

/**
 * Real policy-aware probe: filesystem stat + chain verify via ops.
 */
export const realPolicyProbe: PolicyArtifactProbe = async (workspace, env = {}) => {
  const ir = await checkPolicyIr(workspace);
  const chain = await checkAuditChain(workspace, env);
  return [ir, chain];
};

/**
 * Default export kept under `defaultPolicyProbe` for callers/tests that
 * imported the previous symbol; now points to the real fs probe.
 */
export const defaultPolicyProbe: PolicyArtifactProbe = realPolicyProbe;

export async function handle(
  argv: HandlerArgv,
  probe: PolicyArtifactProbe = realPolicyProbe,
): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const workspace = typeof flags['workspace'] === 'string' ? flags['workspace'] : argv.cwd;
  if (typeof workspace !== 'string' || workspace === '') {
    return renderErr(argv.binaryName, 'doctor', 'workspace path required', 2);
  }
  const checks = await probe(workspace, argv.env ?? {});
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
