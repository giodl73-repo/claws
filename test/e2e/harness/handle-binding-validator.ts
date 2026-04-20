import { verify, type KeyRegistry } from './hmac-signer.ts';

export type ApprovalInvalidReason =
  | 'provider-id-mismatch'
  | 'content-hash-mismatch'
  | 'sequence-rollback'
  | 'principal-mismatch'
  | 'unknown-keyId'
  | 'ttl-expired'
  | 'nonce-reuse'
  | 'signature-mismatch';

export interface ApprovalHandle {
  providerId: string;
  contentHash: string;
  sequenceNumber: number;
  approverPrincipal: string;
  keyId: string;
  issuedAtMs: number;
  ttlMs: number;
  nonce: string;
  signature: string;
  payload: Uint8Array;
}

export interface BindingContext {
  expectedProviderId: string;
  expectedContentHash: string;
  expectedApproverPrincipal: string;
  lastSequenceNumber: number;
  seenNonces: Set<string>;
  trustedKeyIds: Set<string>;
  registry: KeyRegistry;
  nowMs: number;
}

export type ValidationResult = { ok: true } | { ok: false; reason: ApprovalInvalidReason };

export function validateHandle(
  handle: ApprovalHandle,
  ctx: BindingContext
): ValidationResult {
  const sig = verify(handle.payload, handle.signature, ctx.trustedKeyIds, ctx.registry);
  if (!sig.ok) {
    if (sig.reason === 'unknown-keyId') {
      return { ok: false, reason: 'unknown-keyId' };
    }
    return { ok: false, reason: 'signature-mismatch' };
  }

  if (handle.providerId !== ctx.expectedProviderId) {
    return { ok: false, reason: 'provider-id-mismatch' };
  }
  if (handle.contentHash !== ctx.expectedContentHash) {
    return { ok: false, reason: 'content-hash-mismatch' };
  }
  if (handle.sequenceNumber <= ctx.lastSequenceNumber) {
    return { ok: false, reason: 'sequence-rollback' };
  }
  if (handle.approverPrincipal !== ctx.expectedApproverPrincipal) {
    return { ok: false, reason: 'principal-mismatch' };
  }
  if (!ctx.trustedKeyIds.has(handle.keyId)) {
    return { ok: false, reason: 'unknown-keyId' };
  }
  if (ctx.nowMs >= handle.issuedAtMs + handle.ttlMs) {
    return { ok: false, reason: 'ttl-expired' };
  }
  if (ctx.seenNonces.has(handle.nonce)) {
    return { ok: false, reason: 'nonce-reuse' };
  }
  return { ok: true };
}
