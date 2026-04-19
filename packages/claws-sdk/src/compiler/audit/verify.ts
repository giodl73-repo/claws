/**
 * Audit chain verification.
 *
 * Walks the chain and verifies:
 * 1. Each entry's hash matches its computed hash (content integrity)
 * 2. Each entry's previousHash links to the prior entry's hash (chain integrity)
 * 3. Each entry's Ed25519 signature is valid (authenticity)
 *
 * Reports the first break point if tampered.
 *
 * @module claws-sdk/compiler/audit/verify
 */

import { ed25519Verify } from '../crypto/ed25519.js';
import { computeEntryHash } from './chain.js';
import type { AuditEntry, AuditVerifyResult } from './types.js';

/**
 * Verify an audit chain.
 *
 * @param entries - Ordered chain entries to verify
 * @param publicKeyPem - SPKI-encoded public key used to sign the chain
 * @returns Verification result with first break point if invalid
 */
export function verifyChain(
  entries: readonly AuditEntry[],
  publicKeyPem: string,
): AuditVerifyResult {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;

    // 1. Verify hash chain linkage
    const expectedPreviousHash = i === 0 ? null : entries[i - 1]!.hash;
    if (entry.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        brokenAt: i,
        reason: `Entry ${i}: previousHash mismatch (expected ${String(expectedPreviousHash)}, got ${String(entry.previousHash)})`,
      };
    }

    // 2. Verify content hash
    const expectedHash = computeEntryHash(
      entry.index,
      entry.timestamp,
      entry.action,
      entry.subject,
      entry.payload,
      entry.previousHash,
    );
    if (entry.hash !== expectedHash) {
      return {
        valid: false,
        brokenAt: i,
        reason: `Entry ${i}: hash mismatch (content tampered)`,
      };
    }

    // 3. Verify Ed25519 signature
    if (!ed25519Verify(entry.hash, entry.signature, publicKeyPem)) {
      return {
        valid: false,
        brokenAt: i,
        reason: `Entry ${i}: invalid Ed25519 signature`,
      };
    }
  }

  return { valid: true };
}
