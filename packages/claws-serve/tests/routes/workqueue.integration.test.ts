/**
 * L1 integration tests for GET /api/workqueue (Pulse 38).
 *
 * Boots the full Express app via `createApp`, writes a workspace on disk,
 * seeds runtime state in `.claws/workqueue.json`, and asserts the merged
 * task list + `?status=` filtering.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import type { WorkQueueItem } from '@bic/claws-sdk/workspace';
import { heartbeatTaskId } from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import { createWorkQueueStore } from '../../src/state/workqueue-store.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
interface WorkQueueBody {
  tasks: WorkQueueItem[];
}

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(server: Server, path: string): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

const HEARTBEAT_MD = [
  '# Heartbeat',
  '',
  '## On Start',
  '',
  '- Verify policy cache',
  '',
  '## Every 5 Minutes',
  '',
  '- Flush audit events',
  '',
].join('\n');

const SOUL_MD = '# Soul\n\n## Purpose\n\n- govern\n';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'wq-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL_MD, 'utf-8');
  await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/workqueue', () => {
  it('merges HEARTBEAT.md scheduled tasks with runtime state into one sorted list', async () => {
    // Seed runtime state: one user-assigned task + runtime layer on the
    // 'On Start' heartbeat entry flipping it to in_progress.
    const store = createWorkQueueStore({ workspaceRoot: root });
    const onStartId = heartbeatTaskId('On Start');
    await store.upsert({
      id: onStartId,
      source: 'heartbeat',
      status: 'in_progress',
      priority: 2,
    });
    await store.upsert({
      id: 'user-review',
      source: 'user',
      status: 'pending',
      title: 'review Q3 metrics',
      priority: 7,
      assignedBy: 'alice',
      assignedAt: '2026-04-17T12:00:00Z',
    });

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    const res = await get(server, '/api/workqueue');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as WorkQueueBody;

    // Both HEARTBEAT sections appear + the runtime-only user task
    expect(body.tasks).toHaveLength(3);
    const ids = body.tasks.map((t) => t.id);
    expect(ids).toContain(onStartId);
    expect(ids).toContain(heartbeatTaskId('Every 5 Minutes'));
    expect(ids).toContain('user-review');

    // Sort: in_progress heartbeat first, then pending user, then scheduled heartbeat
    expect(body.tasks[0]!.status).toBe('in_progress');
    expect(body.tasks[0]!.id).toBe(onStartId);
    expect(body.tasks[1]!.status).toBe('pending');
    expect(body.tasks[1]!.id).toBe('user-review');
    expect(body.tasks[2]!.status).toBe('scheduled');
    expect(body.tasks[2]!.source).toBe('heartbeat');

    // Runtime metadata flows through: assignedBy, priority
    expect(body.tasks[1]!.assignedBy).toBe('alice');
    expect(body.tasks[1]!.priority).toBe(7);
  });

  it('?status= filter narrows the returned set and rejects unknown values', async () => {
    const store = createWorkQueueStore({ workspaceRoot: root });
    await store.upsert({
      id: heartbeatTaskId('On Start'),
      source: 'heartbeat',
      status: 'in_progress',
    });
    await store.upsert({
      id: 'user-x',
      source: 'user',
      status: 'completed',
      title: 'done',
      completedAt: '2026-04-10T00:00:00Z',
    });

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    // Single status
    const onlyInProgress = await get(server, '/api/workqueue?status=in_progress');
    expect(onlyInProgress.status).toBe(200);
    const body1 = JSON.parse(onlyInProgress.body) as WorkQueueBody;
    expect(body1.tasks).toHaveLength(1);
    expect(body1.tasks[0]!.status).toBe('in_progress');

    // Comma-separated union
    const multi = await get(server, '/api/workqueue?status=pending,scheduled,completed');
    const body2 = JSON.parse(multi.body) as WorkQueueBody;
    for (const t of body2.tasks) {
      expect(['pending', 'scheduled', 'completed']).toContain(t.status);
    }

    // Bad filter
    const bad = await get(server, '/api/workqueue?status=banana');
    expect(bad.status).toBe(400);
    const err = JSON.parse(bad.body) as { error: string };
    expect(err.error).toBe('WORKQUEUE_INVALID_STATUS_FILTER');

    // Repeated `?status=` surfaces as an array in Express — we accept only
    // a single string value, so arrays are rejected with 400.
    const arrayForm = await get(server, '/api/workqueue?status=pending&status=completed');
    expect(arrayForm.status).toBe(400);

    // An empty `?status=` value collapses to "no filter applied" — returns
    // the full list, not a 400. Covers the empty-string early-exit branch.
    const emptyValue = await get(server, '/api/workqueue?status=');
    expect(emptyValue.status).toBe(200);
    const body3 = JSON.parse(emptyValue.body) as WorkQueueBody;
    expect(body3.tasks.length).toBeGreaterThan(0);

    // Comma-only value (all tokens empty after split) also means "no filter".
    const commaOnly = await get(server, '/api/workqueue?status=,,');
    expect(commaOnly.status).toBe(200);
  });
});
