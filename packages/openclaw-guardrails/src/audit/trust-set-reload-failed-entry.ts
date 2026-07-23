/**
 * @bic/openclaw-guardrails/audit — TrustSetReloadFailedEntry (CL-11 §3a).
 *
 * Emitted by the trust-set loader (`@bic/openclaw-policy/trust-set`) when an
 * `fs.watch` event fires but the newly-read `trust-set.json` fails to parse.
 * The previous in-memory trust-set continues to authorize; this entry is the
 * audit record of the failed rotation attempt.
 *
 * Per pulse 50 deliverable D2 and PITFALLS.md P-04. A reload failure is a
 * first-class security event because a rotation that silently reverts to the
 * prior keys masks a botched rotation.
 *
 * @module @bic/openclaw-guardrails/audit/trust-set-reload-failed-entry
 */

/** Fields recorded on a trust-set reload failure. */
export interface TrustSetReloadFailedEntry {
  readonly type: "trust-set-reload-failed";
  /** Absolute path of the `trust-set.json` file that was being re-read. */
  readonly path: string;
  /** Parse error message surfaced to the audit sink. */
  readonly error: string;
  /** Epoch millis of the most recent successful reload (or load at construction). */
  readonly lastSuccessfulReloadAt: number;
  /** Epoch millis when the failing reload attempt was made. */
  readonly attemptedAt: number;
  /** True if `attemptedAt - lastSuccessfulReloadAt` has crossed the 30s staleness budget. */
  readonly stale: boolean;
}

/** Caller-facing sink signature. Synchronous by contract — the loader must not `await` audit. */
export type TrustSetReloadFailedSink = (entry: TrustSetReloadFailedEntry) => void;

/** Discriminator literal for the entry type — used by union narrowing at emit/export sites. */
export const TRUST_SET_RELOAD_FAILED_TYPE = "trust-set-reload-failed" as const;

/** Structural type guard — validates the shape of an incoming audit entry. */
export function isTrustSetReloadFailedEntry(value: unknown): value is TrustSetReloadFailedEntry {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v["type"] === TRUST_SET_RELOAD_FAILED_TYPE &&
    typeof v["path"] === "string" &&
    typeof v["error"] === "string" &&
    typeof v["lastSuccessfulReloadAt"] === "number" &&
    typeof v["attemptedAt"] === "number" &&
    typeof v["stale"] === "boolean"
  );
}
