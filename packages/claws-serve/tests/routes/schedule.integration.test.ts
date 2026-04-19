/**
 * L1 integration tests for GET /api/oc/HEARTBEAT.md/schedule.
 *
 * Exercises the full route pipeline against the real SDK parser:
 *   - parseWorkspace reads HEARTBEAT.md from disk
 *   - parseHeartbeatSchedule produces CalendarEvent[]
 *   - schedule route enriches with nextOccurrence + filters by date range
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scheduleRouter } from '../../src/routes/schedule.js';
import type { ScheduleResponse } from '../../src/routes/schedule.js';

const SOUL = '# Soul\n\n## Purpose\n\n- deliver\n';

const HEARTBEAT_HAPPY = [
  '# Heartbeat',
  '',
  '## Schedule',
  '',
  '### Daily Standup',
  '',
  '- id: daily-standup',
  '- start: 2026-05-01T09:00:00',
  '- duration: PT15M',
  '- timezone: America/Los_Angeles',
  '- recurrence: FREQ=DAILY',
  '- category: lifecycle',
  '',
  '### Kickoff',
  '',
  '- id: kickoff-2026',
  '- start: 2026-06-15T10:00:00',
  '- duration: PT1H',
  '- timezone: UTC',
  '- description: Annual kickoff',
  '',
].join('\n');

const HEARTBEAT_MISSING_TZ = [
  '# Heartbeat',
  '',
  '## Schedule',
  '',
  '### Bad Event',
  '',
  '- id: bad',
  '- start: 2026-05-01T09:00:00',
  '- duration: PT15M',
  '',
].join('\n');

async function listenApp(app: ReturnType<typeof express>): Promise<Server> {
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
  root = await mkdtemp(join(tmpdir(), 'schedule-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

function mountApp(nowIso: string): ReturnType<typeof express> {
  const app = express();
  const now = (): Date => new Date(nowIso);
  app.use('/api/oc', scheduleRouter({ workspaceRoot: root, now }));
  return app;
}

describe('GET /api/oc/HEARTBEAT.md/schedule — L1 integration', () => {
  it('returns typed CalendarEvent[] with nextOccurrence', async () => {
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_HAPPY, 'utf-8');
    const app = mountApp('2026-05-02T08:00:00.000Z');
    server = await listenApp(app);

    const res = await get(server, '/api/oc/HEARTBEAT.md/schedule');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as ScheduleResponse;
    expect(body.file).toBe('HEARTBEAT.md');
    expect(body.section).toBe('Schedule');
    expect(body.events).toHaveLength(2);

    const daily = body.events.find((e) => e.id === 'daily-standup');
    expect(daily?.recurrence).toBe('FREQ=DAILY');
    expect(daily?.timezone).toBe('America/Los_Angeles');
    expect(daily?.nextOccurrence).toBe('2026-05-02T09:00:00.000Z');

    const kickoff = body.events.find((e) => e.id === 'kickoff-2026');
    expect(kickoff?.recurrence).toBeNull();
    expect(kickoff?.nextOccurrence).toBe('2026-06-15T10:00:00.000Z');
  });

  it('filters events by ?from= and ?to= query params', async () => {
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_HAPPY, 'utf-8');
    const app = mountApp('2026-05-02T08:00:00.000Z');
    server = await listenApp(app);

    // Window excludes the one-off kickoff event (2026-06-15).
    const res = await get(
      server,
      '/api/oc/HEARTBEAT.md/schedule?from=2026-05-01T00:00:00Z&to=2026-05-31T23:59:59Z',
    );
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as ScheduleResponse;
    expect(body.events.map((e) => e.id)).toEqual(['daily-standup']);
  });

  it('returns 400 when HEARTBEAT.md contains an event without timezone', async () => {
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_MISSING_TZ, 'utf-8');
    const app = mountApp('2026-05-02T08:00:00.000Z');
    server = await listenApp(app);

    const res = await get(server, '/api/oc/HEARTBEAT.md/schedule');
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body) as {
      error: { code: string; message: string; eventTitle: string };
    };
    expect(body.error.code).toBe('HEARTBEAT_EVENT_MISSING_TIMEZONE');
    expect(body.error.eventTitle).toBe('Bad Event');
    expect(body.error.message).toContain('P-278');
  });
});

describe('GET /api/oc/HEARTBEAT.md/schedule — edge cases', () => {
  it('returns 404 when HEARTBEAT.md is missing from the workspace', async () => {
    const app = mountApp('2026-05-02T08:00:00.000Z');
    server = await listenApp(app);

    const res = await get(server, '/api/oc/HEARTBEAT.md/schedule');
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('OC_FILE_MISSING');
  });

  it('returns 400 on an unparseable ?from= value', async () => {
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_HAPPY, 'utf-8');
    const app = mountApp('2026-05-02T08:00:00.000Z');
    server = await listenApp(app);

    const res = await get(server, '/api/oc/HEARTBEAT.md/schedule?from=not-a-date');
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('OC_SCHEDULE_BAD_QUERY');
    expect(body.error.message).toContain('not-a-date');
  });

  it('returns 400 on an unparseable ?to= value', async () => {
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_HAPPY, 'utf-8');
    const app = mountApp('2026-05-02T08:00:00.000Z');
    server = await listenApp(app);

    const res = await get(server, '/api/oc/HEARTBEAT.md/schedule?to=garbage');
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('OC_SCHEDULE_BAD_QUERY');
  });

  it('returns 400 when ?from= is the empty string', async () => {
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_HAPPY, 'utf-8');
    const app = mountApp('2026-05-02T08:00:00.000Z');
    server = await listenApp(app);

    const res = await get(server, '/api/oc/HEARTBEAT.md/schedule?from=');
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('OC_SCHEDULE_BAD_QUERY');
    expect(body.error.message).toContain('non-empty');
  });

  it('reports nextOccurrence=null for past one-off events', async () => {
    const pastHb = [
      '# Heartbeat',
      '',
      '## Schedule',
      '',
      '### Old Kickoff',
      '',
      '- id: old-kickoff',
      '- start: 2020-01-01T10:00:00',
      '- duration: PT1H',
      '- timezone: UTC',
      '',
    ].join('\n');
    await writeFile(join(root, 'HEARTBEAT.md'), pastHb, 'utf-8');
    const app = mountApp('2026-05-02T08:00:00.000Z');
    server = await listenApp(app);

    // No filter — nextOccurrence is null and the event is still returned.
    const resAll = await get(server, '/api/oc/HEARTBEAT.md/schedule');
    expect(resAll.status).toBe(200);
    const bodyAll = JSON.parse(resAll.body) as ScheduleResponse;
    expect(bodyAll.events).toHaveLength(1);
    expect(bodyAll.events[0]!.nextOccurrence).toBeNull();

    // With a filter — the null-next-occurrence event is filtered out.
    const resFilt = await get(
      server,
      '/api/oc/HEARTBEAT.md/schedule?from=2025-01-01T00:00:00Z',
    );
    expect(resFilt.status).toBe(200);
    const bodyFilt = JSON.parse(resFilt.body) as ScheduleResponse;
    expect(bodyFilt.events).toEqual([]);
  });

  it('rejects an array ?from= (non-string) as bad query', async () => {
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_HAPPY, 'utf-8');
    const app = mountApp('2026-05-02T08:00:00.000Z');
    server = await listenApp(app);

    // Repeating a query key yields a string[], so `typeof raw !== 'string'`.
    const res = await get(server, '/api/oc/HEARTBEAT.md/schedule?from=a&from=b');
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('OC_SCHEDULE_BAD_QUERY');
  });
});
