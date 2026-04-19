/**
 * L0 unit tests for the HEARTBEAT.md schedule parser.
 */
import { describe, expect, it } from 'vitest';
import {
  computeNextOccurrence,
  HeartbeatScheduleError,
  parseHeartbeatSchedule,
  type CalendarEvent,
} from '../../src/workspace/heartbeat-parser.js';
import type { HeartbeatSection } from '@bic/openclaw-workspace/path';

function heartbeat(scheduleBody: string): HeartbeatSection {
  const raw = `# Heartbeat\n\n## Schedule\n\n${scheduleBody}\n`;
  return {
    raw,
    preamble: '',
    sections: [{ heading: 'Schedule', body: scheduleBody, line: 3 }],
  };
}

describe('parseHeartbeatSchedule — L0', () => {
  it('parses a daily recurring event with timezone and RRULE', () => {
    const hb = heartbeat(
      [
        '### Morning Standup',
        '',
        '- id: daily-standup',
        '- start: 2026-05-01T09:00:00',
        '- duration: PT15M',
        '- timezone: America/Los_Angeles',
        '- recurrence: FREQ=DAILY',
        '- category: lifecycle',
      ].join('\n'),
    );
    const events = parseHeartbeatSchedule(hb);
    expect(events).toHaveLength(1);
    const ev = events[0]!;
    expect(ev.id).toBe('daily-standup');
    expect(ev.title).toBe('Morning Standup');
    expect(ev.recurrence).toBe('FREQ=DAILY');
    expect(ev.timezone).toBe('America/Los_Angeles');
    expect(ev.startTime).toBe('2026-05-01T09:00:00');
    expect(ev.endTime).toBe('2026-05-01T09:15:00');
    expect(ev.duration).toBe('PT15M');
    expect(ev.category).toBe('lifecycle');
  });

  it('parses a weekly event with BYDAY RRULE parts', () => {
    const hb = heartbeat(
      [
        '### MWF Review',
        '',
        '- id: mwf-review',
        '- start: 2026-05-04T14:00:00',
        '- duration: PT30M',
        '- timezone: America/New_York',
        '- recurrence: FREQ=WEEKLY;BYDAY=MO,WE,FR',
      ].join('\n'),
    );
    const events = parseHeartbeatSchedule(hb);
    expect(events).toHaveLength(1);
    expect(events[0]!.recurrence).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    expect(events[0]!.endTime).toBe('2026-05-04T14:30:00');
  });

  it('rejects an event that omits timezone (P-278)', () => {
    const hb = heartbeat(
      [
        '### No TZ',
        '',
        '- id: no-tz',
        '- start: 2026-05-01T09:00:00',
        '- duration: PT30M',
        '- recurrence: FREQ=DAILY',
      ].join('\n'),
    );
    expect(() => parseHeartbeatSchedule(hb)).toThrow(HeartbeatScheduleError);
    try {
      parseHeartbeatSchedule(hb);
    } catch (err) {
      const e = err as HeartbeatScheduleError;
      expect(e.code).toBe('HEARTBEAT_EVENT_MISSING_TIMEZONE');
      expect(e.eventTitle).toBe('No TZ');
      expect(e.message).toContain('P-278');
    }
  });

  it('parses a one-off event (no recurrence) and leaves recurrence null', () => {
    const hb = heartbeat(
      [
        '### Kickoff',
        '',
        '- id: kickoff-2026',
        '- start: 2026-06-10T10:00:00',
        '- duration: PT1H',
        '- timezone: UTC',
        '- description: Annual kickoff session',
      ].join('\n'),
    );
    const events = parseHeartbeatSchedule(hb);
    expect(events).toHaveLength(1);
    expect(events[0]!.recurrence).toBeNull();
    expect(events[0]!.description).toBe('Annual kickoff session');
    expect(events[0]!.endTime).toBe('2026-06-10T11:00:00');
  });

  it('returns empty array for a heartbeat with no Schedule section', () => {
    const hb: HeartbeatSection = {
      raw: '# Heartbeat\n\n## On Start\n\n- boot\n',
      preamble: '',
      sections: [{ heading: 'On Start', body: '- boot', line: 3 }],
    };
    expect(parseHeartbeatSchedule(hb)).toEqual([]);
    expect(parseHeartbeatSchedule(null)).toEqual([]);
  });
});

