/**
 * Bypass audit helpers — write BYPASS_ACTIVATED events to the
 * .claws/audit/chain.jsonl append-only log.
 *
 * Uses the SDK's ArtifactSigner so that the HMAC payload excludes
 * signature metadata (hmacSignature, keyId, algorithm), matching
 * cross-module verification expectations.
 *
 * Shared by compile, check, and build commands.
 *
 * @module claws-cli/core/audit
 */

import { mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import { COMPILER_VERSION } from '@bic/claws-sdk/compile';
import { signAuditEntry } from '@bic/claws-sdk/compliance/artifact-signer';

/**
 * Derive a deterministic HMAC key from workspace path + compiler version.
 * This provides tamper evidence, not secrecy.
 */
function deriveAuditKey(workspaceRoot: string): string {
  return `${workspaceRoot}:${COMPILER_VERSION}`;
}

/**
 * Write a BYPASS_ACTIVATED audit event to .claws/audit/chain.jsonl.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param action - Action identifier for the audit event (e.g. 'bypass', 'check-bypass', 'build-bypass')
 */
export async function writeBypassAuditEvent(workspaceRoot: string, action: string): Promise<void> {
  const auditDir = join(workspaceRoot, '.claws', 'audit');
  await mkdir(auditDir, { recursive: true });
  const keyId = 'workspace-v1';

  // Build payload WITHOUT signature metadata — SDK signs correctly
  const entry = {
    seq: 0,
    timestamp: new Date().toISOString(),
    eventType: 'BYPASS_ACTIVATED',
    actor: 'cli',
    target: 'governance',
    action,
    outcome: 'allow',
    ruleId: 'BYPASS',
    severity: 1,
    policyVersion: COMPILER_VERSION,
  };

  const key = deriveAuditKey(workspaceRoot);
  const signed = signAuditEntry(entry, key, keyId, 'sha256');

  const chainPath = join(auditDir, 'chain.jsonl');
  await appendFile(chainPath, JSON.stringify(signed) + '\n', 'utf-8');
}
