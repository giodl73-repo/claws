/**
 * S42 scenario fixture — promote precondition matrix.
 * 409 POLICY_NOT_GENERATED / POLICY_IR_MALFORMED / POLICY_IR_INCONSISTENT.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';
import { computePolicyId, computeSnapshotId, POLICY_IR_PATH } from '../../src/canonical.js';
import { dispatch, type HandlerDeps } from '../../src/server/handlers.js';
import { startServer } from '../../src/server/startServer.js';
import type { Snapshot } from '../../src/types.js';

async function promoteWithFiles(files: Record<string, string>): Promise<ReturnType<typeof dispatch> extends Promise<infer R> ? R : never> {
  const store = inMemoryStore();
  const snap: Snapshot = {
    id: computeSnapshotId(files),
    files,
    createdAt: '2026-04-18T00:00:00.000Z',
    author: 'alice',
    status: 'draft',
  };
  await store.put(snap);
  const deps: HandlerDeps = {
    store,
    computeSnapshotId,
    promotionRequirePolicy: true,
  };
  return dispatch(deps, {
    method: 'POST',
    path: `/v1/snapshots/${snap.id}/promote`,
    query: {},
    headers: { 'idempotency-key': 'k-1' },
    body: {},
  });
}

describe('promote precondition — S42 matrix', () => {
  it('409 POLICY_NOT_GENERATED when .openclaw/policy/policy-ir.json absent', async () => {
    const res = await promoteWithFiles({ 'SOUL.md': 'x' });
    expect(res.status).toBe(409);
    expect((res.body as { code: string }).code).toBe('POLICY_NOT_GENERATED');
  });

  it('409 POLICY_IR_MALFORMED when policy-ir.json is not valid JSON', async () => {
    const res = await promoteWithFiles({ [POLICY_IR_PATH]: '{ not valid json' });
    expect(res.status).toBe(409);
    expect((res.body as { code: string }).code).toBe('POLICY_IR_MALFORMED');
  });

  it('409 POLICY_IR_INCONSISTENT when declared policyId mismatches canonical hash', async () => {
    const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [] };
    ir['policyId'] = 'sha256-WRONG';
    expect(computePolicyId(ir)).not.toBe('sha256-WRONG');
    const res = await promoteWithFiles({ [POLICY_IR_PATH]: JSON.stringify(ir) });
    expect(res.status).toBe(409);
    expect((res.body as { code: string }).code).toBe('POLICY_IR_INCONSISTENT');
  });
});

describe('promote depth-bomb resilience — sec-r1 W1', () => {
  const handles: { close: () => Promise<void> }[] = [];
  afterAll(async () => { for (const h of handles) await h.close(); });

  // Upload-time request parsing enforces JSON depth on the outer envelope
  // (see coverage-branches.unit.test.ts — 150-level array body → 400
  // SNAPSHOT_MALFORMED). But `files[POLICY_IR_PATH]` rides as a string in
  // the bundle, so depth inside that string is NOT checked at upload. The
  // promote handler's validatePolicyIR calls safeParse({ maxDepth: 100 })
  // on the rawIr string — that is the gate this test exercises.

  it('promote rejects depth-bomb policy-ir.json with 409 POLICY_IR_MALFORMED (dispatch)', async () => {
    // Build ~150-level-deep JSON encoded as a string inside the bundle.
    let depthBomb = '"leaf"';
    for (let i = 0; i < 150; i += 1) depthBomb = `[${depthBomb}]`;
    const store = inMemoryStore();
    const files = { [POLICY_IR_PATH]: depthBomb };
    const snap: Snapshot = {
      id: computeSnapshotId(files),
      files,
      createdAt: '2026-04-18T00:00:00.000Z',
      author: 'alice',
      status: 'draft',
    };
    await store.put(snap);
    const deps: HandlerDeps = { store, computeSnapshotId, promotionRequirePolicy: true };
    const res = await dispatch(deps, {
      method: 'POST',
      path: `/v1/snapshots/${snap.id}/promote`,
      query: {},
      headers: { 'idempotency-key': 'k-depth' },
      body: {},
    });
    expect(res.status).toBe(409);
    expect((res.body as { code: string }).code).toBe('POLICY_IR_MALFORMED');
  });

  it('server stays alive after a depth-bomb promote attempt (healthz 200)', async () => {
    let depthBomb = '"leaf"';
    for (let i = 0; i < 150; i += 1) depthBomb = `[${depthBomb}]`;
    const store = inMemoryStore();
    const files = { [POLICY_IR_PATH]: depthBomb };
    const snap: Snapshot = {
      id: computeSnapshotId(files),
      files,
      createdAt: '2026-04-18T00:00:00.000Z',
      author: 'alice',
      status: 'draft',
    };
    await store.put(snap);
    const handle = await startServer({ port: 0, store, promotionRequirePolicy: true });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/snapshots/${snap.id}/promote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k-depth' },
      body: '{}',
    });
    expect(res.status).toBe(409);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('POLICY_IR_MALFORMED');
    // Follow-up healthz proves the server was not crashed by the depth-bomb.
    const alive = await fetch(`${handle.url}/v1/healthz`);
    expect(alive.status).toBe(200);
  });
});
