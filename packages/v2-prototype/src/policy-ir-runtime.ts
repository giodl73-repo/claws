/**
 * @bic/v2-prototype/policy-ir-runtime — local fork of the optional
 * companion runtime helpers proposed at upstream
 * `src/plugin-sdk/policy-ir-runtime.ts`.
 *
 * **Replace with `@openclaw/plugin-sdk/policy-ir-runtime` when the
 * upstream PR lands** (or, if upstream prefers types-only, drop the
 * helpers and keep equivalent one-liners in each consumer).
 *
 * Four lock-point helpers used by emitted gateway plugins to bridge a
 * PolicyIR-driven decision to the gateway's hook-result shape. Per
 * `policy-pre-rfc.md` § "Companion runtime helpers".
 *
 * @module @bic/v2-prototype/policy-ir-runtime
 */

import type { Snapshot, SnapshotId, SnapshotStore } from './snapshot.js';
import type { PolicyIR } from './policy-ir.js';
import { POLICY_IR_PATH } from './policy-ir.js';

/**
 * Read PolicyIR from a snapshot via the SnapshotStore.
 *
 * Throws on:
 *   • snap.read failing (treat as missing — fail-closed at the consumer)
 *   • PolicyIR malformed JSON
 *   • `validatePolicyIR` failing (hash mismatch, schema mismatch)
 *
 * Caller is expected to fail-closed on any throw per
 * `policy-pre-rfc.md` § "Failure semantics".
 */
export async function loadPolicyIR(
  store: SnapshotStore,
  snap: SnapshotId,
): Promise<PolicyIR> {
  const bytes = await store.read(snap, POLICY_IR_PATH);
  const text = new TextDecoder().decode(bytes);
  const parsed = JSON.parse(text) as unknown;
  validatePolicyIR(parsed);
  return parsed;
}

/**
 * Synchronous variant given an already-fetched Snapshot bytes (e.g., a
 * caller that pre-resolved via `SnapshotStore.read` and now has the
 * raw bytes in hand).
 */
export function readPolicyIR(snapshot: Snapshot, bodyBytes: Uint8Array): PolicyIR {
  void snapshot; // metadata-only; bodyBytes is the actual PolicyIR JSON
  const text = new TextDecoder().decode(bodyBytes);
  const parsed = JSON.parse(text) as unknown;
  validatePolicyIR(parsed);
  return parsed;
}

/**
 * Schema check + content-hash round-trip.
 *
 * Throws if:
 *   • shape doesn't match `PolicyIR` (missing required fields)
 *   • `policyId` doesn't equal `lower-hex(sha256(jcs(body excluding policyId)))`
 *
 * NOTE: the actual JCS + sha256 verification is a hot-path check that
 * downstream impls inject. The local-fork prototype provides the type
 * assertion shape; consumers wire in their canonicalization library
 * (claws uses `@bic/openclaw-workspace/canonicalize`).
 *
 * @asserts ir is PolicyIR
 */
export function validatePolicyIR(ir: unknown): asserts ir is PolicyIR {
  if (typeof ir !== 'object' || ir === null) {
    throw new Error('PolicyIR must be a non-null object');
  }
  const obj = ir as Record<string, unknown>;
  for (const key of ['version', 'policyId', 'generatedAt', 'generatedFrom', 'tools', 'denyRules']) {
    if (!(key in obj)) {
      throw new Error(`PolicyIR missing required field: ${key}`);
    }
  }
  if (!Array.isArray(obj.tools)) {
    throw new Error('PolicyIR.tools must be an array');
  }
  if (!Array.isArray(obj.denyRules)) {
    throw new Error('PolicyIR.denyRules must be an array');
  }
  // Hash round-trip is downstream-injected; see docstring above.
}

/**
 * Read PolicyIR from plugin-private cache for evaluation. Returns null
 * when the entry isn't cached (caller should refresh from snap).
 *
 * The cache shape is intentionally opaque — consumers wire their own
 * cache (see `claws-guardrails/src/policy-runtime/cache.ts` for the
 * bounded-LRU implementation).
 */
export function getCurrentPolicyIR(
  cache: { get(snapshotId: SnapshotId): PolicyIR | undefined },
  snapshotId: SnapshotId,
): PolicyIR | null {
  const ir = cache.get(snapshotId);
  return ir ?? null;
}
