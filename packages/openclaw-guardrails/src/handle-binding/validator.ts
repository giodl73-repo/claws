/**
 * @bic/openclaw-guardrails — handle-binding validator.
 *
 * Evaluates an `approvalHandle` in the canonical first-failing order:
 *
 *   signature pre-check → providerId → contentHash → sequenceNumber →
 *   approverPrincipal → keyId → ttl → nonce
 *
 * Per CL-07 amendment §1a + CL-11 amendment §3a. Pure function — all effects
 * (`clock`, nonce-store, key registry) are injected via `deps`. The validator
 * returns the FIRST failing reason as `invalidReason`; it never returns a
 * composite or an array. Pulse 59 SC-24 asserts this invariant across the
 * 21-pair exhaustive matrix; pulse 49 test #12 is the L0 slice.
 *
 * @module @bic/openclaw-guardrails/handle-binding/validator
 */

import type { InvalidReason } from "./types.js";
import { checkSignature } from "./fields/signature.js";
import { checkProviderId } from "./fields/provider-id.js";
import { checkContentHash } from "./fields/content-hash.js";
import { checkSequenceNumber } from "./fields/sequence-number.js";
import { checkApproverPrincipal } from "./fields/approver-principal.js";
import { checkKeyId } from "./fields/key-id.js";
import { checkTtl } from "./fields/ttl.js";
import { checkNonce } from "./fields/nonce.js";

/**
 * The signed handle a companion produced. `ttl` is the absolute expiry
 * instant in epoch milliseconds (not a relative duration); `payload` is the
 * byte slice the signer HMAC'd.
 */
export interface ApprovalHandle {
  readonly providerId: string;
  readonly contentHash: string;
  readonly sequenceNumber: number;
  readonly approverPrincipal: string;
  readonly keyId: string;
  readonly ttl: number;
  readonly nonce: string;
  readonly signature: string;
  readonly payload: Uint8Array;
}

/**
 * Everything the host must supply per-invocation: the canonical invocation
 * hash (P-02), the companion-expected principal + provider, the sequence
 * high-water mark, and the scope string used to key the nonce-log.
 */
export interface ValidationContext {
  readonly expectedProviderId: string;
  readonly canonicalInvocationHash: string;
  readonly expectedApproverPrincipal: string;
  readonly sequenceHighWaterMark: number;
  readonly nonceScope: string;
}

/**
 * Injected dependencies. Tests pass fake clocks, synchronous nonce predicates,
 * and in-memory key registries; production wiring (pulse 59 + HostAdapter)
 * supplies the real persistent stores.
 */
export interface ValidationDeps {
  readonly clock: () => number;
  readonly trustSet: ReadonlySet<string>;
  readonly keyLookup: (keyId: string) => Buffer | undefined;
  readonly validateNonce: (nonce: string, scope: string) => boolean;
}

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly invalidReason: InvalidReason };

/**
 * Canonical first-failing order. Consumed by the validator and asserted by
 * the property test in pulse 59 SC-24. Duplicated verbatim in CL-11 §3a and
 * `docs/governance/approval-flow.md` — any change must land in lockstep.
 */
export const EVALUATION_ORDER = [
  "signature",
  "provider-id",
  "content-hash",
  "sequence-number",
  "approver-principal",
  "key-id",
  "ttl",
  "nonce",
] as const;

export function validateHandle(
  handle: ApprovalHandle,
  ctx: ValidationContext,
  deps: ValidationDeps,
): ValidationResult {
  const sigResult = checkSignature({
    payload: handle.payload,
    signature: handle.signature,
    trustSet: deps.trustSet,
    keyLookup: deps.keyLookup,
  });
  if (sigResult !== null) {
    return { ok: false, invalidReason: sigResult };
  }

  const providerResult = checkProviderId({
    handleProviderId: handle.providerId,
    expectedProviderId: ctx.expectedProviderId,
  });
  if (providerResult !== null) {
    return { ok: false, invalidReason: providerResult };
  }

  const hashResult = checkContentHash({
    handleContentHash: handle.contentHash,
    canonicalInvocationHash: ctx.canonicalInvocationHash,
  });
  if (hashResult !== null) {
    return { ok: false, invalidReason: hashResult };
  }

  const seqResult = checkSequenceNumber({
    handleSequenceNumber: handle.sequenceNumber,
    highWaterMark: ctx.sequenceHighWaterMark,
  });
  if (seqResult !== null) {
    return { ok: false, invalidReason: seqResult };
  }

  const principalResult = checkApproverPrincipal({
    handleApproverPrincipal: handle.approverPrincipal,
    expectedApproverPrincipal: ctx.expectedApproverPrincipal,
  });
  if (principalResult !== null) {
    return { ok: false, invalidReason: principalResult };
  }

  const keyResult = checkKeyId({
    handleKeyId: handle.keyId,
    trustSet: deps.trustSet,
  });
  if (keyResult !== null) {
    return { ok: false, invalidReason: keyResult };
  }

  const ttlResult = checkTtl({
    handleTtl: handle.ttl,
    clock: deps.clock,
  });
  if (ttlResult !== null) {
    return { ok: false, invalidReason: ttlResult };
  }

  const nonceResult = checkNonce({
    nonce: handle.nonce,
    scope: ctx.nonceScope,
    validateNonce: deps.validateNonce,
  });
  if (nonceResult !== null) {
    return { ok: false, invalidReason: nonceResult };
  }

  return { ok: true };
}
