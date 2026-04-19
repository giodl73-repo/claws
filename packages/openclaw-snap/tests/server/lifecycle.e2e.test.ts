/**
 * L2 e2e — full snapshot lifecycle (upload → promote → rollback with
 * audit verify) + /v1/resolve round-trip for oc:// URI composition.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { startServer } from '../../src/server/startServer.js';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';
import { computePolicyId, POLICY_IR_PATH } from '../../src/canonical.js';
import type { AuditEvent } from '@bic/openclaw-guardrails/audit';

const handles: { close: () => Promise<void> }[] = [];

afterAll(async () => {
  for (const h of handles) await h.close();
});

function policyFiles(extra: Record<string, string> = {}): Record<string, string> {
  const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [] };
  ir['policyId'] = computePolicyId(ir);
  return { [POLICY_IR_PATH]: JSON.stringify(ir), ...extra };
}

describe('snap lifecycle — e2e', () => {
  it('upload → promote → rollback with audit verification', async () => {
    const sink: AuditEvent[] = [];
    const store = inMemoryStore();
    const handle = await startServer({
      port: 0,
      store,
      promotionRequirePolicy: true,
      authContext: () => ({ principal: 'alice' }),
      auditSink: (event) => { sink.push(event); },
    });
    handles.push(handle);

    const uploadFirst = await (await fetch(`${handle.url}/v1/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'u1' },
      body: JSON.stringify({ files: policyFiles({ 'SOUL.md': '# soul v1' }) }),
    })).json() as { id: string };

    const uploadSecond = await (await fetch(`${handle.url}/v1/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'u2' },
      body: JSON.stringify({ files: policyFiles({ 'SOUL.md': '# soul v2' }) }),
    })).json() as { id: string };

    const promoteFirst = await fetch(`${handle.url}/v1/snapshots/${uploadFirst.id}/promote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'p1' },
      body: JSON.stringify({}),
    });
    expect(promoteFirst.status).toBe(200);

    const promoteSecond = await fetch(`${handle.url}/v1/snapshots/${uploadSecond.id}/promote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'p2' },
      body: JSON.stringify({}),
    });
    expect(promoteSecond.status).toBe(200);

    const rollback = await fetch(`${handle.url}/v1/snapshots/${uploadFirst.id}/rollback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'r1' },
      body: JSON.stringify({}),
    });
    expect(rollback.status).toBe(200);

    const auditActions = sink.map((e) => e.action);
    expect(auditActions).toEqual(['snapshot_promote', 'snapshot_promote', 'snapshot_rollback']);
    expect((await store.current())?.id).toBe(uploadFirst.id);
  });

  it('/v1/resolve round-trip — workspace/path URI composition', async () => {
    const store = inMemoryStore();
    const files = policyFiles({ 'SOUL.md': '# soul\n\n## Boundaries\n\n- rule 1' });
    const handle = await startServer({
      port: 0,
      store,
      promotionRequirePolicy: true,
      authContext: () => ({ principal: 'alice' }),
    });
    handles.push(handle);

    const upload = await (await fetch(`${handle.url}/v1/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'u' },
      body: JSON.stringify({ files }),
    })).json() as { id: string };

    await fetch(`${handle.url}/v1/snapshots/${upload.id}/promote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'p' },
      body: JSON.stringify({}),
    });

    const resolveCurrent = await fetch(`${handle.url}/v1/resolve?uri=${encodeURIComponent('oc://SOUL.md/Boundaries')}`);
    expect(resolveCurrent.status).toBe(200);
    const result = await resolveCurrent.json() as { snapshotId: string; content: string; chunk: { file: string; section: string } };
    expect(result.snapshotId).toBe(upload.id);
    expect(result.chunk.section).toBe('Boundaries');
    expect(result.content).toContain('# soul');

    const resolveById = await fetch(`${handle.url}/v1/snapshots/${upload.id}/resolve?uri=${encodeURIComponent('oc://SOUL.md')}`);
    expect(resolveById.status).toBe(200);
  });
});
