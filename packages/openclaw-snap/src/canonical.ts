/**
 * @bic/openclaw-snap/canonical — snapshotId + policyId computation helpers.
 *
 * Both ids are computed via `@bic/openclaw-workspace/canonicalize` so they
 * are byte-identical across every consumer of the peer dep.
 * Format: `sha256-<base64url>` per `workspace.md` §`canonicalHash`.
 *
 * `computePolicyId` delegates to the shared `computeStrippedHash` so this
 * package and `@bic/openclaw-policy` cannot drift in how the self-referential
 * fields are stripped before hashing.
 *
 * @module @bic/openclaw-snap/canonical
 */

import {
  canonicalHash,
  computeStrippedHash,
  safeParse,
} from '@bic/openclaw-workspace/canonicalize';

export { safeParse };

/**
 * Compute `snapshotId` from the file set. Canonicalizes the sorted
 * path→content map via RFC 8785 JCS and hashes the UTF-8 bytes.
 */
export function computeSnapshotId(files: Readonly<Record<string, string>>): string {
  const ordered: Record<string, string> = {};
  for (const key of Object.keys(files).sort()) {
    ordered[key] = files[key] as string;
  }
  return canonicalHash(ordered);
}

/**
 * Recompute `policyId` from a parsed PolicyIR. Strips `policyId` and
 * `canonicalizerVersion` before hashing so the computed id is
 * self-referential (the ir declares what hash it should have).
 */
export function computePolicyId(ir: Record<string, unknown>): string {
  return computeStrippedHash(ir, ['policyId', 'canonicalizerVersion']);
}

export const POLICY_IR_PATH = '.openclaw/policy/policy-ir.json';