describe('computeNextOccurrence — L0', () => {
  it('advances DAILY RRULE to the next day-at-or-after now', () => {
    const ev: CalendarEvent = {
      id: 'd1',
      title: 'Daily',
      description: undefined,
      startTime: '2026-05-01T09:00:00',
      endTime: '2026-05-01T09:15:00',
      duration: 'PT15M',
      timezone: 'UTC',
      recurrence: 'FREQ=DAILY',
      category: undefined,
    };
    const now = new Date(Date.UTC(2026, 4, 5, 8, 0, 0));
    const next = computeNextOccurrence(ev, now);
    expect(next).not.toBeNull();
    expect(next!.toISOString()).toBe('2026-05-05T09:00:00.000Z');
  });

  it('returns start directly when event is one-off and still in the future', () => {
    const ev: CalendarEvent = {
      id: 'k',
      title: 'K',
      description: undefined,
      startTime: '2026-06-01T10:00:00',
      endTime: '2026-06-01T11:00:00',
      duration: 'PT1H',
      timezone: 'UTC',
      recurrence: null,
      category: undefined,
    };
    const now = new Date(Date.UTC(2026, 0, 1));
    const next = computeNextOccurrence(ev, now);
    expect(next?.toISOString()).toBe('2026-06-01T10:00:00.000Z');
  });

  it('returns null when a one-off event has already occurred', () => {
    const ev: CalendarEvent = {
      id: 'k',
      title: 'K',
      description: undefined,
      startTime: '2025-01-01T10:00:00',
      endTime: '2025-01-01T11:00:00',
      duration: 'PT1H',
      timezone: 'UTC',
      recurrence: null,
      category: undefined,
    };
    const now = new Date(Date.UTC(2026, 0, 1));
    expect(computeNextOccurrence(ev, now)).toBeNull();
  });
});

describe('parseHeartbeatSchedule — validation branches', () => {
  it('throws when id is missing', () => {
    const hb = heartbeat(
      ['### NoId', '', '- start: 2026-05-01T09:00:00', '- duration: PT15M', '- timezone: UTC'].join('\n'),
    );
    expect(() => parseHeartbeatSchedule(hb)).toThrow(/HEARTBEAT_EVENT_MISSING_ID|missing required field: id/);
  });

  it('throws when start is missing', () => {
    const hb = heartbeat(
      ['### NoStart', '', '- id: x', '- duration: PT15M', '- timezone: UTC'].join('\n'),
    );
    expect(() => parseHeartbeatSchedule(hb)).toThrow(/missing required field: start/);
  });

  it('throws when duration is missing', () => {
    const hb = heartbeat(
      ['### NoDur', '', '- id: x', '- start: 2026-05-01T09:00:00', '- timezone: UTC'].join('\n'),
    );
    expect(() => parseHeartbeatSchedule(hb)).toThrow(/missing required field: duration/);
  });

  it('throws when recurrence lacks FREQ=', () => {
    const hb = heartbeat(
      [
        '### BadRule',
        '',
        '- id: x',
        '- start: 2026-05-01T09:00:00',
        '- duration: PT15M',
        '- timezone: UTC',
        '- recurrence: INTERVAL=2',
      ].join('\n'),
    );
    expect(() => parseHeartbeatSchedule(hb)).toThrow(/missing FREQ=/);
  });

  it('rejects a whitespace-only recurrence value as missing FREQ=', () => {
    const hb = heartbeat(
      [
        '### WSOnly',
        '',
        '- id: x',
        '- start: 2026-05-01T09:00:00',
        '- duration: PT15M',
        '- timezone: UTC',
        '- recurrence:   ',
      ].join('\n'),
    );
    expect(() => parseHeartbeatSchedule(hb)).toThrow(/missing FREQ=/);
  });

  it('throws when start is not ISO-8601 local time', () => {
    const hb = heartbeat(
      [
        '### BadStart',
        '',
        '- id: x',
        '- start: yesterday',
        '- duration: PT15M',
        '- timezone: UTC',
      ].join('\n'),
    );
    expect(() => parseHeartbeatSchedule(hb)).toThrow(/ISO-8601 local time/);
  });

  it('throws on invalid ISO duration', () => {
    const hb = heartbeat(
      [
        '### BadDur',
        '',
        '- id: x',
        '- start: 2026-05-01T09:00:00',
        '- duration: 30min',
        '- timezone: UTC',
      ].join('\n'),
    );
    expect(() => parseHeartbeatSchedule(hb)).toThrow(/invalid ISO-8601 duration/);
  });

  it('rejects a plain "PT" duration', () => {
    const hb = heartbeat(
      [
        '### EmptyDur',
        '',
        '- id: x',
        '- start: 2026-05-01T09:00:00',
        '- duration: PT',
        '- timezone: UTC',
      ].join('\n'),
    );
    expect(() => parseHeartbeatSchedule(hb)).toThrow(/invalid ISO-8601 duration/);
  });

  it('parses a P1D day-only duration', () => {
    const hb = heartbeat(
      [
        '### Daylong',
        '',
        '- id: x',
        '- start: 2026-05-01T00:00:00',
        '- duration: P1D',
        '- timezone: UTC',
      ].join('\n'),
    );
    const ev = parseHeartbeatSchedule(hb)[0]!;
    expect(ev.endTime).toBe('2026-05-02T00:00:00');
  });

  it('parses a start with HH:MM only (no seconds)', () => {
    const hb = heartbeat(
      [
        '### ShortStart',
        '',
        '- id: x',
        '- start: 2026-05-01T09:00',
        '- duration: PT1H',
        '- timezone: UTC',
      ].join('\n'),
    );
    expect(parseHeartbeatSchedule(hb)).toHaveLength(1);
  });

  it('ignores non-field bullets in a block', () => {
    const hb = heartbeat(
      [
        '### Ignored',
        '',
        'some description text',
        '- id: x',
        '- start: 2026-05-01T09:00:00',
        '- duration: PT15M',
        '- timezone: UTC',
        '- not a valid key!',
      ].join('\n'),
    );
    expect(parseHeartbeatSchedule(hb)).toHaveLength(1);
  });
});

