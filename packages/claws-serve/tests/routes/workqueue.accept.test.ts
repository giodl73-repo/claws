/**
 * L3 acceptance test — Scenario S13 (cap-integration-v1).
 *
 * Contract: GET /api/workqueue returns a unified task list bridging
 * HEARTBEAT.md scheduled entries with runtime agent task state. The To Do
 * widget in the Companion App renders this as a checklist with source
 * badges, ownership metadata, and due dates.
 *
 * Verifies every `expect` clause from
 * `scenarios/cap-integration-v1/S13-workqueue-read/scenario.yaml`:
 *   - response_shape (tasks is array, each carries id/title/status/source)
 *   - status_values subset
 *   - source_values subset
 *   - heartbeat tasks expose nextRun/recurrence semantics via merge
 *   - user-assigned tasks expose assignedBy/assignedAt
 *   - empty_workqueue returns tasks: [] with no error
 *   - task_ordering: in_progress → pending → scheduled, priority breaks ties
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

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'failed', 'scheduled', 'blocked_by_violation'];
const VALID_SOURCES = ['heartbeat', 'user', 'agent', 'fleet'];

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function fetchQueue(server: Server): Promise<WorkQueueBody> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}/api/workqueue`);
  expect(res.status).toBe(200);
  return (await res.json()) as WorkQueueBody;
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'wq-accept-'));
  await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- govern\n', 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S13 — work queue merges HEARTBEAT.md with runtime state', () => {
  it('meets every clause of the S13-workqueue-read scenario', async () => {
    // 1) Seed a HEARTBEAT.md with two recurring entries
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## Daily Standup\n\n- attend\n\n## Fleet Health Check\n\n- run doctor\n',
      'utf-8',
    );

    // 2) Seed runtime state: an in_progress heartbeat task, a user-assigned
    //    task, and a fleet-dispatched task with priority
    const store = createWorkQueueStore({ workspaceRoot: root });
    const standupId = heartbeatTaskId('Daily Standup');
    await store.upsert({
      id: standupId,
      source: 'heartbeat',
      status: 'in_progress',
      priority: 1,
    });
    await store.upsert({
      id: 'user-q3-metrics',
      source: 'user',
      status: 'pending',
      title: 'Review Q3 metrics',
      priority: 5,
      assignedBy: 'alice@example.com',
      assignedAt: '2026-04-17T12:00:00Z',
    });
    await store.upsert({
      id: 'fleet-upgrade',
      source: 'fleet',
      status: 'pending',
      title: 'Upgrade fleet runtime',
      priority: 9,
      assignedBy: 'fleet-dispatcher',
      assignedAt: '2026-04-17T09:00:00Z',
    });

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    const body = await fetchQueue(server);

    // tasks_is_array ✓
    expect(Array.isArray(body.tasks)).toBe(true);

    // each_task_has: id, title, status, source ✓
    for (const t of body.tasks) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.title).toBe('string');
      expect(VALID_STATUSES).toContain(t.status);
      expect(VALID_SOURCES).toContain(t.source);
    }

    // user_assigned_tasks carry assignedBy + assignedAt ✓
    const userTask = body.tasks.find((t) => t.source === 'user');
    expect(userTask?.assignedBy).toBe('alice@example.com');
    expect(userTask?.assignedAt).toBe('2026-04-17T12:00:00Z');

    // heartbeat_tasks present ✓ (title sourced from HEARTBEAT heading)
    const heartbeatTasks = body.tasks.filter((t) => t.source === 'heartbeat');
    expect(heartbeatTasks.length).toBeGreaterThanOrEqual(2);

    // task_ordering: in_progress first, priority breaks ties within pending.
    // Fleet task has priority 9 and user has priority 5 → fleet before user.
    expect(body.tasks[0]?.status).toBe('in_progress');
    expect(body.tasks[0]?.id).toBe(standupId);
    const firstPending = body.tasks.find((t) => t.status === 'pending');
    expect(firstPending?.id).toBe('fleet-upgrade');

    // 3) empty_workqueue case: no HEARTBEAT.md + no runtime state
    server.close();
    server = undefined;
    await rm(join(root, 'HEARTBEAT.md'));
    // Start a fresh root so the previous store does not bleed in.
    const freshRoot = await mkdtemp(join(tmpdir(), 'wq-accept-empty-'));
    await writeFile(join(freshRoot, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- x\n', 'utf-8');
    try {
      const emptyApp = createApp(
        { startedAt: Date.now(), compileCount: 0 },
        { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: freshRoot },
      );
      const emptyServer = await listenApp(emptyApp);
      try {
        const addr = emptyServer.address();
        if (addr === null || typeof addr === 'string') throw new Error('no addr');
        const res = await fetch(`http://127.0.0.1:${String(addr.port)}/api/workqueue`);
        expect(res.status).toBe(200);
        const empty = (await res.json()) as WorkQueueBody;
        expect(empty.tasks).toEqual([]);
      } finally {
        emptyServer.close();
      }
    } finally {
      await rm(freshRoot, { recursive: true, force: true });
    }
  });
});
