/**
 * Ceremony audit — record ceremony lifecycle events to the audit chain.
 *
 * Events: CEREMONY_INITIATED, SHARE_DISTRIBUTED, KEY_RECONSTRUCTED.
 *
 * @module claws-sdk/keys/ceremony-audit
 */

import { appendAuditEvent, readPolicyVersion } from '../compliance/audit-chain.js';
import type { ShareParticipant } from './ceremony.js';

/**
 * Record a CEREMONY_INITIATED event when a new ceremony begins.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param ceremonyId - Unique ceremony identifier
 * @param totalShares - Number of shares created
 * @param threshold - Minimum shares for reconstruction
 */
export async function recordCeremonyInitiated(
  workspaceRoot: string,
  ceremonyId: string,
  totalShares: number,
  threshold: number,
): Promise<void> {
  const policyVersion = await readPolicyVersion(workspaceRoot);
  await appendAuditEvent(workspaceRoot, {
    eventType: 'CEREMONY_INITIATED',
    target: ceremonyId,
    action: 'ceremony-init',
    outcome: `Split into ${totalShares} shares with threshold ${threshold}`,
    ruleId: 'key-ceremony',
    severity: 4,
    policyVersion,
  });
}

/**
 * Record a SHARE_DISTRIBUTED event when a share is handed to a participant.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param ceremonyId - Unique ceremony identifier
 * @param participant - The participant who received the share
 */
export async function recordShareDistributed(
  workspaceRoot: string,
  ceremonyId: string,
  participant: ShareParticipant,
): Promise<void> {
  const policyVersion = await readPolicyVersion(workspaceRoot);
  await appendAuditEvent(workspaceRoot, {
    eventType: 'SHARE_DISTRIBUTED',
    target: ceremonyId,
    action: 'share-distribute',
    outcome: `Share ${participant.index} distributed to ${participant.identity}`,
    ruleId: 'key-ceremony',
    severity: 3,
    policyVersion,
    actor: participant.identity,
  });
}

/**
 * Record a KEY_RECONSTRUCTED event when the root key is successfully reconstructed.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param ceremonyId - Unique ceremony identifier
 * @param sharesUsed - Number of shares used for reconstruction
 * @param verified - Whether the reconstructed key matched the expected hash
 */
export async function recordKeyReconstructed(
  workspaceRoot: string,
  ceremonyId: string,
  sharesUsed: number,
  verified: boolean,
): Promise<void> {
  const policyVersion = await readPolicyVersion(workspaceRoot);
  await appendAuditEvent(workspaceRoot, {
    eventType: 'KEY_RECONSTRUCTED',
    target: ceremonyId,
    action: 'ceremony-reconstruct',
    outcome: `Reconstructed from ${sharesUsed} shares, verified=${verified}`,
    ruleId: 'key-ceremony',
    severity: 4,
    policyVersion,
  });
}
