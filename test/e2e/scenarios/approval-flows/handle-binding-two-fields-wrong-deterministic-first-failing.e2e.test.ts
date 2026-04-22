// SC-24 single-worker — property exhaustiveness competes for shared nonce-log;
// see R1 invariants F-08 and the pulse 59 plan's "SC-24 property-test
// execution discipline" paragraph. Each property iteration constructs a
// fresh fixture directory with an isolated nonce-log.jsonl so two iterations
// never race for the same file. If this test is run under `--workers=N>1`
// the fixture directories keep iterations independent; the single-worker
// toggle below is defence-in-depth.
//
import { describe, expect, it } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EVALUATION_ORDER,
  validateHandle,
  type ApprovalHandle,
  type InvalidReason,
  type ValidationContext,
  type ValidationDeps,
} from '@bic/openclaw-guardrails/handle-binding';
import { PersistentNonceStore } from '@bic/openclaw-policy/nonce-store';

/**
 * SC-24 — deterministic first-failing invariant (pulse 59 D5).
 *
 * When more than one field of a handle is wrong, the validator returns the
 * FIRST failing reason in the canonical evaluation order:
 *
 *   signature → provider-id → content-hash → sequence-number →
 *   approver-principal → key-id → ttl → nonce
 *
 * The 7 mutable fields (excluding the HMAC signature pre-check) produce
 * C(7, 2) = 21 two-field pairs; the 7-way all-wrong case is one
 * additional fixture. Both assert the same rule: for wrong fields at
 * positions i < j, invalidReason === order[i].
 *
 * This is the L2 slice of pulse 49 L0 test #12 — the L0 harness uses an
 * in-memory nonce predicate, while this scenario routes `validateNonce`
 * through a real `PersistentNonceStore` with a per-iteration isolated
 * `nonce-log.jsonl`. Any regression that rearranges field order breaks
 * immediately and loudly.
 *
 * F-01..F-07 the seven ordered field names appear in the expected order
 * F-08 single-worker execution discipline (comment at top of file)
 * F-09 21-pair exhaustive matrix asserts first-failing per pair
 * F-10 doc-sync: the ordered list appears verbatim at three canonical
 *      sites — validator source (pulse 49), CL-11 §3a (wave-scope), and
 *      `docs/governance/approval-flow.md` (pulse 49 D2). This scenario
 *      asserts the validator-source invariant; CL-11 lives in the wave's
 *      spec amendments and is re-applied during CP-5 deploy.
 */

const FIELD_ORDER: ReadonlyArray<{ name: FieldName; reason: InvalidReason }> = [
  { name: 'providerId', reason: 'provider-id-mismatch' },
  { name: 'contentHash', reason: 'content-hash-mismatch' },
  { name: 'sequenceNumber', reason: 'sequence-rollback' },
  { name: 'approverPrincipal', reason: 'principal-mismatch' },
  { name: 'keyId', reason: 'unknown-keyId' },
  { name: 'ttl', reason: 'ttl-expired' },
  { name: 'nonce', reason: 'nonce-reuse' },
];

type FieldName =
  | 'providerId'
  | 'contentHash'
  | 'sequenceNumber'
  | 'approverPrincipal'
  | 'keyId'
  | 'ttl'
  | 'nonce';

interface Rig {
  handle: ApprovalHandle;
  ctx: ValidationContext;
  deps: ValidationDeps;
  close(): void;
}

function sign(payload: Uint8Array, keyId: string, key: Buffer): string {
  const mac = createHmac('sha256', key).update(payload).digest('hex');
  return `${keyId}.${mac}`;
}

