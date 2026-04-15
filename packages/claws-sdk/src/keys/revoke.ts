/**
 * Key revocation — mark a key as revoked in the registry, append a REVOKE
 * event to the audit chain, and block further signing attempts.
 *
 * @module claws-sdk/keys/revoke
 */

import type { KeyEntry } from './types.js';
import { getKey, updateKey } from './registry.js';
import { createStorage } from './storage.js';
import { appendAuditEvent, readPolicyVersion } from '../compliance/audit-chain.js';

/**
 * Result of a key revocation operation.
 */
export interface RevokeResult {
  /** The updated key entry with revoked=true. */
  readonly entry: KeyEntry;
  /** ISO 8601 timestamp of revocation. */
  readonly revokedAt: string;
}

/**
 * Revoke a key: mark as revoked in registry and append audit event.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param keyId - ID of the key to revoke
 * @param reason - Human-readable reason for revocation
 * @returns Revocation result
 */
export async function revokeKey(
  workspaceRoot: string,
  keyId: string,
  reason: string = 'manual revocation',
): Promise<RevokeResult> {
  const entry = await getKey(workspaceRoot, keyId);
  if (!entry) {
    throw new Error(`Key not found: ${keyId}`);
  }
  if (entry.revoked) {
    throw new Error(`Key already revoked: ${keyId}`);
  }

  const revokedAt = new Date().toISOString();

  // Update registry
  const updated: KeyEntry = {
    ...entry,
    revoked: true,
    revokedAt,
  };
  await updateKey(workspaceRoot, updated);

  // Destroy key material from storage — revoked keys must not remain accessible
  const storage = createStorage(entry.storageTier, workspaceRoot);
  await storage.delete(keyId);
  // Also delete public key material if present (Ed25519)
  if (entry.algorithm === 'ed25519') {
    await storage.delete(`${keyId}.pub`);
  }

  // Append REVOKE event to audit chain
  const policyVersion = await readPolicyVersion(workspaceRoot);
  await appendAuditEvent(workspaceRoot, {
    eventType: 'KEY_REVOKED',
    target: keyId,
    action: 'revoke',
    outcome: reason,
    ruleId: 'key-lifecycle',
    severity: 3,
    policyVersion,
  });

  return { entry: updated, revokedAt };
}

/**
 * Assert that a key is not revoked. Throws if the key is revoked.
 *
 * Use this as a guard before any signing operation.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param keyId - ID of the key to check
 */
export async function assertKeyNotRevoked(
  workspaceRoot: string,
  keyId: string,
): Promise<void> {
  const entry = await getKey(workspaceRoot, keyId);
  if (!entry) {
    throw new Error(`Key not found: ${keyId}`);
  }
  if (entry.revoked) {
    throw new Error(`Signing blocked: key ${keyId} has been revoked`);
  }
}
