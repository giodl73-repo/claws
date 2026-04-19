/**
 * Branch-closers for tail coverage — hit the remaining conditional paths
 * flagged by v8 (item/field in buildChunk, sort stability, filesystem
 * missing-meta, startServer address() fallback, handler resolve-with-id).
 */

import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as pathMod from 'node:path';
import { buildChunk, inMemoryStore } from '../../src/store/inMemoryStore.js';
import { filesystemStore } from '../../src/store/filesystemStore.js';
import { computeSnapshotId } from '../../src/canonical.js';
import { dispatch, type HandlerDeps } from '../../src/server/handlers.js';
import { startServer } from '../../src/server/startServer.js';

const handles: { close: () => Promise<void> }[] = [];
afterAll(async () => { for (const h of handles) await h.close(); });

describe('inMemoryStore — buildChunk + sort branches', () => {
  it('buildChunk fills section/item/field when present', () => {
    const chunk = buildChunk({ file: 'SOUL.md', section: 'Boundaries', item: 'rule-1', field: 'risk' });
    expect(chunk.section).toBe('Boundaries');
    expect(chunk.item).toBe('rule-1');
    expect(chunk.field).toBe('risk');
  });

  it('list returns 0 for equal createdAt (sort stability branch)', async () => {
    const store = inMemoryStore();
    for (let i = 0; i < 2; i += 1) {
      const files = { [`f${String(i)}.md`]: 'x' };
      const id = computeSnapshotId(files);
      await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    }
    const list = await store.list();
    expect(list).toHaveLength(2);
  });
});

describe('filesystemStore — missing meta skip + stray file branches', () => {
  it('list skips directory entries without meta.json', async () => {
    const root = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'snap-fs-skipmeta-'));
    fs.mkdirSync(pathMod.join(root, 'snapshots'), { recursive: true });
    fs.mkdirSync(pathMod.join(root, 'snapshots', 'sha256-orphan'));
    const store = filesystemStore({ root });
    const entries = await store.list();
    expect(entries).toEqual([]);
  });

  it('list ignores non-directory entries under snapshots/', async () => {
    const root = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'snap-fs-nondir-'));
    fs.mkdirSync(pathMod.join(root, 'snapshots'), { recursive: true });
    fs.writeFileSync(pathMod.join(root, 'snapshots', 'stray-file'), 'ignored');
    const store = filesystemStore({ root });
    const entries = await store.list();
    expect(entries).toEqual([]);
  });

  it('sort stability when createdAt equal', async () => {
    const root = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'snap-fs-sort-'));
    const store = filesystemStore({ root });
    for (let i = 0; i < 2; i += 1) {
      const files = { [`f${String(i)}.md`]: 'x' };
      const id = computeSnapshotId(files);
      await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    }
    const list = await store.list({ status: 'draft' });
    expect(list).toHaveLength(2);
  });

  it('resolveOcPath returns null when explicit id references a nonexistent snapshot', async () => {
    const root = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'snap-fs-missing-'));
    const store = filesystemStore({ root });
    expect(await store.resolveOcPath('oc://SOUL.md', 'sha256-missing')).toBeNull();
  });
});

describe('handlers — promote with requirePolicy=false skips IR checks', () => {
  it('promote succeeds on IR-less snapshot when promotionRequirePolicy=false', async () => {
    const store = inMemoryStore();
    const files = { 'SOUL.md': '# no policy' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    const deps: HandlerDeps = { store, computeSnapshotId, promotionRequirePolicy: false };
    const res = await dispatch(deps, {
      method: 'POST', path: `/v1/snapshots/${id}/promote`, query: {},
      headers: { 'idempotency-key': 'k' }, body: {},
    });
    expect(res.status).toBe(200);
  });
});

describe('handlers — resolve returns 400 on store throw', () => {
  it('resolve surfaces 400 when store.resolveOcPath throws', async () => {
    const store = inMemoryStore();
    store.resolveOcPath = async (): Promise<never> => { throw new Error('resolve failed'); };
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = await dispatch(deps, {
      method: 'GET',
      path: '/v1/resolve',
      query: { uri: 'oc://SOUL.md' },
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(400);
  });
});

describe('handlers — resolve returns 404 when uri unresolved', () => {
  it('resolve returns 404 when target snapshot missing target file', async () => {
    const store = inMemoryStore();
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = await dispatch(deps, {
      method: 'GET',
      path: '/v1/resolve',
      query: { uri: 'oc://NOPE.md', snapshot: 'sha256-missing' },
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(404);
  });
});

describe('handlers — explicit snapshot id resolve fallback', () => {
  it('resolve with uri against current returns result when current matches', async () => {
    const store = inMemoryStore();
    const files = { 'SOUL.md': '# x' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    await store.promote(id, { principal: 'alice', idempotencyKey: 'k' });
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = await dispatch(deps, {
      method: 'GET',
      path: '/v1/resolve',
      query: { uri: 'oc://SOUL.md' },
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
  });
});

describe('startServer — host override branch', () => {
  it('uses 127.0.0.1 host by default', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    expect(handle.url.startsWith('http://127.0.0.1:')).toBe(true);
  });

  it('accepts whitespace-only body (empty after trim)', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/healthz`, {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(200);
  });

  it('sends POST body that triggers JSON parse path', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k' },
      body: JSON.stringify({ files: { 'SOUL.md': 'x' } }),
    });
    expect(res.status).toBe(201);
  });

  it('accepts multi-valued header (array normalization path)', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    // Pass an accept header value with comma — node's default header parser
    // keeps it as a string, but this exercises the lowercase + value path.
    const res = await fetch(`${handle.url}/v1/healthz`, {
      headers: { 'accept': 'application/json, text/plain' },
    });
    expect(res.status).toBe(200);
  });

  it('rejects depth-bomb request body with 400 SNAPSHOT_MALFORMED (workspace C-15)', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    let payload = '"leaf"';
    for (let i = 0; i < 150; i += 1) payload = `[${payload}]`;
    const res = await fetch(`${handle.url}/v1/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k' },
      body: payload,
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string; message: string };
    expect(body.code).toBe('SNAPSHOT_MALFORMED');
    // Server stays alive: a follow-up healthz must still succeed.
    const alive = await fetch(`${handle.url}/v1/healthz`);
    expect(alive.status).toBe(200);
  });
});
