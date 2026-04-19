/**
 * L2 end-to-end: boot the full claws-serve app with a live compile fn,
 * write a HEARTBEAT.md with a real Schedule section, and confirm the
 * calendar view round-trips through the `/api/oc` prefix router — proving
 * the path collides neither with the generic Layer 1 handler (pulse 27)
 * nor with the workspace schema router (pulse 64).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, type ServerState } from '../../src/server.js';
import type { ScheduleResponse } from '../../src/routes/schedule.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\n## Purpose\n\n- e2e\n';

const HEARTBEAT = [
  '# Heartbeat',
  '',
  '## Schedule',
  '',
  '### Weekly Review',
  '',
  '- id: weekly-review',
  '- start: 2026-05-04T14:00:00',
  '- duration: PT30M',
  '- timezone: America/New_York',
  '- recurrence: FREQ=WEEKLY;BYDAY=MO',
  '',
].join('\n');

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

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'schedule-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/oc/HEARTBEAT.md/schedule — L2 e2e', () => {
  it('round-trips HEARTBEAT.md schedule parse + calendar rendering', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await get(server, '/api/oc/HEARTBEAT.md/schedule');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as ScheduleResponse;
    expect(body.events).toHaveLength(1);
    const ev = body.events[0]!;
    expect(ev.id).toBe('weekly-review');
    expect(ev.recurrence).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(ev.timezone).toBe('America/New_York');
    expect(ev.duration).toBe('PT30M');
    expect(ev.endTime).toBe('2026-05-04T14:30:00');
    expect(ev.nextOccurrence).not.toBeNull();
  });
});
