/**
 * L1 test for the promote idempotency cache added in CP-11 R1 (gw-r1 W2).
 * Spec anchor: snap.md §Promotion L106 — "Server persists idempotency_key
 * → first_response for ≥24h; retries with the same key return the cached
 * response."
 *
 * Asserts both responses are byte-identical AND the audit sink only fires
 * once.
 */

import { describe, it, expect } from 'vitest';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';
import { computePolicyId, computeSnapshotId, POLICY_IR_PATH } from '../../src/canonical.js';
import {
  dispatch,
  type HandlerDeps,
  type IdempotencyCache,
  type IdempotencyCacheEntry,
} from '../../src/server/handlers.js';
import type { AuditSink } from '../../src/server/audit.js';
import type { Snapshot } from '../../src/types.js';

function makeCache(): IdempotencyCache {
  const store = new Map<string, IdempotencyCacheEntry>();
  return {
    get: (k): IdempotencyCacheEntry | undefined => {
      const e = store.get(k);
      if (e === undefined) return undefined;
      if (e.expiresAt <= Date.now()) return undefined;
      return e;
    },
    set: (k, e): void => {
      store.set(k, e);
    },
  };
}

describe('idempotency cache — promote retries return cached response', () => {
  it('same Idempotency-Key twice → identical body + one audit event', async () => {
    const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [] };
    ir['policyId'] = computePolicyId(ir);
    const files = { [POLICY_IR_PATH]: JSON.stringify(ir) };
    const id = computeSnapshotId(files);
    const snap: Snapshot = {
      id,
      files,
      createdAt: '2026-04-18T00:00:00.000Z',
      author: 'alice',
      status: 'draft',
    };
    const store = inMemoryStore();
    await store.put(snap);

    const events: unknown[] = [];
    const auditSink: AuditSink = async (e): Promise<void> => {
      events.push(e);
    };
    const deps: HandlerDeps = {
      store,
      computeSnapshotId,
      auditSink,
      idempotencyCache: makeCache(),
    };

    const req = {
      method: 'POST',
      path: `/v1/snapshots/${id}/promote`,
      query: {},
      headers: { 'idempotency-key': 'retry-me' },
      body: {},
    } as const;

    const first = await dispatch(deps, req);
    const second = await dispatch(deps, req);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(JSON.stringify(second.body)).toBe(JSON.stringify(first.body));
    expect(events.length).toBe(1);
  });

  it('different Idempotency-Key re-executes (separate cache entries)', async () => {
    const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [] };
    ir['policyId'] = computePolicyId(ir);
    const files = { [POLICY_IR_PATH]: JSON.stringify(ir) };
    const id = computeSnapshotId(files);
    const store = inMemoryStore();
    await store.put({
      id,
      files,
      createdAt: '2026-04-18T00:00:00.000Z',
      author: 'alice',
      status: 'draft',
    });

    const events: unknown[] = [];
    const deps: HandlerDeps = {
      store,
      computeSnapshotId,
      auditSink: async (e): Promise<void> => {
        events.push(e);
      },
      idempotencyCache: makeCache(),
    };

    await dispatch(deps, {
      method: 'POST',
      path: `/v1/snapshots/${id}/promote`,
      query: {},
      headers: { 'idempotency-key': 'k-A' },
      body: {},
    });
    await dispatch(deps, {
      method: 'POST',
      path: `/v1/snapshots/${id}/promote`,
      query: {},
      headers: { 'idempotency-key': 'k-B' },
      body: {},
    });
    expect(events.length).toBe(2);
  });
});
