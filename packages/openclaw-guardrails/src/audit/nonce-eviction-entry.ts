/**
 * @bic/openclaw-guardrails/audit — NonceEvictionEntry (CL-11 §3a).
 *
 * Emitted by the persistent nonce store (`@bic/openclaw-policy/nonce-store`)
 * when LRU pressure forces eviction of previously-seen nonces from a scope's
 * in-memory set. Eviction is a security-relevant event: after eviction, a
 * bounded window exists where an adversary could in principle replay one of
 * the evicted nonces. Callers use this entry to trigger scope rotation or
 * alert on unexpected pressure.
 *
 * Per pulse 59 deliverable D2 and PITFALLS.md P-05.
 *
 * @module @bic/openclaw-guardrails/audit/nonce-eviction-entry
 */

/** The (keyId, snapshotId) tuple that scopes a nonce namespace. */
export interface NonceScope {
  readonly keyId: string;
  readonly snapshotId: string;
}

/** Fields recorded on an LRU-bound eviction from a nonce scope. */
export interface NonceEvictionEntry {
  readonly type: "nonce-eviction";
  readonly scope: NonceScope;
  readonly evictedCount: number;
  readonly reason: "lru-bound-exceeded";
  readonly timestamp: number;
}

/** Caller-facing sink signature. Synchronous by contract — the nonce store must not `await` audit. */
export type NonceEvictionSink = (entry: NonceEvictionEntry) => void;

/** Discriminator literal for the entry type — used by union narrowing at emit/export sites. */
export const NONCE_EVICTION_TYPE = "nonce-eviction" as const;

/** The only reason nonces are evicted in the current implementation. */
export const NONCE_EVICTION_REASON = "lru-bound-exceeded" as const;

/** Structural type guard — validates the shape of an incoming audit entry. */
export function isNonceEvictionEntry(value: unknown): value is NonceEvictionEntry {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v["type"] !== NONCE_EVICTION_TYPE) return false;
  if (typeof v["evictedCount"] !== "number") return false;
  if (v["reason"] !== NONCE_EVICTION_REASON) return false;
  if (typeof v["timestamp"] !== "number") return false;
  const scope = v["scope"];
  if (scope === null || typeof scope !== "object") return false;
  const s = scope as Record<string, unknown>;
  return typeof s["keyId"] === "string" && typeof s["snapshotId"] === "string";
}
