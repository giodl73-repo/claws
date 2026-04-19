/**
 * L2 e2e test for GET /api/workqueue (Pulse 38).
 *
 * Drives the full flow end-to-end: boot the server against a real
 * workspace directory, compile the governance IR, persist a runtime
 * status transition through the store, rename a HEARTBEAT heading so the
 * stale-cleanup path fires, then confirm the merged response reflects
 * every step.
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

async function getTasks(server: Server, path = '/api/workqueue'): Promise<WorkQueueItem[]> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  expect(res.status).toBe(200);
  const body = (await res.json()) as WorkQueueBody;
  return body.tasks;
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'wq-e2e-'));
  await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- govern\n', 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('workqueue end-to-end — merge, transition, stale cleanup', () => {
  it('tracks a HEARTBEAT task through status transitions and survives a heading rename', async () => {
    // Initial HEARTBEAT: two sections
    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## Morning Review\n\n- scan logs\n\n## Health Check\n\n- ping fleet\n',
      'utf-8',
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);

    // Step 1: fresh workspace — both tasks are scheduled, no runtime state.
    let tasks = await getTasks(server);
    expect(tasks).toHaveLength(2);
    for (const t of tasks) {
      expect(t.source).toBe('heartbeat');
      expect(t.status).toBe('scheduled');
    }

    // Step 2: persist a transition pending → in_progress through the store
    const store = createWorkQueueStore({ workspaceRoot: root });
    const morningId = heartbeatTaskId('Morning Review');
    await store.upsert({ id: morningId, source: 'heartbeat', status: 'pending' });
    await store.upsert({ id: morningId, source: 'heartbeat', status: 'in_progress' });

    tasks = await getTasks(server);
    const morning = tasks.find((t) => t.id === morningId);
    expect(morning?.status).toBe('in_progress');
    // Sort: in_progress outranks scheduled
    expect(tasks[0]?.status).toBe('in_progress');

    // Step 3: complete the task, then rename the HEARTBEAT heading so the
    // original id becomes stale. The response must drop the old id and
    // introduce the new one. The next cleanupStale call (driven by the
    // route itself) must prune `.claws/workqueue.json`.
    await store.upsert({ id: morningId, source: 'heartbeat', status: 'completed' });

    await writeFile(
      join(root, 'HEARTBEAT.md'),
      '# Heartbeat\n\n## Daily Review\n\n- scan logs\n\n## Health Check\n\n- ping fleet\n',
      'utf-8',
    );

    tasks = await getTasks(server);
    const ids = tasks.map((t) => t.id);
    expect(ids).not.toContain(morningId);
    expect(ids).toContain(heartbeatTaskId('Daily Review'));

    // Stale entry was swept from persistence — load() no longer sees it.
    const persisted = await store.load();
    expect(persisted.has(morningId)).toBe(false);
  });
});
