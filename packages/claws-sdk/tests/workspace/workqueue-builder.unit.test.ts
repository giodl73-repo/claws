/**
 * L0 unit tests for `buildWorkQueue` (Pulse 38).
 *
 * Exercises the merge + sort + blocked_by_violation logic in the
 * claws-sdk workspace module. The claws-serve route is a thin HTTP adapter
 * over this function; most business-logic coverage lives here.
 */

import { describe, expect, it } from 'vitest';
import {
  buildWorkQueue,
  heartbeatTaskId,
  type WorkQueueRuntimeState,
} from '../../src/workspace/workqueue-builder.js';
import type { WorkspaceState } from '@bic/openclaw-workspace/path';

function workspaceWithHeartbeat(headings: readonly string[]): WorkspaceState {
  return {
    workspaceRoot: '/fake',
    soul: { raw: '', preamble: '', sections: [] },
    memory: null,
    identity: null,
    tools: null,
    agents: null,
    user: null,
    heartbeat: {
      raw: '',
      preamble: '',
      sections: headings.map((h, i) => ({ heading: h, body: '', line: i + 1 })),
    },
  };
}

describe('heartbeatTaskId', () => {
  it('produces a stable hex-prefixed id for a given heading', () => {
    const a = heartbeatTaskId('Daily Standup');
    const b = heartbeatTaskId('Daily Standup');
    const c = heartbeatTaskId('Weekly Review');
    expect(a).toBe(b);
    expect(a.startsWith('hb-')).toBe(true);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^hb-[0-9a-f]{12}$/);
  });
});

