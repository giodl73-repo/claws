/**
 * L1 integration — promote + rollback emit audit events with the right
 * shape as consumed by @bic/openclaw-guardrails/audit.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { startServer } from '../../src/server/startServer.js';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';
import { computeSnapshotId, computePolicyId, POLICY_IR_PATH } from '../../src/canonical.js';
import type { AuditEvent } from '@bic/openclaw-guardrails/audit';

const handles: { close: () => Promise<void> }[] = [];

afterAll(async () => {
  for (const h of handles) await h.close();
});

function policyFiles(): Record<string, string> {
  const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [] };
  ir['policyId'] = computePolicyId(ir);
  return { [POLICY_IR_PATH]: JSON.stringify(ir) };
}

describe('promote + audit — cross-package', () => {
  it('promote over HTTP fires auditSink with snapshot_promote action', async () => {
    const sink: AuditEvent[] = [];
    const store = inMemoryStore();
    const files = policyFiles();
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    const handle = await startServer({
      port: 0,
      store,
      promotionRequirePolicy: true,
      authContext: () => ({ principal: 'alice' }),
      auditSink: (event) => { sink.push(event); },
    });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/snapshots/${id}/promote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k-p' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    expect(sink).toHaveLength(1);
    expect(sink[0]?.action).toBe('snapshot_promote');
    expect(sink[0]?.target).toBe(id);
  });

  it('rollback over HTTP fires auditSink with snapshot_rollback action', async () => {
    const sink: AuditEvent[] = [];
    const store = inMemoryStore();
    const files = policyFiles();
    const id = computeSnapshotId(files);
    await store.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    const handle = await startServer({
      port: 0,
      store,
      promotionRequirePolicy: true,
      authContext: () => ({ principal: 'alice' }),
      auditSink: (event) => { sink.push(event); },
    });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/snapshots/${id}/rollback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k-r' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    expect(sink).toHaveLength(1);
    expect(sink[0]?.action).toBe('snapshot_rollback');
    expect(sink[0]?.target).toBe(id);
  });
});
