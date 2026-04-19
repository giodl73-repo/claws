/**
 * L0 tests for the shift-left upload gates added in CP-11 R1:
 *   - canonicalizerVersion handshake (POLICY_IR_VERSION_UNSUPPORTED)
 *   - X-Expected-Policy-Id (POLICY_ID_MISMATCH)
 * Spec anchor: snap.md §Uploading L91-97.
 *
 * Also covers the healthz fix: probe must return 200 without any
 * Authorization header, regardless of whether `authContext` is configured
 * (gw-r1 W3).
 */

import { describe, it, expect } from 'vitest';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';
import { computePolicyId, computeSnapshotId, POLICY_IR_PATH } from '../../src/canonical.js';
import { dispatch, type HandlerDeps } from '../../src/server/handlers.js';
import type { SnapshotStore } from '../../src/types.js';

const makeDeps = (store: SnapshotStore, override: Partial<HandlerDeps> = {}): HandlerDeps => ({
  store,
  computeSnapshotId,
  promotionRequirePolicy: false,
  ...override,
});

const buildIr = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const ir: Record<string, unknown> = {
    version: 1,
    rules: [],
    canonicalizerVersion: '1.0.0',
    ...overrides,
  };
  ir['policyId'] = computePolicyId(ir);
  return ir;
};

describe('upload gates — canonicalizerVersion handshake', () => {
  it('400 POLICY_IR_VERSION_UNSUPPORTED when declared version outside server set', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store, { supportedCanonicalizerVersions: ['1.0.0'] });
    const ir = buildIr({ canonicalizerVersion: '2.0.0' });
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: { 'idempotency-key': 'k-v' },
      body: { files: { [POLICY_IR_PATH]: JSON.stringify(ir) } },
    });
    expect(res.status).toBe(400);
    const body = res.body as { code: string; details?: { got: string; supported: string[] } };
    expect(body.code).toBe('POLICY_IR_VERSION_UNSUPPORTED');
    expect(body.details?.got).toBe('2.0.0');
    expect(body.details?.supported).toEqual(['1.0.0']);
  });

  it('201 accepted when declared version inside server set', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store, { supportedCanonicalizerVersions: ['1.0.0', '1.1.0'] });
    const ir = buildIr({ canonicalizerVersion: '1.1.0' });
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: { 'idempotency-key': 'k-v-ok' },
      body: { files: { [POLICY_IR_PATH]: JSON.stringify(ir) } },
    });
    expect(res.status).toBe(201);
  });

  it('defaults to 1.0.0 supported set when no option provided', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store);
    const ir = buildIr({ canonicalizerVersion: '99.0.0' });
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: { 'idempotency-key': 'k-default' },
      body: { files: { [POLICY_IR_PATH]: JSON.stringify(ir) } },
    });
    expect(res.status).toBe(400);
    expect((res.body as { code: string }).code).toBe('POLICY_IR_VERSION_UNSUPPORTED');
  });
});

describe('upload gates — X-Expected-Policy-Id handshake', () => {
  it('400 POLICY_ID_MISMATCH when header disagrees with computed id', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store);
    const ir = buildIr();
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: { 'idempotency-key': 'k-p', 'x-expected-policy-id': 'sha256-WRONG' },
      body: { files: { [POLICY_IR_PATH]: JSON.stringify(ir) } },
    });
    expect(res.status).toBe(400);
    const body = res.body as { code: string; details?: { expected: string; computed: string } };
    expect(body.code).toBe('POLICY_ID_MISMATCH');
    expect(body.details?.expected).toBe('sha256-WRONG');
    expect(body.details?.computed).toBe(computePolicyId(ir));
  });

  it('201 when header agrees with computed id', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store);
    const ir = buildIr();
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: {
        'idempotency-key': 'k-p-ok',
        'x-expected-policy-id': computePolicyId(ir),
      },
      body: { files: { [POLICY_IR_PATH]: JSON.stringify(ir) } },
    });
    expect(res.status).toBe(201);
  });

  it('header absent → no policyId check (bundles without IR still pass)', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store);
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: { 'idempotency-key': 'k-no-ir' },
      body: { files: { 'SOUL.md': 'x' } },
    });
    expect(res.status).toBe(201);
  });

  it('400 POLICY_IR_MALFORMED when policy-ir.json is not valid JSON', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store);
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: { 'idempotency-key': 'k-bad' },
      body: { files: { [POLICY_IR_PATH]: '{ not valid' } },
    });
    expect(res.status).toBe(400);
    expect((res.body as { code: string }).code).toBe('POLICY_IR_MALFORMED');
  });

  it('400 POLICY_IR_MALFORMED when policy-ir.json parses to an array', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store);
    const res = await dispatch(deps, {
      method: 'POST',
      path: '/v1/snapshots',
      query: {},
      headers: { 'idempotency-key': 'k-arr' },
      body: { files: { [POLICY_IR_PATH]: '[1,2,3]' } },
    });
    expect(res.status).toBe(400);
    expect((res.body as { code: string }).code).toBe('POLICY_IR_MALFORMED');
  });
});

describe('healthz — does not probe authContext', () => {
  it('returns 200 without any Authorization header when authContext is configured', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store, {
      authContext: () => ({ principal: '' }), // simulating no Authorization header
    });
    const res = await dispatch(deps, {
      method: 'GET',
      path: '/v1/healthz',
      query: {},
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
    const body = res.body as { status: string; authContext: string };
    expect(body.status).toBe('ok');
    expect(body.authContext).toBe('configured');
  });

  it('returns 200 with authContext=unconfigured when authContext is absent', async () => {
    const store = inMemoryStore();
    const deps = makeDeps(store);
    const res = await dispatch(deps, {
      method: 'GET',
      path: '/v1/healthz',
      query: {},
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
    expect((res.body as { authContext: string }).authContext).toBe('unconfigured');
  });

  it('does not invoke authContext — never throws even when authContext would', async () => {
    const store = inMemoryStore();
    let invoked = false;
    const deps = makeDeps(store, {
      authContext: () => {
        invoked = true;
        throw new Error('would have thrown');
      },
    });
    const res = await dispatch(deps, {
      method: 'GET',
      path: '/v1/healthz',
      query: {},
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
    expect(invoked).toBe(false);
  });
});