describe('buildWorkQueue', () => {
  it('emits one scheduled item per HEARTBEAT.md section when no runtime state exists', () => {
    const ws = workspaceWithHeartbeat(['On Start', 'Every 5 Minutes']);
    const tasks = buildWorkQueue({ workspace: ws, runtimeState: new Map() });
    expect(tasks).toHaveLength(2);
    for (const t of tasks) {
      expect(t.source).toBe('heartbeat');
      expect(t.status).toBe('scheduled');
      expect(t.priority).toBe(0);
    }
  });

  it('layers runtime status + metadata onto HEARTBEAT-anchored items', () => {
    const ws = workspaceWithHeartbeat(['On Start']);
    const id = heartbeatTaskId('On Start');
    const runtime = new Map<string, WorkQueueRuntimeState>([
      [
        id,
        {
          id,
          source: 'heartbeat',
          status: 'in_progress',
          priority: 4,
          dueAt: '2026-05-01T00:00:00Z',
          completedAt: '2026-04-30T00:00:00Z',
        },
      ],
    ]);
    const tasks = buildWorkQueue({ workspace: ws, runtimeState: runtime });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.status).toBe('in_progress');
    expect(tasks[0]?.title).toBe('On Start'); // HEARTBEAT owns title
    expect(tasks[0]?.priority).toBe(4);
    expect(tasks[0]?.dueAt).toBe('2026-05-01T00:00:00Z');
    expect(tasks[0]?.completedAt).toBe('2026-04-30T00:00:00Z');
  });

  it('merges runtime-only user/agent/fleet tasks and drops untitled entries', () => {
    const ws = workspaceWithHeartbeat([]);
    const runtime = new Map<string, WorkQueueRuntimeState>([
      [
        'user-1',
        {
          id: 'user-1',
          source: 'user',
          status: 'pending',
          title: 'review PR',
          assignedBy: 'alice',
          assignedAt: '2026-04-17T00:00:00Z',
        },
      ],
      [
        'untitled',
        // Missing title — must be skipped (user/agent/fleet need titles)
        { id: 'untitled', source: 'user', status: 'pending' },
      ],
      [
        'agent-2',
        {
          id: 'agent-2',
          source: 'agent',
          status: 'in_progress',
          title: 'crawl',
          priority: 1,
        },
      ],
      [
        // HEARTBEAT-sourced runtime entry whose heading disappeared — not
        // emitted because no matching section exists.
        'hb-deadbeef0000',
        {
          id: 'hb-deadbeef0000',
          source: 'heartbeat',
          status: 'completed',
        },
      ],
    ]);
    const tasks = buildWorkQueue({ workspace: ws, runtimeState: runtime });
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('user-1');
    expect(ids).toContain('agent-2');
    expect(ids).not.toContain('untitled');
    expect(ids).not.toContain('hb-deadbeef0000');
    // Sort: in_progress (agent-2) before pending (user-1)
    expect(tasks[0]?.id).toBe('agent-2');
  });

  it('stamps blocked_by_violation when requiredTools intersect blockedTools', () => {
    const ws = workspaceWithHeartbeat(['Needs Web']);
    const id = heartbeatTaskId('Needs Web');
    const runtime = new Map<string, WorkQueueRuntimeState>([
      [
        id,
        {
          id,
          source: 'heartbeat',
          status: 'pending',
          requiredTools: ['web', 'exec'],
        },
      ],
      [
        'user-terminal',
        {
          id: 'user-terminal',
          source: 'user',
          status: 'completed',
          title: 'done',
          completedAt: '2026-04-01T00:00:00Z',
          requiredTools: ['web'],
        },
      ],
    ]);
    const tasks = buildWorkQueue({
      workspace: ws,
      runtimeState: runtime,
      blockedTools: ['web'],
    });
    const heartbeat = tasks.find((t) => t.source === 'heartbeat');
    expect(heartbeat?.status).toBe('blocked_by_violation');
    expect(heartbeat?.blockedTools).toEqual(['web']);
    // Terminal completed task is never downgraded to blocked_by_violation
    const completed = tasks.find((t) => t.id === 'user-terminal');
    expect(completed?.status).toBe('completed');
    // `blockedTools` is never emitted on an item that isn't blocked
    expect(completed?.blockedTools).toBeUndefined();
  });

  it('sorts by (status rank, priority desc, dueAt asc, id asc)', () => {
    const ws = workspaceWithHeartbeat(['A']);
    const hbId = heartbeatTaskId('A');
    const runtime = new Map<string, WorkQueueRuntimeState>([
      [hbId, { id: hbId, source: 'heartbeat', status: 'scheduled' }],
      [
        'user-a',
        {
          id: 'user-a',
          source: 'user',
          status: 'pending',
          title: 'a',
          priority: 1,
          dueAt: '2026-05-01T00:00:00Z',
        },
      ],
      [
        'user-b',
        {
          id: 'user-b',
          source: 'user',
          status: 'pending',
          title: 'b',
          priority: 5,
          dueAt: '2026-05-02T00:00:00Z',
        },
      ],
      [
        'user-c',
        {
          id: 'user-c',
          source: 'user',
          status: 'pending',
          title: 'c',
          priority: 5,
          dueAt: '2026-04-15T00:00:00Z',
        },
      ],
      [
        'user-d',
        {
          id: 'user-d',
          source: 'user',
          status: 'pending',
          title: 'd',
          priority: 5,
          // No dueAt — later than anything dated within the same priority
        },
      ],
    ]);
    const tasks = buildWorkQueue({ workspace: ws, runtimeState: runtime });
    const ids = tasks.map((t) => t.id);
    // Within pending (rank 1): priority 5 beats priority 1, then dueAt
    // ascending, then id asc. Scheduled (rank 3) comes last.
    expect(ids).toEqual(['user-c', 'user-b', 'user-d', 'user-a', hbId]);
  });

  it('handles missing HEARTBEAT.md gracefully (workspace.heartbeat === null)', () => {
    const empty: WorkspaceState = {
      workspaceRoot: '/fake',
      soul: { raw: '', preamble: '', sections: [] },
      memory: null,
      identity: null,
      tools: null,
      agents: null,
      user: null,
      heartbeat: null,
    };
    const tasks = buildWorkQueue({ workspace: empty, runtimeState: new Map() });
    expect(tasks).toEqual([]);
  });
});
