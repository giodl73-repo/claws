/**
 * Broadcast audit trail — record BROADCAST_APPLIED events in audit chain.
 *
 * Every broadcast write is recorded in `.claws/audit/chain.jsonl` via
 * the existing audit chain infrastructure with the policy file name,
 * reason, and workspace path.
 *
 * @module claws-sdk/fleet/broadcast-audit
 */

import { appendAuditEvent, readPolicyVersion } from '../compliance/audit-chain.js';
import type { AuditChainEntry } from '../compliance/artifact-signer.js';

/**
 * Record a BROADCAST_APPLIED event in the workspace audit chain.
 *
 * @param workspacePath - Absolute path to the workspace
 * @param policyFileName - Name of the policy file that was broadcast
 * @param reason - Human-readable reason for the broadcast
 * @param actor - Who initiated the broadcast (defaults to OS user via audit-chain)
 * @returns The signed audit chain entry
 */
export async function recordBroadcastAuditEvent(
  workspacePath: string,
  policyFileName: string,
  reason: string,
  actor?: string,
): Promise<AuditChainEntry> {
  const policyVersion = await readPolicyVersion(workspacePath);

  return appendAuditEvent(workspacePath, {
    eventType: 'BROADCAST_APPLIED',
    target: workspacePath,
    action: `broadcast:${policyFileName}`,
    outcome: 'allow',
    ruleId: 'FLEET-BROADCAST',
    severity: 3,
    policyVersion,
    ...(actor !== undefined ? { actor } : {}),
  });
}
