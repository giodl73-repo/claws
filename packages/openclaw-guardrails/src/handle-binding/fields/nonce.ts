import type { InvalidReason } from "../types.js";

export interface NonceInput {
  readonly nonce: string;
  readonly scope: string;
  readonly validateNonce: (nonce: string, scope: string) => boolean;
}

/**
 * Delegates to the injected `validateNonce` predicate. The validator is pure;
 * the nonce-log.jsonl store is constructed and owned by pulse 59.
 * `validateNonce` returns `true` when the nonce is fresh, `false` on reuse.
 */
export function checkNonce(input: NonceInput): InvalidReason | null {
  return input.validateNonce(input.nonce, input.scope) ? null : "nonce-reuse";
}
