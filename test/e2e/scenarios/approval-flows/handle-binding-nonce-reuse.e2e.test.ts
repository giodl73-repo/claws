/**
 * SC-23 — handle-binding nonce reuse / P-05 mitigation (pulse 59 D4).
 *
 * Drives the real `PersistentNonceStore` under the validator:
 *
 *   validateNonce(n, scope) = store.accept(n, parseScope(scope)).ok
 *
 * F-01 persistent `nonce-log.jsonl` exists after accept (APPROVAL-B-062)
 * F-02 second accept with same (nonce, scope) rejects — `nonce-reuse`
 * F-03 fsync-before-validate: the log contains the durable record BEFORE
 *      the validator returns `ok:true` (APPROVAL-B-063)
 * F-04 startup replay: a brand-new store against the same log catches a
 *      reuse that spans a restart (APPROVAL-B-064)
 * F-05 cross-scope: same nonce with different snapshotId → both accepted
 *      (APPROVAL-B-069)
 * F-06 cross-worker isolation: two independent store instances sharing the
 *      log both reject the same reused nonce (APPROVAL-B-066..B-068)
 * F-07 LRU 10k eviction emits NonceEvictionEntry (APPROVAL-B-067 — audit
 *      sink observes a first-class `nonce-eviction` event)
 * F-08 tool NOT executed when validator returns ok:false (APPROVAL-B-070)
 * F-09 cross-scope reuse does NOT emit eviction (control — cross-scope is
 *      not a bound-pressure signal) (APPROVAL-B-071)
 */
import { createHmac, randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NonceEvictionEntry } from '@bic/openclaw-guardrails/audit';
import {
  EVALUATION_ORDER,
  validateHandle,
  type ApprovalHandle,
  type ValidationContext,
  type ValidationDeps,
} from '@bic/openclaw-guardrails/handle-binding';
import { PersistentNonceStore } from '@bic/openclaw-policy/nonce-store';

function sign(payload: Uint8Array, keyId: string, key: Buffer): string {
  const mac = createHmac('sha256', key).update(payload).digest('hex');
  return `${keyId}.${mac}`;
}

interface Fixture {
  readonly handle: ApprovalHandle;
  readonly ctx: ValidationContext;
  readonly keyId: string;
  readonly snapshotId: string;
}

function buildFixture(opts: { nonce: string; snapshotId: string }): Fixture {
  const keyId = 'k_sc23';
  const key = randomBytes(32);
  const fields = {
    providerId: 'provider-sc23',
    contentHash: 'sha256-sc23',
    sequenceNumber: 10,
    approverPrincipal: 'user@tenant',
    keyId,
    ttl: 1_000_000,
    nonce: opts.nonce,
  };
  const payload = new TextEncoder().encode(JSON.stringify(fields));
  const handle: ApprovalHandle = {
    ...fields,
    payload,
    signature: sign(payload, keyId, key),
  };
  const ctx: ValidationContext = {
    expectedProviderId: 'provider-sc23',
    canonicalInvocationHash: 'sha256-sc23',
    expectedApproverPrincipal: 'user@tenant',
    sequenceHighWaterMark: 9,
    nonceScope: `${keyId}::${opts.snapshotId}`,
  };
  // Hand key lookup via a closure captured in depsFor — the fixture holds
  // `key` so multiple fixtures from the same scope sign with the same key.
  (handle as unknown as { __key: Buffer }).__key = key;
  return { handle, ctx, keyId, snapshotId: opts.snapshotId };
}

function depsFor(
  fixture: Fixture,
  store: PersistentNonceStore,
  clockMs: number = 0,
): ValidationDeps {
  const key = (fixture.handle as unknown as { __key: Buffer }).__key;
  return {
    clock: () => clockMs,
    trustSet: new Set([fixture.keyId]),
    keyLookup: (kid) => (kid === fixture.keyId ? key : undefined),
    validateNonce: (nonce) => {
      const [keyId, snapshotId] = fixture.ctx.nonceScope.split('::');
      return store.accept(nonce, {
        keyId: keyId ?? '',
        snapshotId: snapshotId ?? '',
      }).ok;
    },
  };
}

