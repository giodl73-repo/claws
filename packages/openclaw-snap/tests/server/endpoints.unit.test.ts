/**
 * HTTP endpoint unit tests — one per kept endpoint group.
 *
 * 5 groups map to 9 endpoints:
 *   1. upload     → POST /v1/snapshots
 *   2. list+get   → GET  /v1/snapshots, GET /v1/snapshots/:id
 *   3. promote    → POST /v1/snapshots/:id/promote
 *   4. rollback   → POST /v1/snapshots/:id/rollback
 *   5. read-only  → GET  /v1/policy/current, /v1/resolve, /v1/snapshots/:id/resolve, /v1/healthz
 */

import { describe, it, expect } from 'vitest';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';
import { computeSnapshotId, POLICY_IR_PATH, computePolicyId } from '../../src/canonical.js';
import { dispatch, type HandlerDeps, type SnapRequest } from '../../src/server/handlers.js';
import type { Snapshot, SnapshotStore } from '../../src/types.js';

const makeDeps = (store: SnapshotStore, override: Partial<HandlerDeps> = {}): HandlerDeps => ({
  store,
  computeSnapshotId,
  promotionRequirePolicy: false,
  ...override,
});

const POLICY_IR = (): string => {
  const ir: Record<string, unknown> = { version: 1, rules: [], canonicalizerVersion: '1.0.0' };
  ir['policyId'] = computePolicyId(ir);
  return JSON.stringify(ir);
};

const makeSnap = (files: Record<string, string>): Snapshot => ({
  id: computeSnapshotId(files),
  files,
  createdAt: '2026-04-18T00:00:00.000Z',
  author: 'alice',
  status: 'draft',
});

describe('HTTP endpoint groups', () => {
  it('group 1 — upload accepts well-formed body, rejects missing key or mismatched id', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store);
    const ok = await dispatch(deps, {
      method: 'POST', path: '/v1/snapshots', query: {},
      headers: { 'idempotency-key': 'k' },
      body: { files: { 'SOUL.md': 'x' } },
    });
    expect(ok.status).toBe(201);
    const missingKey = await dispatch(deps, {
      method: 'POST', path: '/v1/snapshots', query: {}, headers: {},
      body: { files: { 'SOUL.md': 'x' } },
    });
    expect(missingKey.status).toBe(400);
    expect((missingKey.body as { code: string }).code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    const mismatch = await dispatch(deps, {
      method: 'POST', path: '/v1/snapshots', query: {},
      headers: { 'idempotency-key': 'k2', 'x-expected-snapshot-id': 'sha256-wrong' },
      body: { files: { 'SOUL.md': 'x' } },
    });
    expect(mismatch.status).toBe(400);
    expect((mismatch.body as { code: string }).code).toBe('SNAPSHOT_ID_MISMATCH');
  });

  it('group 2 — list + get round-trip over /v1/snapshots', async () => {
    const store = inMemoryStore();
    const snap = makeSnap({ 'SOUL.md': 'x' });
    await store.put(snap);
    const deps = makeDeps(store);
    const listRes = await dispatch(deps, { method: 'GET', path: '/v1/snapshots', query: {}, headers: {}, body: undefined });
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    const getRes = await dispatch(deps, { method: 'GET', path: `/v1/snapshots/${snap.id}`, query: {}, headers: {}, body: undefined });
    expect(getRes.status).toBe(200);
    expect((getRes.body as { id: string }).id).toBe(snap.id);
    const missing = await dispatch(deps, { method: 'GET', path: '/v1/snapshots/sha256-missing', query: {}, headers: {}, body: undefined });
    expect(missing.status).toBe(404);
  });

  it('group 3 — promote with self-consistent policy IR flips status to current', async () => {
    const store = inMemoryStore();
    const ok = makeSnap({ [POLICY_IR_PATH]: POLICY_IR() });
    await store.put(ok);
    const deps = makeDeps(store, { promotionRequirePolicy: true });
    const res = await dispatch(deps, {
      method: 'POST', path: `/v1/snapshots/${ok.id}/promote`, query: {},
      headers: { 'idempotency-key': 'k' }, body: {},
    });
    expect(res.status).toBe(200);
    const current = await store.current();
    expect(current?.id).toBe(ok.id);
    expect(current?.status).toBe('current');
  });

  it('group 4 — rollback does not re-verify policyId self-consistency', async () => {
    const store = inMemoryStore();
    const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [], policyId: 'sha256-STALE' };
    const snap = makeSnap({ [POLICY_IR_PATH]: JSON.stringify(ir) });
    await store.put(snap);
    const deps = makeDeps(store, { promotionRequirePolicy: true });
    const res = await dispatch(deps, {
      method: 'POST', path: `/v1/snapshots/${snap.id}/rollback`, query: {},
      headers: { 'idempotency-key': 'k' }, body: {},
    });
    expect(res.status).toBe(200);
    expect((res.body as { restoredAt: string }).restoredAt).toMatch(/T/);
  });

  it('group 5 — read-only routes: healthz 200, policy/current 404 without current, resolve requires uri', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store);
    const health = await dispatch(deps, { method: 'GET', path: '/v1/healthz', query: {}, headers: {}, body: undefined });
    expect(health.status).toBe(200);
    const policy = await dispatch(deps, { method: 'GET', path: '/v1/policy/current', query: {}, headers: {}, body: undefined });
    expect(policy.status).toBe(404);
    const resolveNoUri: SnapRequest = { method: 'GET', path: '/v1/resolve', query: {}, headers: {}, body: undefined };
    const resolveRes = await dispatch(deps, resolveNoUri);
    expect(resolveRes.status).toBe(400);
  });
});
