import { describe, it, expect } from 'vitest';
import { CompanionMock } from '#harness/companion-mock.ts';
import { ClockMock } from '#harness/clock-mock.ts';
import { verify } from '#harness/hmac-signer.ts';
import {
  validateHandle,
  type ApprovalHandle,
  type BindingContext,
} from '#harness/handle-binding-validator.ts';

function makeRequest(overrides: Partial<Parameters<CompanionMock['decide']>[0]> = {}) {
  return {
    providerId: 'provider-a',
    contentHash: 'sha256-abc',
    sequenceNumber: 1,
    approverPrincipal: 'user@tenant',
    ttlMs: 5_000,
    ...overrides,
  };
}

describe('companion-mock signing round-trip', () => {
  it('allow: signed handle verifies through validator', async () => {
    const clock = new ClockMock({ freezeAtMs: 1_000 });
    const c = new CompanionMock({
      seed: 'seed-integration',
      scenarioId: 'sc-allow',
      clock,
    });
    c.programVerdict({ action: 'allow' });
    const out = await c.decide(makeRequest());
    expect(out.status).toBe('allow');
    if (out.status !== 'allow' && out.status !== 'deny') throw new Error('unreachable');

    const handle: ApprovalHandle = {
      providerId: out.providerId,
      contentHash: out.contentHash,
      sequenceNumber: out.sequenceNumber,
      approverPrincipal: out.approverPrincipal,
      keyId: out.keyId,
      issuedAtMs: out.issuedAtMs,
      ttlMs: out.ttlMs,
      nonce: out.nonce,
      signature: out.signature,
      payload: out.payload,
    };
    const ctx: BindingContext = {
      expectedProviderId: 'provider-a',
      expectedContentHash: 'sha256-abc',
      expectedApproverPrincipal: 'user@tenant',
      lastSequenceNumber: 0,
      seenNonces: new Set<string>(),
      trustedKeyIds: c.trustedKeyIds,
      registry: c.registry,
      nowMs: clock.nowMs(),
    };
    expect(validateHandle(handle, ctx)).toEqual({ ok: true });

    const sig = verify(out.payload, out.signature, c.trustedKeyIds, c.registry);
    expect(sig.ok).toBe(true);
  });

  it('deny: emits signed deny with distinct verdict status', async () => {
    const clock = new ClockMock({ freezeAtMs: 1_000 });
    const c = new CompanionMock({
      seed: 'seed-integration',
      scenarioId: 'sc-deny',
      clock,
    });
    c.programVerdict({ action: 'deny' });
    const out = await c.decide(makeRequest());
    expect(out.status).toBe('deny');
    if (out.status !== 'deny') throw new Error('unreachable');
    expect(
      verify(out.payload, out.signature, c.trustedKeyIds, c.registry).ok
    ).toBe(true);
  });

  it('never: resolves as timeout after 2*TTL (not an infinite hang)', async () => {
    const clock = new ClockMock({ freezeAtMs: 1_000 });
    const c = new CompanionMock({
      seed: 'seed-integration',
      scenarioId: 'sc-never',
      clock,
    });
    c.programVerdict({ action: 'never' });
    const out = await c.decide(makeRequest({ ttlMs: 4_000 }));
    expect(out.status).toBe('timeout');
    if (out.status !== 'timeout') throw new Error('unreachable');
    expect(out.resolvedAtMs).toBe(1_000 + 4_000 * 2);
    expect(clock.nowMs()).toBe(1_000 + 4_000 * 2);
  });

  it('delayMs advances the clock before signing', async () => {
    const clock = new ClockMock({ freezeAtMs: 1_000 });
    const c = new CompanionMock({
      seed: 'seed-integration',
      scenarioId: 'sc-delay',
      clock,
    });
    c.programVerdict({ action: 'allow', delayMs: 500 });
    const out = await c.decide(makeRequest());
    if (out.status !== 'allow') throw new Error('unreachable');
    expect(out.issuedAtMs).toBe(1_500);
    expect(clock.nowMs()).toBe(1_500);
  });

  it('mode switch mid-scenario: signatures remain valid; mode reflected', async () => {
    const clock = new ClockMock({ freezeAtMs: 1_000 });
    const c = new CompanionMock({
      seed: 'seed-integration',
      scenarioId: 'sc-mode',
      clock,
    });
    expect(c.getMode()).toBe('cli-stdin');
    const outA = await c.decide(makeRequest({ sequenceNumber: 1 }));
    expect(outA.status).toBe('allow');
    c.setMode('supervisor-http');
    expect(c.getMode()).toBe('supervisor-http');
    const outB = await c.decide(makeRequest({ sequenceNumber: 2 }));
    expect(outB.status).toBe('allow');
    if (outA.status !== 'allow' || outB.status !== 'allow') throw new Error('unreachable');
    expect(verify(outA.payload, outA.signature, c.trustedKeyIds, c.registry).ok).toBe(true);
    expect(verify(outB.payload, outB.signature, c.trustedKeyIds, c.registry).ok).toBe(true);
    c.setMode('tenant-admin');
    expect(c.getMode()).toBe('tenant-admin');
  });

  it('trustKey / untrustKey + signWithKeyId switches signer', async () => {
    const clock = new ClockMock({ freezeAtMs: 1_000 });
    const c = new CompanionMock({
      seed: 'seed-trust',
      scenarioId: 'sc-trust',
      clock,
    });
    const originalId = c.signingKeyId;
    const sideKey = { keyId: 'k_side-tenant', key: Buffer.from('s'.repeat(32)) };
    c.trustKey(sideKey);
    c.programVerdict({ action: 'allow', signWithKeyId: sideKey.keyId });
    const out = await c.decide(makeRequest());
    if (out.status !== 'allow') throw new Error('unreachable');
    expect(out.keyId).toBe(sideKey.keyId);
    expect(verify(out.payload, out.signature, c.trustedKeyIds, c.registry).ok).toBe(true);
    c.untrustKey(sideKey.keyId);
    expect(c.trustedKeyIds.has(sideKey.keyId)).toBe(false);
    expect(c.trustedKeyIds.has(originalId)).toBe(true);
  });

  it('signWithKeyId throws when key is not in registry', async () => {
    const clock = new ClockMock({ freezeAtMs: 1_000 });
    const c = new CompanionMock({
      seed: 'seed-missing',
      scenarioId: 'sc-missing',
      clock,
    });
    c.programVerdict({ action: 'allow', signWithKeyId: 'k_does-not-exist' });
    await expect(c.decide(makeRequest())).rejects.toThrow(/not in registry/);
  });

  it('rotate: trustedKeyIds decoupled from signing keyId', async () => {
    const clock = new ClockMock({ freezeAtMs: 1_000 });
    const c = new CompanionMock({
      seed: 'seed-rotate',
      scenarioId: 'sc-rotate',
      clock,
    });
    const initialKeyId = c.signingKeyId;
    const outOld = await c.decide(makeRequest({ sequenceNumber: 1 }));
    if (outOld.status !== 'allow') throw new Error('unreachable');
    expect(outOld.keyId).toBe(initialKeyId);

    c.rotateKey('rotation-seed-1');
    expect(c.signingKeyId).not.toBe(initialKeyId);

    const outNew = await c.decide(makeRequest({ sequenceNumber: 2 }));
    if (outNew.status !== 'allow') throw new Error('unreachable');
    expect(outNew.keyId).toBe(c.signingKeyId);
    expect(verify(outNew.payload, outNew.signature, c.trustedKeyIds, c.registry).ok).toBe(true);
    const oldUnderNewTrust = verify(
      outOld.payload,
      outOld.signature,
      c.trustedKeyIds,
      c.registry
    );
    expect(oldUnderNewTrust).toEqual({ ok: false, reason: 'unknown-keyId' });
  });
});