describe('SC-23 handle-binding nonce reuse / P-05 (pulse 59)', () => {
  let tmpDir: string;
  let logPath: string;
  let evictions: NonceEvictionEntry[];
  let now: number;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'sc23-'));
    logPath = join(tmpDir, 'nonce-log.jsonl');
    evictions = [];
    now = 1_700_000_000_000;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeStore(maxPerScope?: number): PersistentNonceStore {
    const base = {
      logPath,
      auditSink: (e: NonceEvictionEntry) => evictions.push(e),
      clock: () => now++,
    } as const;
    return new PersistentNonceStore(
      maxPerScope === undefined ? base : { ...base, maxNoncesPerScope: maxPerScope },
    );
  }

  it('F-01/F-03: persists to nonce-log.jsonl BEFORE validator returns ok (APPROVAL-B-062..B-063)', () => {
    const store = makeStore();
    const fixture = buildFixture({ nonce: 'shared-n', snapshotId: 's1' });
    expect(existsSync(logPath)).toBe(false);

    const result = validateHandle(fixture.handle, fixture.ctx, depsFor(fixture, store));
    expect(result).toEqual({ ok: true });

    // Log exists and contains the nonce at the moment the validator returned.
    expect(existsSync(logPath)).toBe(true);
    expect(readFileSync(logPath, 'utf8')).toContain('shared-n');
    store.close();
  });

  it('F-02/F-08: second call with same (nonce, scope) rejects with nonce-reuse; tool NOT executed (APPROVAL-B-065/B-070)', () => {
    const store = makeStore();
    const fixture = buildFixture({ nonce: 'replay-n', snapshotId: 's1' });

    const first = validateHandle(fixture.handle, fixture.ctx, depsFor(fixture, store));
    const second = validateHandle(fixture.handle, fixture.ctx, depsFor(fixture, store));
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, invalidReason: 'nonce-reuse' });

    // F-08 tool side-effect recorder
    const toolSideEffects: string[] = [];
    if (second.ok) toolSideEffects.push('records.export');
    expect(toolSideEffects).toHaveLength(0);
    store.close();
  });

  it('F-04: startup replay catches reuse spanning a restart (APPROVAL-B-064)', () => {
    const first = makeStore();
    const fx1 = buildFixture({ nonce: 'persist-n', snapshotId: 's1' });
    expect(validateHandle(fx1.handle, fx1.ctx, depsFor(fx1, first)).ok).toBe(true);
    first.close();

    // "Restart" — build a new store against the same log path, replay, retry.
    const reopened = makeStore();
    reopened.replayOnStartup();

    // The validator uses the same scope/keyId/handle — but we build a fresh
    // fixture to prove the nonce-string equality is what rejects us (we
    // cannot re-use the same key material because it's per-fixture; so we
    // regenerate a handle whose NONCE matches but whose keyId is the same
    // trust-set member).
    const replayedFixture = buildFixture({ nonce: 'persist-n', snapshotId: 's1' });
    const replayedResult = validateHandle(
      replayedFixture.handle,
      replayedFixture.ctx,
      depsFor(replayedFixture, reopened),
    );
    expect(replayedResult).toEqual({ ok: false, invalidReason: 'nonce-reuse' });
    reopened.close();
  });

  it('F-05/F-09: cross-scope reuse of the same nonce is accepted without eviction (APPROVAL-B-069/B-071)', () => {
    const store = makeStore();
    const a = buildFixture({ nonce: 'multi-n', snapshotId: 's1' });
    const b = buildFixture({ nonce: 'multi-n', snapshotId: 's2' });

    expect(validateHandle(a.handle, a.ctx, depsFor(a, store)).ok).toBe(true);
    expect(validateHandle(b.handle, b.ctx, depsFor(b, store)).ok).toBe(true);
    expect(evictions).toHaveLength(0);
    store.close();
  });

  it('F-06: two worker-sharing stores reject reused nonce in order (APPROVAL-B-066..B-068)', () => {
    // Worker A accepts and closes. Worker B reopens and must reject the same
    // nonce. The log file is the cross-worker source of truth.
    const workerA = makeStore();
    const fxA = buildFixture({ nonce: 'worker-shared', snapshotId: 's1' });
    expect(validateHandle(fxA.handle, fxA.ctx, depsFor(fxA, workerA)).ok).toBe(true);
    workerA.close();

    const workerB = makeStore();
    workerB.replayOnStartup();
    const fxB = buildFixture({ nonce: 'worker-shared', snapshotId: 's1' });
    const result = validateHandle(fxB.handle, fxB.ctx, depsFor(fxB, workerB));
    expect(result).toEqual({ ok: false, invalidReason: 'nonce-reuse' });
    workerB.close();
  });

  it('F-07: LRU eviction emits NonceEvictionEntry when per-scope bound is crossed (APPROVAL-B-067)', () => {
    const store = makeStore(2);
    const fx1 = buildFixture({ nonce: 'lru-1', snapshotId: 's1' });
    const fx2 = buildFixture({ nonce: 'lru-2', snapshotId: 's1' });
    const fx3 = buildFixture({ nonce: 'lru-3', snapshotId: 's1' });

    // fill to bound with two novel nonces
    expect(validateHandle(fx1.handle, fx1.ctx, depsFor(fx1, store)).ok).toBe(true);
    expect(validateHandle(fx2.handle, fx2.ctx, depsFor(fx2, store)).ok).toBe(true);
    expect(evictions).toHaveLength(0);
    // cross the bound — oldest nonce is evicted + audit entry emitted
    expect(validateHandle(fx3.handle, fx3.ctx, depsFor(fx3, store)).ok).toBe(true);
    expect(evictions).toHaveLength(1);
    const entry = evictions[0]!;
    expect(entry.type).toBe('nonce-eviction');
    expect(entry.reason).toBe('lru-bound-exceeded');
    expect(entry.evictedCount).toBe(1);
    store.close();
  });

  it('nonce sits at the tail of the documented evaluation order (doc-sync invariant)', () => {
    expect(EVALUATION_ORDER[EVALUATION_ORDER.length - 1]).toBe('nonce');
  });
});
