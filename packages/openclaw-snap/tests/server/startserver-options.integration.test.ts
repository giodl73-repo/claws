/**
 * L1 coverage for startServer option wiring added in CP-11 R1:
 *   - supportedCanonicalizerVersions forwarding
 *   - defaultIdempotencyCache TTL expiry branch (get after expiresAt)
 *   - defaultIdempotencyCache cache-hit path via promote retry
 */

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';
import { startServer } from '../../src/server/startServer.js';
import { computePolicyId, computeSnapshotId, POLICY_IR_PATH } from '../../src/canonical.js';

const handles: { close: () => Promise<void> }[] = [];
afterAll(async () => {
  for (const h of handles) await h.close();
});

const buildIr = (overrides: Record<string, unknown> = {}): string => {
  const ir: Record<string, unknown> = {
    version: 1,
    rules: [],
    canonicalizerVersion: '1.0.0',
    ...overrides,
  };
  ir['policyId'] = computePolicyId(ir);
  return JSON.stringify(ir);
};

describe('startServer — supportedCanonicalizerVersions forwarding', () => {
  it('rejects uploads whose canonicalizerVersion is outside the configured set', async () => {
    const handle = await startServer({
      port: 0,
      store: inMemoryStore(),
      supportedCanonicalizerVersions: ['2.0.0'],
    });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k' },
      body: JSON.stringify({ files: { [POLICY_IR_PATH]: buildIr({ canonicalizerVersion: '1.0.0' }) } }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string; details?: { supported: string[] } };
    expect(body.code).toBe('POLICY_IR_VERSION_UNSUPPORTED');
    expect(body.details?.supported).toEqual(['2.0.0']);
  });
});

describe('startServer — defaultIdempotencyCache behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T00:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves cached response on retry and evicts after 24h', async () => {
    const store = inMemoryStore();
    const files = { [POLICY_IR_PATH]: buildIr() };
    const id = computeSnapshotId(files);
    await store.put({
      id,
      files,
      createdAt: '2026-04-18T00:00:00.000Z',
      author: 'alice',
      status: 'draft',
    });
    const handle = await startServer({ port: 0, store });
    handles.push(handle);

    // First promote — executes and caches.
    const first = await fetch(`${handle.url}/v1/snapshots/${encodeURIComponent(id)}/promote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'retry-key' },
      body: '{}',
    });
    expect(first.status).toBe(200);
    const firstBody = await first.json();

    // Retry within TTL → cached response.
    const retry = await fetch(`${handle.url}/v1/snapshots/${encodeURIComponent(id)}/promote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'retry-key' },
      body: '{}',
    });
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual(firstBody);

    // Advance past 24h TTL; the cache's get() should now treat the entry
    // as absent and the handler re-executes (deleting then re-setting).
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    const afterExpiry = await fetch(`${handle.url}/v1/snapshots/${encodeURIComponent(id)}/promote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'retry-key' },
      body: '{}',
    });
    expect(afterExpiry.status).toBe(200);
  });
});
