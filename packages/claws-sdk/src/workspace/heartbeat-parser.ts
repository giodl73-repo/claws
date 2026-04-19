/**
 * HEARTBEAT.md Schedule parser — extract CalendarEvent[] from the
 * `Schedule` H2 section of a HEARTBEAT.md file.
 *
 * The serve layer exposes `GET /api/oc/HEARTBEAT.md#Schedule` so that
 * M365 Calendar can render a customer's OC lifecycle schedule with
 * typed recurrence rules. All business logic lives here; claws-serve is
 * a thin adapter (SDK-owns-logic).
 *
 * Event format (markdown under `## Schedule`):
 *
 * ```markdown
 * ## Schedule
 *
 * ### <Title>
 *
 * - id: <stable-id>
 * - start: 2026-05-01T09:00:00
 * - duration: PT30M
 * - timezone: America/Los_Angeles
 * - recurrence: FREQ=WEEKLY;BYDAY=MO,WE,FR      (optional)
 * - category: <free-text>                        (optional)
 * - description: <free-text>                     (optional)
 * ```
 *
 * P-278: timezone is required on every event. Missing timezone is a
 * validation error (the route surfaces 400) — we never silently default
 * to UTC.
 *
 * @module claws-sdk/workspace/heartbeat-parser
 */

import type { HeartbeatSection } from '@bic/openclaw-workspace/path';

/** A single calendar-renderable schedule entry. */
export interface CalendarEvent {
  /** Stable id declared in the markdown. */
  readonly id: string;
  /** Human-readable title (taken from the H3 heading). */
  readonly title: string;
  /** Optional long-form description. */
  readonly description: string | undefined;
  /** First occurrence start timestamp — ISO-8601 local time (no offset). */
  readonly startTime: string;
  /** End timestamp of the first occurrence — ISO-8601 local time. */
  readonly endTime: string;
  /** ISO-8601 duration string (`PT30M`, `PT1H`, `P1D`). */
  readonly duration: string;
  /** IANA timezone — required (P-278). */
  readonly timezone: string;
  /**
   * iCalendar RRULE payload (the part after `RRULE:`). `null` for one-off
   * events. The route layer prefixes `RRULE:` on the wire.
   */
  readonly recurrence: string | null;
  /** Free-text category (`lifecycle`, `review`, etc.). */
  readonly category: string | undefined;
}

/** Error raised by {@link parseHeartbeatSchedule} when validation fails. */
export class HeartbeatScheduleError extends Error {
  readonly code: string;
  readonly eventTitle: string | undefined;

  constructor(code: string, message: string, eventTitle?: string) {
    super(message);
    this.name = 'HeartbeatScheduleError';
    this.code = code;
    this.eventTitle = eventTitle;
  }
}

/**
 * Parse the `Schedule` H2 section of a HEARTBEAT.md file into typed
 * CalendarEvent[].
 *
 * Returns `[]` when the file is null/empty or contains no Schedule
 * section. Throws {@link HeartbeatScheduleError} for events that are
 * missing a timezone or otherwise malformed.
 */
export function parseHeartbeatSchedule(
  heartbeat: HeartbeatSection | null,
): CalendarEvent[] {
  if (heartbeat === null) return [];
  const schedule = heartbeat.sections.find((s) => s.heading === 'Schedule');
  if (schedule === undefined) return [];

  const blocks = splitH3Blocks(schedule.body);
  return blocks.map((b) => parseBlock(b));
}

interface H3Block {
  readonly title: string;
  readonly fields: Map<string, string>;
}

function parseH3Title(line: string): string | null {
  if (!line.startsWith('### ') && !line.startsWith('###\t')) return null;
  let i = 3;
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i += 1;
  let end = line.length;
  while (end > i && (line[end - 1] === ' ' || line[end - 1] === '\t')) end -= 1;
  if (end <= i) return null;
  return line.slice(i, end);
}

