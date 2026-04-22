/**
 * SC-22 — handle-binding TTL expiry (pulse 59 D3).
 *
 * A correctly-signed handle whose absolute `ttl` has already passed is
 * rejected with `invalidReason: 'ttl-expired'` and the tool is NOT executed.
 * The fake clock advances past the handle's TTL between issue and approve;
 * every other field is well-formed so the validator could only fail on TTL.
 *
 * Scenario codes APPROVAL-B-054..B-061.
 *
 * F-01 signed, well-formed handle → fails on TTL alone
 * F-02 clock advance past ttl → `ttl-expired`
 * F-03 DecisionEntry.decision === 'deny' (modeled via the validator's
 *      short-circuit — callers translate `ok:false` into a deny)
 * F-04 tool side-effect recorder observes zero invocations
 * F-05 a ttl still in the future passes (control case)
 * F-06 the validator returns the same result whether clock advances 1ms or
 *      1 hour past expiry — TTL is a boundary predicate, not time-of-day
 * F-07 fakeClock.advance(1001) with TTL=1000 produces deterministic expiry
 * F-08 generator-enforced ttl floor is tested at the generator layer (pulse
 *      53); see the companion validator test. Here we assert the runtime
 *      still rejects a pathologically short TTL with the same invalidReason.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  EVALUATION_ORDER,
  validateHandle,
  type ApprovalHandle,
  type ValidationContext,
  type ValidationDeps,
} from '@bic/openclaw-guardrails/handle-binding';

function sign(payload: Uint8Array, keyId: string, key: Buffer): string {
  const mac = createHmac('sha256', key).update(payload).digest('hex');
  return `${keyId}.${mac}`;
}

interface FakeClock {
  nowMs(): number;
  advance(ms: number): void;
}

function makeFakeClock(initial: number): FakeClock {
  let t = initial;
  return {
    nowMs: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
}

function buildHandle(ttlAbsolute: number): {
  handle: ApprovalHandle;
  ctx: ValidationContext;
  depsFor: (clock: FakeClock) => ValidationDeps;
} {
  const keyId = 'k_sc22';
  const key = randomBytes(32);
  const fields = {
    providerId: 'provider-sc22',
    contentHash: 'sha256-sc22',
    sequenceNumber: 10,
    approverPrincipal: 'user@tenant',
    keyId,
    ttl: ttlAbsolute,
    nonce: 'nonce-sc22',
  };
  const payload = new TextEncoder().encode(JSON.stringify(fields));
  const handle: ApprovalHandle = {
    ...fields,
    payload,
    signature: sign(payload, keyId, key),
  };
  const ctx: ValidationContext = {
    expectedProviderId: 'provider-sc22',
    canonicalInvocationHash: 'sha256-sc22',
    expectedApproverPrincipal: 'user@tenant',
    sequenceHighWaterMark: 9,
    nonceScope: 'scenario-sc22',
  };
  return {
    handle,
    ctx,
    depsFor: (clock) => ({
      clock: () => clock.nowMs(),
      trustSet: new Set([keyId]),
      keyLookup: (kid) => (kid === keyId ? key : undefined),
      validateNonce: () => true,
    }),
  };
}

describe('SC-22 handle-binding TTL expiry (pulse 59)', () => {
  it('F-01/F-02/F-07: fakeClock.advance(1001) past ttl=1000 returns ttl-expired (APPROVAL-B-054..B-056)', () => {
    const clock = makeFakeClock(0);
    const ttl = 1000;
    const { handle, ctx, depsFor } = buildHandle(ttl);

    clock.advance(1001);

    const result = validateHandle(handle, ctx, depsFor(clock));
    expect(result).toEqual({ ok: false, invalidReason: 'ttl-expired' });
  });

  it('F-03/F-04: tool NOT executed when validator returns ok:false (APPROVAL-B-057..B-058)', () => {
    const clock = makeFakeClock(0);
    const ttl = 1000;
    const { handle, ctx, depsFor } = buildHandle(ttl);
    clock.advance(1001);

    const toolSideEffects: Array<{ tool: string; args: unknown }> = [];
    const executeIfAllowed = (): void => {
      const result = validateHandle(handle, ctx, depsFor(clock));
      if (result.ok) {
        toolSideEffects.push({ tool: 'records.export', args: { id: 1 } });
      }
    };
    executeIfAllowed();
    expect(toolSideEffects).toHaveLength(0);
  });

  it('F-05 control: a ttl in the future passes', () => {
    const clock = makeFakeClock(0);
    const ttl = 10_000;
    const { handle, ctx, depsFor } = buildHandle(ttl);
    clock.advance(500);

    expect(validateHandle(handle, ctx, depsFor(clock))).toEqual({ ok: true });
  });

  it('F-06: same ttl-expired reason whether clock advances 1ms or 1 hour past ttl (APPROVAL-B-059)', () => {
    const baseTtl = 1_000;
    for (const advancePastTtl of [1, 60 * 60 * 1000]) {
      const clock = makeFakeClock(0);
      const { handle, ctx, depsFor } = buildHandle(baseTtl);
      clock.advance(baseTtl + advancePastTtl);
      expect(validateHandle(handle, ctx, depsFor(clock))).toEqual({
        ok: false,
        invalidReason: 'ttl-expired',
      });
    }
  });

  it('F-08: runtime rejects a pathologically short ttl with the canonical reason (APPROVAL-B-060..B-061)', () => {
    const clock = makeFakeClock(0);
    // Even a 1ms TTL is rejected the moment the clock advances past it; the
    // generator-enforced 100ms floor is enforced at declaration-compile time
    // (pulse 53) and does not weaken the runtime predicate.
    const ttl = 1;
    const { handle, ctx, depsFor } = buildHandle(ttl);
    clock.advance(2);
    expect(validateHandle(handle, ctx, depsFor(clock))).toEqual({
      ok: false,
      invalidReason: 'ttl-expired',
    });
  });

  it('evaluation order places ttl between key-id and nonce (doc-sync invariant)', () => {
    const ttlIdx = EVALUATION_ORDER.indexOf('ttl');
    const keyIdIdx = EVALUATION_ORDER.indexOf('key-id');
    const nonceIdx = EVALUATION_ORDER.indexOf('nonce');
    expect(keyIdIdx).toBeLessThan(ttlIdx);
    expect(ttlIdx).toBeLessThan(nonceIdx);
  });
});
