/**
 * @bic/openclaw-guardrails — handle-binding InvalidReason union.
 *
 * Canonical 8-value enumeration per CL-11 §3a. Matches the
 * `ApprovalInvalidReason` harness union (test/e2e/harness/audit-types.ts) but
 * is re-declared at the library boundary so production code does not depend on
 * the e2e harness.
 *
 * The 7 bound fields plus the HMAC signature pre-check are evaluated in this
 * order by `validateHandle`; on multi-field failure the first-failing reason
 * is returned:
 *
 *   1. `signature-mismatch`       (pre-check; short-circuits before field order)
 *   2. `provider-id-mismatch`
 *   3. `content-hash-mismatch`
 *   4. `sequence-rollback`
 *   5. `principal-mismatch`
 *   6. `unknown-keyId`
 *   7. `ttl-expired`
 *   8. `nonce-reuse`
 */

export type InvalidReason =
  | "provider-id-mismatch"
  | "content-hash-mismatch"
  | "sequence-rollback"
  | "principal-mismatch"
  | "unknown-keyId"
  | "ttl-expired"
  | "nonce-reuse"
  | "signature-mismatch";