function parseFieldLine(raw: string): { key: string; value: string } | null {
  if (!raw.startsWith('-')) return null;
  let i = 1;
  if (i >= raw.length || (raw[i] !== ' ' && raw[i] !== '\t')) return null;
  while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) i += 1;
  const keyStart = i;
  if (i >= raw.length || !/[a-zA-Z]/.test(raw[i]!)) return null;
  i += 1;
  while (i < raw.length && /[a-zA-Z0-9_-]/.test(raw[i]!)) i += 1;
  const key = raw.slice(keyStart, i);
  while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) i += 1;
  if (raw[i] !== ':') return null;
  i += 1;
  const afterColon = i;
  while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) i += 1;
  // The original regex required at least one character after the colon's
  // optional whitespace. If the post-colon remainder is empty, no field.
  if (afterColon >= raw.length) return null;
  let end = raw.length;
  while (end > i && (raw[end - 1] === ' ' || raw[end - 1] === '\t')) end -= 1;
  // Whitespace-only value: original regex yielded a single-space value
  // because `.+?` matched one whitespace char before `\s*$` consumed the
  // rest. Preserve that so downstream "is field present?" checks behave.
  if (end <= i) return { key, value: ' ' };
  return { key, value: raw.slice(i, end) };
}

function splitH3Blocks(body: string): H3Block[] {
  const lines = body.split('\n');
  const blocks: H3Block[] = [];
  let current: { title: string; buffer: string[] } | null = null;

  for (const line of lines) {
    const h3Title = parseH3Title(line);
    if (h3Title !== null) {
      if (current !== null) {
        blocks.push({ title: current.title, fields: parseFields(current.buffer) });
      }
      current = { title: h3Title, buffer: [] };
      continue;
    }
    if (current !== null) {
      current.buffer.push(line);
    }
  }
  if (current !== null) {
    blocks.push({ title: current.title, fields: parseFields(current.buffer) });
  }
  return blocks;
}

function parseFields(lines: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of lines) {
    const parsed = parseFieldLine(raw);
    if (parsed === null) continue;
    out.set(parsed.key.toLowerCase(), parsed.value);
  }
  return out;
}

function parseBlock(block: H3Block): CalendarEvent {
  const { title, fields } = block;

  const id = fields.get('id');
  if (id === undefined || id.length === 0) {
    throw new HeartbeatScheduleError(
      'HEARTBEAT_EVENT_MISSING_ID',
      `Schedule event "${title}" missing required field: id`,
      title,
    );
  }

  const start = fields.get('start');
  if (start === undefined) {
    throw new HeartbeatScheduleError(
      'HEARTBEAT_EVENT_MISSING_START',
      `Schedule event "${title}" missing required field: start`,
      title,
    );
  }

  const duration = fields.get('duration');
  if (duration === undefined) {
    throw new HeartbeatScheduleError(
      'HEARTBEAT_EVENT_MISSING_DURATION',
      `Schedule event "${title}" missing required field: duration`,
      title,
    );
  }

  const timezone = fields.get('timezone');
  if (timezone === undefined || timezone.length === 0) {
    throw new HeartbeatScheduleError(
      'HEARTBEAT_EVENT_MISSING_TIMEZONE',
      `Schedule event "${title}" missing required field: timezone (P-278 — no silent UTC defaults)`,
      title,
    );
  }

  const recurrence = fields.get('recurrence');
  if (recurrence !== undefined) {
    validateRRule(recurrence, title);
  }

  const endTime = addIsoDuration(start, duration, title);

  return {
    id,
    title,
    description: fields.get('description'),
    startTime: start,
    endTime,
    duration,
    timezone,
    recurrence: recurrence ?? null,
    category: fields.get('category'),
  };
}

/**
 * Minimal RRULE structural check — rejects the missing-FREQ= case
 * without re-implementing RFC 5545. Downstream iCal libraries handle
 * full validation. The parser's key-value regex rejects whitespace-only
 * values before we reach this point.
 */
function validateRRule(rrule: string, title: string): void {
  if (!/(^|;)FREQ=/.test(rrule)) {
    throw new HeartbeatScheduleError(
      'HEARTBEAT_EVENT_INVALID_RRULE',
      `Schedule event "${title}" recurrence missing FREQ= clause`,
      title,
    );
  }
}

/** Supported ISO-8601 duration subset: `PnDTnHnMnS` (any component optional). */
const DURATION_RE = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

