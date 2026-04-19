/**
 * Edge-case coverage for error, canonical, audit, handlers, server.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { sanitizeMessage, toSnapError } from '../../src/error.js';
import { computePolicyId, computeSnapshotId, POLICY_IR_PATH, safeParse } from '../../src/canonical.js';
import { CanonicalizeError, CanonicalizeErrorCode } from '@bic/openclaw-workspace/canonicalize';
import { buildPromoteEvent } from '../../src/server/audit.js';
import { dispatch, handleHealthz, type HandlerDeps } from '../../src/server/handlers.js';
import { startServer } from '../../src/server/startServer.js';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';

const handles: { close: () => Promise<void> }[] = [];
afterAll(async () => { for (const h of handles) await h.close(); });

describe('error.ts — sanitization', () => {
  it('redacts bearer + secret patterns, strips paths, truncates long messages', () => {
    const input = 'Bearer abc.def-gh_i password=s3cret /etc/secret/file.json D:\\secret\\file';
    const scrubbed = sanitizeMessage(input);
    expect(scrubbed).not.toContain('Bearer abc.def');
    expect(scrubbed).not.toContain('s3cret');
    expect(scrubbed).not.toContain('/etc/secret');
    expect(scrubbed).not.toContain('D:\\secret');
    const longMsg = 'x'.repeat(500);
    expect(sanitizeMessage(longMsg).length).toBeLessThanOrEqual(200);
  });

  it('redacts GitHub personal/OAuth/server/user/refresh tokens', () => {
    const samples = [
      'ghp_abcdefghijklmnopqrstuvwxyz0123456789AB',
      'gho_abcdefghijklmnopqrstuvwxyz0123456789AB',
      'ghs_abcdefghijklmnopqrstuvwxyz0123456789AB',
      'ghu_abcdefghijklmnopqrstuvwxyz0123456789AB',
      'ghr_abcdefghijklmnopqrstuvwxyz0123456789AB',
    ];
    for (const tok of samples) {
      const msg = `failure: leaked ${tok} in request`;
      const scrubbed = sanitizeMessage(msg);
      expect(scrubbed).toContain('[REDACTED:GITHUB_TOKEN]');
      expect(scrubbed).not.toContain(tok);
    }
  });

  it('redacts bare JWT payloads not prefixed by "bearer"', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoieCJ9.' +
      'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const msg = `token error: ${jwt}`;
    const scrubbed = sanitizeMessage(msg);
    expect(scrubbed).toContain('[REDACTED:JWT]');
    expect(scrubbed).not.toContain(jwt);
  });

  it('toSnapError includes details + snapshotId when provided', () => {
    const err1 = toSnapError('SNAPSHOT_NOT_FOUND', new Error('missing'), { snapshotId: 's1', details: { hint: 'x' } });
    expect(err1.snapshotId).toBe('s1');
    expect(err1.details?.['hint']).toBe('x');
    const err2 = toSnapError('FORBIDDEN', 'string error');
    expect(err2.message).toBe('string error');
  });
});

describe('canonical.ts — safeParse + ids', () => {
  it('safeParse rejects excessive depth', () => {
    let nested = '"leaf"';
    for (let i = 0; i < 150; i += 1) nested = `[${nested}]`;
    try {
      safeParse(nested, { maxDepth: 100 });
      throw new Error('expected safeParse to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(CanonicalizeError);
      expect((e as CanonicalizeError).code).toBe(CanonicalizeErrorCode.DEPTH);
    }
  });

  it('safeParse walks nested objects', () => {
    const ok = '{"a":{"b":[1,2,{"c":3}]}}';
    expect(safeParse(ok, { maxDepth: 100 })).toEqual({ a: { b: [1, 2, { c: 3 }] } });
  });

  it('computeSnapshotId is deterministic for equivalent inputs', () => {
    const a = computeSnapshotId({ 'A': 'x', 'B': 'y' });
    const b = computeSnapshotId({ 'B': 'y', 'A': 'x' });
    expect(a).toBe(b);
    expect(a.startsWith('sha256-')).toBe(true);
  });

  it('computePolicyId ignores declared policyId + canonicalizerVersion', () => {
    const core: Record<string, unknown> = { version: 1, rules: [], canonicalizerVersion: '1.0.0' };
    const withFluff: Record<string, unknown> = { ...core, policyId: 'sha256-ANYTHING' };
    expect(computePolicyId(core)).toBe(computePolicyId(withFluff));
  });
});

describe('audit.ts — buildPromoteEvent edge cases', () => {
  it('emits authFreshness + bypassed reason tokens', () => {
    const ev = buildPromoteEvent({
      snapshotId: 's',
      principal: 'alice',
      tenant: 't-1',
      timestamp: '2026-04-18T00:00:00.000Z',
      priorId: 'prior',
      bypassed: true,
      authFreshnessSeconds: 30,
    });
    expect(ev.scope).toBe('t-1');
    expect(ev.reason).toContain('prior=prior');
    expect(ev.reason).toContain('policy=bypassed');
    expect(ev.reason).toContain('authFreshness=30s');
  });

  it('omits actor when principal empty', () => {
    const ev = buildPromoteEvent({
      snapshotId: 's',
      principal: '',
      timestamp: '2026-04-18T00:00:00.000Z',
    });
    expect(ev.actor).toBeUndefined();
  });
});

describe('handlers.ts — remaining branches', () => {
  it('resolve against a specific snapshot id (GET /v1/snapshots/:id/resolve)', async () => {
    const store = inMemoryStore();
    const files = { 'SOUL.md': '# soul' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = await dispatch(deps, {
      method: 'GET',
      path: `/v1/snapshots/${id}/resolve`,
      query: { uri: 'oc://SOUL.md' },
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
    expect((res.body as { snapshotId: string }).snapshotId).toBe(id);
  });

  it('resolve with malformed oc uri returns 400', async () => {
    const store = inMemoryStore();
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = await dispatch(deps, {
      method: 'GET',
      path: '/v1/resolve',
      query: { uri: 'not-an-oc-uri' },
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(400);
  });

  it('policy/current returns 404 POLICY_NOT_GENERATED when current lacks IR', async () => {
    const store = inMemoryStore();
    const files = { 'SOUL.md': '# soul' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    await store.promote(id, { principal: 'alice', idempotencyKey: 'k' });
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = await dispatch(deps, { method: 'GET', path: '/v1/policy/current', query: {}, headers: {}, body: undefined });
    expect(res.status).toBe(404);
    expect((res.body as { code: string }).code).toBe('POLICY_NOT_GENERATED');
  });

  it('policy/current returns 200 with IR when current present', async () => {
    const store = inMemoryStore();
    const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [] };
    ir['policyId'] = computePolicyId(ir);
    const files = { [POLICY_IR_PATH]: JSON.stringify(ir) };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    await store.promote(id, { principal: 'alice', idempotencyKey: 'k' });
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = await dispatch(deps, { method: 'GET', path: '/v1/policy/current', query: {}, headers: {}, body: undefined });
    expect(res.status).toBe(200);
  });

  it('upload rejects malformed body shapes', async () => {
    const store = inMemoryStore();
    const deps: HandlerDeps = { store, computeSnapshotId };
    const noBody = await dispatch(deps, {
      method: 'POST', path: '/v1/snapshots', query: {},
      headers: { 'idempotency-key': 'k' }, body: 'string',
    });
    expect(noBody.status).toBe(400);
    const badFiles = await dispatch(deps, {
      method: 'POST', path: '/v1/snapshots', query: {},
      headers: { 'idempotency-key': 'k' }, body: { files: 'not-an-object' },
    });
    expect(badFiles.status).toBe(400);
    const badContent = await dispatch(deps, {
      method: 'POST', path: '/v1/snapshots', query: {},
      headers: { 'idempotency-key': 'k' }, body: { files: { 'SOUL.md': 42 } },
    });
    expect(badContent.status).toBe(400);
  });

  it('promote with malformed policy IR returns 409 POLICY_IR_MALFORMED', async () => {
    const store = inMemoryStore();
    const files = { [POLICY_IR_PATH]: 'not-json' };
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

  it('rollback for missing snapshot returns 404', async () => {
    const store = inMemoryStore();
    const deps: HandlerDeps = { store, computeSnapshotId, promotionRequirePolicy: false };
    const res = await dispatch(deps, {
      method: 'POST', path: '/v1/snapshots/sha256-missing/rollback', query: {},
      headers: { 'idempotency-key': 'k' }, body: {},
    });
    expect(res.status).toBe(404);
  });

  it('list passes through limit query parameter', async () => {
    const store = inMemoryStore();
    for (let i = 0; i < 3; i += 1) {
      const files = { [`f${String(i)}.md`]: 'x' };
      const id = computeSnapshotId(files);
      await store.put({ id, files, createdAt: `2026-04-0${String(i + 1)}T00:00:00.000Z`, author: 'alice', status: 'draft' });
    }
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = await dispatch(deps, { method: 'GET', path: '/v1/snapshots', query: { limit: '2' }, headers: {}, body: undefined });
    expect((res.body as unknown[]).length).toBe(2);
  });

  it('handleHealthz stays 200 even when authContext would throw — readiness is a host concern', () => {
    const store = inMemoryStore();
    let invoked = false;
    const deps: HandlerDeps = {
      store,
      computeSnapshotId,
      authContext: () => {
        invoked = true;
        throw new Error('auth discovery down');
      },
    };
    const res = handleHealthz(deps);
    expect(res.status).toBe(200);
    expect((res.body as { status: string; authContext: string }).authContext).toBe('configured');
    expect(invoked).toBe(false);
  });

  it('handleHealthz reports authContext=unconfigured when no authContext is wired', () => {
    const store = inMemoryStore();
    const deps: HandlerDeps = { store, computeSnapshotId };
    const res = handleHealthz(deps);
    expect(res.status).toBe(200);
    expect((res.body as { authContext: string }).authContext).toBe('unconfigured');
  });
});

describe('startServer — HTTP adapter edges', () => {
  it('rejects oversized body with 400 SNAPSHOT_MALFORMED', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const big = JSON.stringify({ files: { 'big.md': 'x'.repeat(11 * 1024 * 1024) } });
    const res = await fetch(`${handle.url}/v1/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k' },
      body: big,
    });
    expect(res.status).toBe(400);
  });

  it('parses query strings with empty key fragments', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/snapshots?limit=5&=ignored`);
    expect(res.status).toBe(200);
  });

  it('returns 400 on malformed JSON body', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k' },
      body: '{ not json',
    });
    expect(res.status).toBe(400);
  });

  it('treats empty body as undefined', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/healthz`);
    expect(res.status).toBe(200);
  });
});

describe('inMemoryStore — resolve branches', () => {
  it('resolveOcPath returns null when no current snapshot', async () => {
    const store = inMemoryStore();
    expect(await store.resolveOcPath('oc://SOUL.md')).toBeNull();
  });

  it('resolveOcPath returns null when file not in snapshot or explicit id missing', async () => {
    const store = inMemoryStore();
    const files = { 'SOUL.md': '# x' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    await store.promote(id, { principal: 'alice', idempotencyKey: 'k' });
    expect(await store.resolveOcPath('oc://MISSING.md')).toBeNull();
    expect(await store.resolveOcPath('oc://SOUL.md', 'sha256-missing')).toBeNull();
  });

  it('list respects status filter', async () => {
    const store = inMemoryStore();
    const files = { 'SOUL.md': '# x' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    const drafts = await store.list({ status: 'draft' });
    expect(drafts).toHaveLength(1);
    const currents = await store.list({ status: 'current' });
    expect(currents).toHaveLength(0);
  });

  it('promote missing snapshot throws', async () => {
    const store = inMemoryStore();
    await expect(store.promote('sha256-missing', { principal: 'alice', idempotencyKey: 'k' })).rejects.toThrow();
  });
});

describe('filesystemStore — resolve + list branches', () => {
  it('resolveOcPath + list on filesystem backend', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const pathMod = await import('node:path');
    const { filesystemStore } = await import('../../src/store/filesystemStore.js');
    const root = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'snap-fs-edge-'));
    const store = filesystemStore({ root });
    expect(await store.resolveOcPath('oc://SOUL.md')).toBeNull();
    expect(await store.current()).toBeNull();
    const files = { 'SOUL.md': '# x' };
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    await store.promote(id, { principal: 'alice', idempotencyKey: 'k' });
    const resolved = await store.resolveOcPath('oc://SOUL.md');
    expect(resolved?.snapshotId).toBe(id);
    const notFound = await store.resolveOcPath('oc://MISSING.md');
    expect(notFound).toBeNull();
    const drafts = await store.list({ status: 'draft' });
    expect(drafts).toHaveLength(0);
    await expect(store.promote('sha256-missing', { principal: 'alice', idempotencyKey: 'k' })).rejects.toThrow();
  });

  it('get on missing snapshot returns null; list on empty root returns []', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const pathMod = await import('node:path');
    const { filesystemStore } = await import('../../src/store/filesystemStore.js');
    const root = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'snap-fs-empty-'));
    const store = filesystemStore({ root });
    expect(await store.get('sha256-missing')).toBeNull();
    expect(await store.list()).toEqual([]);
  });
});
