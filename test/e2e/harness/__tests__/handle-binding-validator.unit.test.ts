import { describe, it, expect } from 'vitest';
import {
  validateHandle,
  type ApprovalHandle,
  type BindingContext,
} from '#harness/handle-binding-validator.ts';
import {
  deriveKey,
  sign,
  KeyRegistry,
} from '#harness/hmac-signer.ts';

function buildHandle(overrides: Partial<ApprovalHandle> = {}): {
  handle: ApprovalHandle;
  ctx: BindingContext;
} {
  const reg = new KeyRegistry();
  const k = deriveKey('seed', 'scenario-1');
  reg.register(k);

  const baseFields = {
    providerId: 'provider-a',
    contentHash: 'sha256-abc',
    sequenceNumber: 10,
    approverPrincipal: 'user@tenant',
    keyId: k.keyId,
    issuedAtMs: 1_000,
    ttlMs: 5_000,
    nonce: 'nonce-1',
  };
  const payload = new TextEncoder().encode(JSON.stringify(baseFields));
  const signature = sign(payload, k);
  const handle: ApprovalHandle = {
    ...baseFields,
    signature,
    payload,
    ...overrides,
  };
  const ctx: BindingContext = {
    expectedProviderId: 'provider-a',
    expectedContentHash: 'sha256-abc',
    expectedApproverPrincipal: 'user@tenant',
    lastSequenceNumber: 9,
    seenNonces: new Set<string>(),
    trustedKeyIds: new Set([k.keyId]),
    registry: reg,
    nowMs: 2_000,
  };
  return { handle, ctx };
}

describe('handle-binding-validator', () => {
  it('accepts a fully correct handle', () => {
    const { handle, ctx } = buildHandle();
    expect(validateHandle(handle, ctx)).toEqual({ ok: true });
  });

  it('rejects provider-id-mismatch', () => {
    const { handle, ctx } = buildHandle();
    ctx.expectedProviderId = 'provider-z';
    expect(validateHandle(handle, ctx)).toEqual({
      ok: false,
      reason: 'provider-id-mismatch',
    });
  });

  it('rejects content-hash-mismatch', () => {
    const { handle, ctx } = buildHandle();
    ctx.expectedContentHash = 'sha256-other';
    expect(validateHandle(handle, ctx)).toEqual({
      ok: false,
      reason: 'content-hash-mismatch',
    });
  });

  it('rejects sequence-rollback', () => {
    const { handle, ctx } = buildHandle();
    ctx.lastSequenceNumber = 10;
    expect(validateHandle(handle, ctx)).toEqual({
      ok: false,
      reason: 'sequence-rollback',
    });
  });

  it('rejects principal-mismatch', () => {
    const { handle, ctx } = buildHandle();
    ctx.expectedApproverPrincipal = 'someone-else@tenant';
    expect(validateHandle(handle, ctx)).toEqual({
      ok: false,
      reason: 'principal-mismatch',
    });
  });

  it('rejects unknown-keyId (keyId field not in trusted set)', () => {
    const { handle, ctx } = buildHandle();
    const divergent: ApprovalHandle = { ...handle, keyId: 'k_claimed-other' };
    expect(validateHandle(divergent, ctx)).toEqual({
      ok: false,
      reason: 'unknown-keyId',
    });
  });

  it('rejects pre-check unknown-keyId when signature keyId is untrusted', () => {
    const { handle, ctx } = buildHandle();
    ctx.trustedKeyIds = new Set(['k_nobody']);
    expect(validateHandle(handle, ctx)).toEqual({
      ok: false,
      reason: 'unknown-keyId',
    });
  });

  it('rejects ttl-expired', () => {
    const { handle, ctx } = buildHandle();
    ctx.nowMs = handle.issuedAtMs + handle.ttlMs + 1;
    expect(validateHandle(handle, ctx)).toEqual({
      ok: false,
      reason: 'ttl-expired',
    });
  });

  it('rejects nonce-reuse', () => {
    const { handle, ctx } = buildHandle();
    ctx.seenNonces.add(handle.nonce);
    expect(validateHandle(handle, ctx)).toEqual({
      ok: false,
      reason: 'nonce-reuse',
    });
  });

  it('multi-field-wrong: reports first failure in deterministic order', () => {
    const { handle, ctx } = buildHandle();
    ctx.expectedProviderId = 'provider-z';
    ctx.expectedContentHash = 'sha256-other';
    ctx.lastSequenceNumber = 100;
    ctx.expectedApproverPrincipal = 'else@tenant';
    ctx.nowMs = handle.issuedAtMs + handle.ttlMs + 1;
    ctx.seenNonces.add(handle.nonce);
    expect(validateHandle(handle, ctx)).toEqual({
      ok: false,
      reason: 'provider-id-mismatch',
    });
  });

  it('signature pre-check short-circuits before field checks', () => {
    const { handle, ctx } = buildHandle();
    const bad: ApprovalHandle = {
      ...handle,
      signature: `${handle.keyId}.deadbeef`,
    };
    ctx.expectedProviderId = 'provider-z';
    expect(validateHandle(bad, ctx)).toEqual({
      ok: false,
      reason: 'signature-mismatch',
    });
  });
});