function addIsoDuration(start: string, duration: string, title: string): string {
  const m = DURATION_RE.exec(duration);
  if (m === null || duration === 'P' || duration === 'PT') {
    throw new HeartbeatScheduleError(
      'HEARTBEAT_EVENT_INVALID_DURATION',
      `Schedule event "${title}" has invalid ISO-8601 duration: ${duration}`,
      title,
    );
  }
  const days = parseIntOrZero(m[1]);
  const hours = parseIntOrZero(m[2]);
  const minutes = parseIntOrZero(m[3]);
  const seconds = parseIntOrZero(m[4]);

  const base = parseLocalIsoToUtc(start, title);
  const ms =
    (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
  const end = new Date(base.getTime() + ms);
  return formatLocalIso(end);
}

function parseIntOrZero(raw: string | undefined): number {
  if (raw === undefined) return 0;
  return parseInt(raw, 10);
}

/**
 * Parse a local ISO-8601 timestamp (no offset) as UTC. We only use this
 * for duration arithmetic — the rendered `endTime` is a pure string
 * offset calculation, not a wall-clock conversion.
 */
function parseLocalIsoToUtc(iso: string, title: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(iso);
  if (m === null) {
    throw new HeartbeatScheduleError(
      'HEARTBEAT_EVENT_INVALID_START',
      `Schedule event "${title}" start must be ISO-8601 local time (YYYY-MM-DDTHH:MM[:SS]): ${iso}`,
      title,
    );
  }
  return new Date(Date.UTC(
    parseInt(m[1]!, 10),
    parseInt(m[2]!, 10) - 1,
    parseInt(m[3]!, 10),
    parseInt(m[4]!, 10),
    parseInt(m[5]!, 10),
    parseInt(m[6] ?? '0', 10),
  ));
}

function formatLocalIso(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

/**
 * Compute the next occurrence of an event at-or-after `now`.
 *
 * Handles `FREQ=DAILY`, `FREQ=WEEKLY`, `FREQ=MONTHLY` with optional
 * `INTERVAL=n` and `BYDAY=` (for WEEKLY). Unknown freqs return the
 * start timestamp unchanged — partners that need full RFC 5545 coverage
 * can re-parse `recurrence` with a dedicated iCal library.
 *
 * Returns the start timestamp itself when the event is one-off
 * (`recurrence === null`) and `start >= now`; otherwise `null` for
 * one-off events that have already occurred.
 */
export function computeNextOccurrence(
  event: CalendarEvent,
  now: Date,
): Date | null {
  const start = parseLocalIsoToUtc(event.startTime, event.title);
  if (event.recurrence === null) {
    return start.getTime() >= now.getTime() ? start : null;
  }
  const rule = parseRRuleParts(event.recurrence);
  const freq = rule.get('FREQ');
  if (freq === undefined) return start;

  if (start.getTime() >= now.getTime()) return start;

  const interval = Math.max(1, parseIntOrZero(rule.get('INTERVAL')) || 1);
  const byday = rule.get('BYDAY');

  if (freq === 'DAILY') {
    return advanceDaily(start, now, interval);
  }
  if (freq === 'WEEKLY') {
    return advanceWeekly(start, now, interval, byday);
  }
  if (freq === 'MONTHLY') {
    return advanceMonthly(start, now, interval);
  }
  return start;
}

function parseRRuleParts(rrule: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const pair of rrule.split(';')) {
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    out.set(pair.slice(0, eq).toUpperCase(), pair.slice(eq + 1));
  }
  return out;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function advanceDaily(start: Date, now: Date, interval: number): Date {
  const diff = now.getTime() - start.getTime();
  const periodMs = interval * DAY_MS;
  const periods = Math.ceil(diff / periodMs);
  return new Date(start.getTime() + periods * periodMs);
}

const BYDAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

function advanceWeekly(
  start: Date,
  now: Date,
  interval: number,
  byday: string | undefined,
): Date {
  if (byday === undefined || byday.length === 0) {
    const weekMs = 7 * DAY_MS * interval;
    const diff = now.getTime() - start.getTime();
    const periods = Math.ceil(diff / weekMs);
    return new Date(start.getTime() + periods * weekMs);
  }
  const daySet = new Set<number>();
  for (const tok of byday.split(',')) {
    const d = BYDAY_MAP[tok.toUpperCase()];
    if (d !== undefined) daySet.add(d);
  }
  if (daySet.size === 0) return start;

  let cursor = new Date(Math.max(start.getTime(), now.getTime()));
  for (let i = 0; i < 366; i++) {
    if (daySet.has(cursor.getUTCDay())) {
      const candidate = new Date(Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        cursor.getUTCDate(),
        start.getUTCHours(),
        start.getUTCMinutes(),
        start.getUTCSeconds(),
      ));
      if (candidate.getTime() >= now.getTime()) return candidate;
    }
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return start;
}

function advanceMonthly(start: Date, now: Date, interval: number): Date {
  const cursor = new Date(start.getTime());
  while (cursor.getTime() < now.getTime()) {
    cursor.setUTCMonth(cursor.getUTCMonth() + interval);
  }
  return cursor;
}
