/**
 * Rate-limit + store failure fail-closed postures per snap.md §Fail-closed.
 */

import { describe, it, expect } from 'vitest';
import { dispatch, type HandlerDeps } from '../../src/server/handlers.js';
import { computeSnapshotId } from '../../src/canonical.js';
import type { SnapshotStore } from '../../src/types.js';

function failingStore(): SnapshotStore {
  return {
    async put(): Promise<void> { throw new Error('store unreachable'); },
    async get(): Promise<null> { throw new Error('store unreachable'); },
    async list(): Promise<never[]> { throw new Error('store unreachable'); },
    async promote(): Promise<never> { throw new Error('store unreachable'); },
    async rollback(): Promise<never> { throw new Error('store unreachable'); },
    async current(): Promise<null> { throw new Error('store unreachable'); },
    async resolveOcPath(): Promise<null> { throw new Error('store unreachable'); },
  };
}

describe('fail-closed postures', () => {
  it('503 AUTH_CONTEXT_UNAVAILABLE when authContext returns empty principal', async () => {
    const deps: HandlerDeps = {
      store: failingStore(),
      computeSnapshotId,
      authContext: () => ({ principal: '' }),
    };
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: { 'idempotency-key': 'k' },
      body: { files: {} },
    });
    expect(res.status).toBe(503);
    expect((res.body as { code: string }).code).toBe('AUTH_CONTEXT_UNAVAILABLE');
  });

  it('503 AUTH_CONTEXT_UNAVAILABLE when authContext throws', async () => {
    const deps: HandlerDeps = {
      store: failingStore(),
      computeSnapshotId,
      authContext: () => { throw new Error('oidc discovery empty'); },
    };
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: { 'idempotency-key': 'k' },
      body: { files: {} },
    });
    expect(res.status).toBe(503);
    expect((res.body as { code: string }).code).toBe('AUTH_CONTEXT_UNAVAILABLE');
  });

  it('unknown route returns 404 SNAPSHOT_NOT_FOUND envelope', async () => {
    const deps: HandlerDeps = {
      store: failingStore(),
      computeSnapshotId,
    };
    const res = await dispatch(deps, {
      method: 'GET',
      path: '/nope',
      query: {},
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(404);
    expect((res.body as { code: string }).code).toBe('SNAPSHOT_NOT_FOUND');
  });
});
