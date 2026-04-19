/**
 * Tail coverage — hit the remaining uncovered branches.
 */

import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as pathMod from 'node:path';
import { dispatch, type HandlerDeps } from '../../src/server/handlers.js';
import { computePolicyId, computeSnapshotId, POLICY_IR_PATH } from '../../src/canonical.js';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';
import { filesystemStore } from '../../src/store/filesystemStore.js';
import { startServer } from '../../src/server/startServer.js';

const handles: { close: () => Promise<void> }[] = [];
afterAll(async () => { for (const h of handles) await h.close(); });

describe('handlers — tail branches', () => {
  it('POLICY_IR_INCONSISTENT when policyId declared non-string', async () => {
    const store = inMemoryStore();
    const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [], policyId: 42 };
    const files = { [POLICY_IR_PATH]: JSON.stringify(ir) };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    const deps: HandlerDeps = { store, computeSnapshotId, promotionRequirePolicy: true };
    const res = await dispatch(deps, {
      method: 'POST', path: `/v1/snapshots/${id}/promote`, query: {},
      headers: { 'idempotency-key': 'k' }, body: {},
    });
    expect(res.status).toBe(409);
    expect((res.body as { code: string }).code).toBe('POLICY_IR_INCONSISTENT');
  });

  it('POLICY_IR_MALFORMED when parsed value is not an object', async () => {
    const store = inMemoryStore();
    const files = { [POLICY_IR_PATH]: '"just a string"' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    const deps: HandlerDeps = { store, computeSnapshotId, promotionRequirePolicy: true };
    const res = await dispatch(deps, {
      method: 'POST', path: `/v1/snapshots/${id}/promote`, query: {},
      headers: { 'idempotency-key': 'k' }, body: {},
    });
    expect(res.status).toBe(409);
    expect((res.body as { code: string }).code).toBe('POLICY_IR_MALFORMED');
  });

  it('rollback with malformed IR returns 409 POLICY_IR_MALFORMED', async () => {
    const store = inMemoryStore();
    const files = { [POLICY_IR_PATH]: 'not-json' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    const deps: HandlerDeps = { store, computeSnapshotId, promotionRequirePolicy: true };
    const res = await dispatch(deps, {
      method: 'POST', path: `/v1/snapshots/${id}/rollback`, query: {},
      headers: { 'idempotency-key': 'k' }, body: {},
    });
    expect(res.status).toBe(409);
    expect((res.body as { code: string }).code).toBe('POLICY_IR_MALFORMED');
  });

  it('resolve with explicit ?snapshot= query param selects that snapshot', async () => {
    const store = inMemoryStore();
    const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [] };
    ir['policyId'] = computePolicyId(ir);
    const files = { 'SOUL.md': '# x', [POLICY_IR_PATH]: JSON.stringify(ir) };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = await dispatch(deps, {
      method: 'GET', path: '/v1/resolve',
      query: { uri: 'oc://SOUL.md', snapshot: id },
      headers: {}, body: undefined,
    });
    expect(res.status).toBe(200);
  });
});

describe('inMemoryStore — list limit branch', () => {
  it('list honors explicit limit', async () => {
    const store = inMemoryStore();
    for (let i = 0; i < 5; i += 1) {
      const files = { [`f${String(i)}.md`]: 'x' };
      const id = computeSnapshotId(files);
      await store.put({ id, files, createdAt: `2026-04-1${String(i)}T00:00:00.000Z`, author: 'alice', status: 'draft' });
    }
    const limited = await store.list({ limit: 2 });
    expect(limited).toHaveLength(2);
  });
});

describe('filesystemStore — readJson non-ENOENT + meta with parentId', () => {
  it('readJson rethrows non-ENOENT errors', async () => {
    const root = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'snap-fs-bad-'));
    fs.writeFileSync(pathMod.join(root, 'current.json'), 'not-json');
    const store = filesystemStore({ root });
    await expect(store.current()).rejects.toThrow();
  });

  it('stores + reads snapshots with parentId field', async () => {
    const root = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'snap-fs-parent-'));
    const store = filesystemStore({ root });
    const files = { 'SOUL.md': '# x' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft', parentId: 'sha256-prior' });
    const read = await store.get(id);
    expect(read?.parentId).toBe('sha256-prior');
  });
});

describe('startServer — 500 on handler throw', () => {
  it('returns 500 envelope when dispatch throws', async () => {
    const store = inMemoryStore();
    const originalPut = store.put.bind(store);
    store.put = originalPut;
    const handle = await startServer({
      port: 0,
      store: {
        ...store,
        list: async (): Promise<never> => { throw new Error('store down'); },
      },
    });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/snapshots`);
    expect(res.status).toBe(500);
  });

  it('startServer rejects when port is already bound', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    await expect(startServer({ port: handle.port, store })).rejects.toThrow();
  });
});
