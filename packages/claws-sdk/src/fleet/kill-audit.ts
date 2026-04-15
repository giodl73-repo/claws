/**
 * Kill switch audit trail — record KILL_ACTIVATED events in audit chain.
 *
 * Every kill activation is recorded in `.claws/audit/chain.jsonl` via
 * the existing audit chain infrastructure with the kill path, reason,
 * actor, and workspace path.
 *
 * @module claws-sdk/fleet/kill-audit
 */

import { appendAuditEvent, readPolicyVersion } from '../compliance/audit-chain.js';
import type { AuditChainEntry } from '../compliance/artifact-signer.js';
import type { KillPath } from './kill.js';

/**
 * Record a KILL_ACTIVATED event in the workspace audit chain.
 *
 * @param workspacePath - Absolute path to the workspace
 * @param killPath - Which kill path was used (sentinel, sidecar, sigterm)
 * @param reason - Human-readable reason for the kill
 * @param actor - Who activated the kill
 * @returns The signed audit chain entry
 */
export async function recordKillAuditEvent(
  workspacePath: string,
  killPath: KillPath,
  reason: string,
  actor: string,
): Promise<AuditChainEntry> {
  const policyVersion = await readPolicyVersion(workspacePath);

  return appendAuditEvent(workspacePath, {
    eventType: 'KILL_ACTIVATED',
    target: workspacePath,
    action: `kill:${killPath}`,
    outcome: 'deny',
    ruleId: 'FLEET-KILL',
    severity: 5,
    policyVersion,
    actor,
  });
}