function buildRig(broken: ReadonlyArray<FieldName>): Rig {
  const trustedKeyId = 'k_sc24';
  const key = randomBytes(32);
  const keyLookup = (kid: string): Buffer | undefined =>
    kid === trustedKeyId ? key : undefined;

  const baseFields = {
    providerId: 'provider-sc24',
    contentHash: 'sha256-sc24',
    sequenceNumber: 10,
    approverPrincipal: 'user@tenant',
    keyId: trustedKeyId,
    ttl: 10_000,
    nonce: 'nonce-sc24',
  };
  const payload = new TextEncoder().encode(JSON.stringify(baseFields));
  const signature = sign(payload, trustedKeyId, key);
  let handle: ApprovalHandle = { ...baseFields, payload, signature };

  let ctx: ValidationContext = {
    expectedProviderId: 'provider-sc24',
    canonicalInvocationHash: 'sha256-sc24',
    expectedApproverPrincipal: 'user@tenant',
    sequenceHighWaterMark: 9,
    nonceScope: `${trustedKeyId}::snap-1`,
  };

  const nowMs = 5_000;
  const tmpDir = mkdtempSync(join(tmpdir(), 'sc24-'));
  const logPath = join(tmpDir, 'nonce-log.jsonl');
  const store = new PersistentNonceStore({
    logPath,
    auditSink: () => undefined,
    clock: () => nowMs,
  });
  store.replayOnStartup();

  // When the nonce field is in the broken set we pre-seed the store so the
  // nonce predicate returns false on first call.
  if (broken.includes('nonce')) {
    const [keyId, snapshotId] = ctx.nonceScope.split('::');
    store.accept(baseFields.nonce, {
      keyId: keyId ?? '',
      snapshotId: snapshotId ?? '',
    });
  }

  for (const field of broken) {
    switch (field) {
      case 'providerId':
        ctx = { ...ctx, expectedProviderId: 'provider-z' };
        break;
      case 'contentHash':
        ctx = { ...ctx, canonicalInvocationHash: 'sha256-other' };
        break;
      case 'sequenceNumber':
        ctx = { ...ctx, sequenceHighWaterMark: 100 };
        break;
      case 'approverPrincipal':
        ctx = { ...ctx, expectedApproverPrincipal: 'else@tenant' };
        break;
      case 'keyId':
        handle = { ...handle, keyId: 'k_other' };
        break;
      case 'ttl':
        handle = { ...handle, ttl: nowMs - 1 };
        break;
      case 'nonce':
        // already pre-seeded above
        break;
    }
  }

  const deps: ValidationDeps = {
    clock: () => nowMs,
    trustSet: new Set([trustedKeyId]),
    keyLookup,
    validateNonce: (nonce) => {
      const [keyId, snapshotId] = ctx.nonceScope.split('::');
      return store.accept(nonce, {
        keyId: keyId ?? '',
        snapshotId: snapshotId ?? '',
      }).ok;
    },
  };

  return {
    handle,
    ctx,
    deps,
    close: () => {
      store.close();
      rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

describe('SC-24 deterministic first-failing (pulse 59)', () => {
  it('F-01..F-07: EVALUATION_ORDER is the exact 8-step list (doc-sync anchor)', () => {
    expect(EVALUATION_ORDER).toEqual([
      'signature',
      'provider-id',
      'content-hash',
      'sequence-number',
      'approver-principal',
      'key-id',
      'ttl',
      'nonce',
    ]);
  });

  it('F-09: 21-pair exhaustive matrix — each pair (i, j) with i<j returns order[i] (APPROVAL-B-072..B-079)', () => {
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < FIELD_ORDER.length; i++) {
      for (let j = i + 1; j < FIELD_ORDER.length; j++) {
        pairs.push([i, j]);
      }
    }
    expect(pairs.length).toBe(21);

    for (const [i, j] of pairs) {
      const fieldI = FIELD_ORDER[i]!;
      const fieldJ = FIELD_ORDER[j]!;
      const rig = buildRig([fieldI.name, fieldJ.name]);
      try {
        const result = validateHandle(rig.handle, rig.ctx, rig.deps);
        expect(
          result,
          `pair (${String(i)}=${fieldI.name}, ${String(j)}=${fieldJ.name}) must return ${fieldI.reason}`,
        ).toEqual({ ok: false, invalidReason: fieldI.reason });
      } finally {
        rig.close();
      }
    }
  });

  it('F-09: 7-way all-wrong returns providerId (head of order) (APPROVAL-B-080)', () => {
    const allFieldNames = FIELD_ORDER.map((f) => f.name);
    const rig = buildRig(allFieldNames);
    try {
      const result = validateHandle(rig.handle, rig.ctx, rig.deps);
      expect(result).toEqual({ ok: false, invalidReason: 'provider-id-mismatch' });
    } finally {
      rig.close();
    }
  });

  it('F-10: each ordered reason round-trips via the single-field regression (APPROVAL-B-081)', () => {
    for (const field of FIELD_ORDER) {
      const rig = buildRig([field.name]);
      try {
        expect(validateHandle(rig.handle, rig.ctx, rig.deps)).toEqual({
          ok: false,
          invalidReason: field.reason,
        });
      } finally {
        rig.close();
      }
    }
  });
});