describe('computeNextOccurrence — extra branches', () => {
  function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
    return {
      id: 'x',
      title: 'X',
      description: undefined,
      startTime: '2026-05-01T09:00:00',
      endTime: '2026-05-01T09:30:00',
      duration: 'PT30M',
      timezone: 'UTC',
      recurrence: 'FREQ=DAILY',
      category: undefined,
      ...overrides,
    };
  }

  it('honours INTERVAL=2 on DAILY RRULE', () => {
    const ev = makeEvent({ recurrence: 'FREQ=DAILY;INTERVAL=2' });
    const now = new Date(Date.UTC(2026, 4, 6, 8, 0, 0));
    const next = computeNextOccurrence(ev, now);
    // 2026-05-01 → +2d → 05-03 → 05-05 → 05-07 (first >= 05-06 08:00)
    expect(next!.toISOString()).toBe('2026-05-07T09:00:00.000Z');
  });

  it('advances WEEKLY without BYDAY', () => {
    const ev = makeEvent({ recurrence: 'FREQ=WEEKLY' });
    const now = new Date(Date.UTC(2026, 4, 20, 0, 0, 0));
    const next = computeNextOccurrence(ev, now);
    expect(next).not.toBeNull();
    // 2026-05-01 + ceil(19d/7d)=3 weeks → 05-22
    expect(next!.toISOString()).toBe('2026-05-22T09:00:00.000Z');
  });

  it('advances WEEKLY with BYDAY=MO,WE,FR', () => {
    // Start is 2026-05-04 Monday; now = 2026-05-06 (Wed) 10:00 UTC; start 09:00
    // Next >= now with day in {MO,WE,FR} at 09:00 — Wed 2026-05-06 09:00 is
    // before now, so next valid is Fri 2026-05-08 09:00.
    const ev = makeEvent({
      startTime: '2026-05-04T09:00:00',
      recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    });
    const now = new Date(Date.UTC(2026, 4, 6, 10, 0, 0));
    const next = computeNextOccurrence(ev, now);
    expect(next).not.toBeNull();
    expect(next!.toISOString()).toBe('2026-05-08T09:00:00.000Z');
  });

  it('returns start when BYDAY has only unknown tokens', () => {
    const ev = makeEvent({ recurrence: 'FREQ=WEEKLY;BYDAY=XX' });
    const now = new Date(Date.UTC(2026, 4, 10));
    expect(computeNextOccurrence(ev, now)!.toISOString()).toBe('2026-05-01T09:00:00.000Z');
  });

  it('advances MONTHLY', () => {
    const ev = makeEvent({ recurrence: 'FREQ=MONTHLY' });
    const now = new Date(Date.UTC(2026, 7, 15));
    const next = computeNextOccurrence(ev, now);
    // 2026-05-01 + months until >= 2026-08-15 → 2026-09-01
    expect(next!.toISOString()).toBe('2026-09-01T09:00:00.000Z');
  });

  it('returns start for an unknown FREQ', () => {
    const ev = makeEvent({ recurrence: 'FREQ=YEARLY' });
    const now = new Date(Date.UTC(2026, 11, 31));
    expect(computeNextOccurrence(ev, now)!.toISOString()).toBe('2026-05-01T09:00:00.000Z');
  });

  it('returns start when RRULE lacks FREQ entirely', () => {
    // Parser validates FREQ, but computeNextOccurrence is safe against an
    // externally-constructed event that slipped past validation.
    const ev = makeEvent({ recurrence: 'INTERVAL=1' });
    const now = new Date(Date.UTC(2030, 0, 1));
    expect(computeNextOccurrence(ev, now)!.toISOString()).toBe('2026-05-01T09:00:00.000Z');
  });

  it('skips malformed RRULE parts without a key/value split', () => {
    const ev = makeEvent({ recurrence: 'FREQ=DAILY;=oops;JUNK' });
    const now = new Date(Date.UTC(2026, 4, 2));
    const next = computeNextOccurrence(ev, now);
    expect(next!.toISOString()).toBe('2026-05-02T09:00:00.000Z');
  });

  it('returns start when start is exactly now for a DAILY event', () => {
    const ev = makeEvent({ startTime: '2026-05-01T09:00:00' });
    const now = new Date(Date.UTC(2026, 4, 1, 9, 0, 0));
    expect(computeNextOccurrence(ev, now)!.toISOString()).toBe('2026-05-01T09:00:00.000Z');
  });
});
