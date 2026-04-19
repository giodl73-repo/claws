/**
 * Audit event shape on promote + rollback (guardrails/audit peer-dep).
 */

import { describe, it, expect } from 'vitest';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';
import { computePolicyId, computeSnapshotId, POLICY_IR_PATH } from '../../src/canonical.js';
import { dispatch, type HandlerDeps } from '../../src/server/handlers.js';
import { buildPromoteEvent, buildRollbackEvent } from '../../src/server/audit.js';
import type { AuditEvent } from '@bic/openclaw-guardrails/audit';
import type { Snapshot } from '../../src/types.js';

const PRINCIPAL = 'alice@example.test';

function makeSnap(files: Record<string, string>): Snapshot {
  return {
    id: computeSnapshotId(files),
    files,
    createdAt: '2026-04-18T00:00:00.000Z',
    author: PRINCIPAL,
    status: 'draft',
  };
}

function policyFiles(): Record<string, string> {
  const ir: Record<string, unknown> = { version: 1, canonicalizerVersion: '1.0.0', rules: [] };
  ir['policyId'] = computePolicyId(ir);
  return { [POLICY_IR_PATH]: JSON.stringify(ir) };
}

describe('audit event shape — promote + rollback', () => {
  it('buildPromoteEvent produces a valid AuditEvent with action=snapshot_promote', () => {
    const ev = buildPromoteEvent({
      snapshotId: 'sha256-a',
      principal: PRINCIPAL,
      timestamp: '2026-04-18T00:00:00.000Z',
    });
    expect(ev.action).toBe('snapshot_promote');
    expect(ev.source).toBe('snap');
    expect(ev.target).toBe('sha256-a');
    expect(ev.actor).toBe(PRINCIPAL);
    expect(ev.outcome).toBe('success');
  });

  it('buildRollbackEvent flips action to snapshot_rollback and preserves target', () => {
    const ev = buildRollbackEvent({
      snapshotId: 'sha256-b',
      principal: PRINCIPAL,
      timestamp: '2026-04-18T00:00:00.000Z',
      priorId: 'sha256-a',
    });
    expect(ev.action).toBe('snapshot_rollback');
    expect(ev.target).toBe('sha256-b');
    expect(ev.reason).toContain('prior=sha256-a');
  });

  it('promote dispatch fires auditSink with matching snapshotId + principal', async () => {
    const sink: AuditEvent[] = [];
    const store = inMemoryStore();
    const snap = makeSnap(policyFiles());
    await store.put(snap);
    const deps: HandlerDeps = {
      store,
      computeSnapshotId,
      promotionRequirePolicy: true,
      auditSink: (event) => { sink.push(event); },
      authContext: () => ({ principal: PRINCIPAL }),
    };
    await dispatch(deps, {
      method: 'POST',
      path: `/v1/snapshots/${snap.id}/promote`,
      query: {},
      headers: { 'idempotency-key': 'k-1' },
      body: {},
    });
    expect(sink).toHaveLength(1);
    expect(sink[0]?.target).toBe(snap.id);
    expect(sink[0]?.actor).toBe(PRINCIPAL);
  });

  it('rollback dispatch fires auditSink with action=snapshot_rollback', async () => {
    const sink: AuditEvent[] = [];
    const store = inMemoryStore();
    const snap = makeSnap(policyFiles());
    await store.put(snap);
    const deps: HandlerDeps = {
      store,
      computeSnapshotId,
      promotionRequirePolicy: true,
      auditSink: (event) => { sink.push(event); },
      authContext: () => ({ principal: PRINCIPAL }),
    };
    await dispatch(deps, {
      method: 'POST',
      path: `/v1/snapshots/${snap.id}/rollback`,
      query: {},
      headers: { 'idempotency-key': 'k-2' },
      body: {},
    });
    expect(sink).toHaveLength(1);
    expect(sink[0]?.action).toBe('snapshot_rollback');
  });
});
