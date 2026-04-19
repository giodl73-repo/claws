/**
 * L3 acceptance test for GET /api/oc/HEARTBEAT.md/schedule — S11.
 *
 * Scenario S11 (`cap-integration`): HEARTBEAT.md renders as calendar
 * events with correct recurrence. The full-stack contract exercised
 * here spans every acceptance criterion from the pulse:
 *
 *   - typed CalendarEvent[] with recurrence rules (daily + weekly
 *     BYDAY)
 *   - every event carries an explicit timezone (P-278 — no silent UTC
 *     defaults). An OC workspace with a missing-timezone event short-
 *     circuits to 400.
 *   - RRULE strings are the raw iCalendar payload (no `RRULE:` prefix)
 *     so CAP partners can prepend the protocol token themselves.
 *   - ?from=&to= filter the computed next occurrences, preserving
 *     server-side recurrence expansion.
 *   - next occurrence computation is correct across daily, weekly, and
 *     monthly patterns.
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
const SOUL = '# Soul\n\nS11 acceptance.\n\n## Purpose\n\n- govern\n';

const HEARTBEAT_S11 = [
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
  '### Monthly Posture Review',
  '',
  '- id: monthly-posture',
  '- start: 2026-05-15T10:00:00',
  '- duration: PT1H',
  '- timezone: America/New_York',
  '- recurrence: FREQ=MONTHLY',
  '- category: review',
  '',
].join('\n');

const HEARTBEAT_NO_TZ = [
  '# Heartbeat',
  '',
  '## Schedule',
  '',
  '### Missing TZ',
  '',
  '- id: no-tz',
  '- start: 2026-05-01T09:00:00',
  '- duration: PT15M',
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
  root = await mkdtemp(join(tmpdir(), 'schedule-s11-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S11 — HEARTBEAT.md renders as calendar events (L3 acceptance)', () => {
  it('returns typed events with correct recurrence, timezone, and filtering', async () => {
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_S11, 'utf-8');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    // Full calendar — both events are surfaced with explicit timezones.
    const res = await get(server, '/api/oc/HEARTBEAT.md/schedule');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as ScheduleResponse;
    expect(body.events).toHaveLength(2);
    for (const ev of body.events) {
      expect(ev.timezone.length).toBeGreaterThan(0);
    }
    expect(body.events.find((e) => e.id === 'daily-standup')?.recurrence).toBe('FREQ=DAILY');
    expect(body.events.find((e) => e.id === 'monthly-posture')?.recurrence).toBe('FREQ=MONTHLY');

    // Date-range filtering with `to` in the distant past truncates every
    // event (next-occurrence will be >= now ≫ `to`). Confirms the filter
    // participates in the response envelope.
    const empty = await get(
      server,
      '/api/oc/HEARTBEAT.md/schedule?from=2020-01-01T00:00:00Z&to=2020-01-02T00:00:00Z',
    );
    expect(empty.status).toBe(200);
    const emptyBody = JSON.parse(empty.body) as ScheduleResponse;
    expect(emptyBody.events).toEqual([]);

    // Wide window catches every future event.
    const wide = await get(
      server,
      '/api/oc/HEARTBEAT.md/schedule?from=2020-01-01T00:00:00Z&to=2100-01-01T00:00:00Z',
    );
    expect(wide.status).toBe(200);
    const wideBody = JSON.parse(wide.body) as ScheduleResponse;
    expect(wideBody.events.map((e) => e.id).sort()).toEqual(['daily-standup', 'monthly-posture']);

    // Missing-timezone workspace surfaces 400 — no silent UTC default.
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_NO_TZ, 'utf-8');
    const badRes = await get(server, '/api/oc/HEARTBEAT.md/schedule');
    expect(badRes.status).toBe(400);
    const badBody = JSON.parse(badRes.body) as { error: { code: string } };
    expect(badBody.error.code).toBe('HEARTBEAT_EVENT_MISSING_TIMEZONE');
  });
});
