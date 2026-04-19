/**
 * GET /api/oc/HEARTBEAT.md#Schedule — calendar-renderable CalendarEvent[].
 *
 * This is a specialised view over the HEARTBEAT.md `Schedule` H2 section
 * that the generic Layer 1 router (pulse 27) surfaces as raw parsed
 * markdown. M365 Calendar consumers need typed events with RRULE
 * recurrence and next-occurrence timestamps — this route returns that
 * shape so partners do not need to re-parse the schedule bullets.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handler reads
 * HEARTBEAT.md via `parseWorkspace` and passes the Schedule section to
 * `parseHeartbeatSchedule` in claws-sdk. All parsing / validation lives
 * there. The route is served off the `/api/oc` prefix router so it
 * participates in the same auth and ETag stacks as every other OC read.
 *
 * Query params:
 *   ?from=<ISO-8601>  — filter out events whose next occurrence is
 *                       strictly before `from`.
 *   ?to=<ISO-8601>    — filter out events whose next occurrence is
 *                       strictly after `to`.
 *
 * The route reads HEARTBEAT.md directly from disk, so it keeps serving
 * the last-good file contents even when the compile plane is in ERROR
 * state (acceptance criterion in pulse 37).
 *
 * @module claws-serve/routes/schedule
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  parseHeartbeatSchedule,
  parseWorkspace,
  HeartbeatScheduleError,
  type CalendarEvent,
} from '../../../claws-sdk/src/workspace/index.js';
import { computeNextOccurrence } from '../../../claws-sdk/src/workspace/index.js';

export interface ScheduleRouterOptions {
  readonly workspaceRoot: string;
  /**
   * Override for the "now" value used when filtering next occurrences.
   * Production passes `() => new Date()`; tests can inject a stable clock.
   */
  readonly now?: () => Date;
}

/**
 * Calendar-renderable wire shape. Extends `CalendarEvent` with the
 * next-occurrence timestamp (computed server-side) so clients can
 * render immediately without re-implementing RRULE math.
 */
export interface CalendarEventResponse extends CalendarEvent {
  /** ISO-8601 UTC timestamp of the next occurrence at-or-after `now`. */
  readonly nextOccurrence: string | null;
}

export interface ScheduleResponse {
  readonly file: 'HEARTBEAT.md';
  readonly section: 'Schedule';
  readonly events: readonly CalendarEventResponse[];
}

/**
 * Attach `GET /HEARTBEAT.md/schedule` to the `oc` prefix router.
 *
 * HTTP fragments (`#Schedule`) never reach the server, so partners
 * address this view via the trailing path segment. `GET
 * /api/oc/HEARTBEAT.md` continues to return the raw section payload
 * from the generic router — the calendar view lives on a dedicated path
 * so the two can evolve independently.
 */
export function scheduleRouter(options: ScheduleRouterOptions): Router {
  const router = Router();
  const nowFn = options.now ?? ((): Date => new Date());

  router.get('/HEARTBEAT.md/schedule', (req, res, next) => {
    handleSchedule(options.workspaceRoot, nowFn, req, res, next).catch(next);
  });

  return router;
}

async function handleSchedule(
  workspaceRoot: string,
  nowFn: () => Date,
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const state = await parseWorkspace(workspaceRoot);
  if (state.heartbeat === null) {
    res.status(404).json({
      error: {
        code: 'OC_FILE_MISSING',
        message: 'HEARTBEAT.md not found in workspace',
      },
    });
    return;
  }

  let events: CalendarEvent[];
  try {
    events = parseHeartbeatSchedule(state.heartbeat);
  } catch (err) {
    // The SDK parser only raises HeartbeatScheduleError; anything else
    // would be a programmer error and is propagated to Express's error
    // handler by the `.catch(next)` guard on the route registration.
    /* c8 ignore next */
    if (!(err instanceof HeartbeatScheduleError)) throw err;
    res.status(400).json({
      error: {
        code: err.code,
        message: err.message,
        eventTitle: err.eventTitle,
      },
    });
    return;
  }

  const from = parseDateQuery(req.query['from']);
  const to = parseDateQuery(req.query['to']);
  if (from instanceof Error) {
    res.status(400).json({
      error: { code: 'OC_SCHEDULE_BAD_QUERY', message: `Invalid ?from= value: ${from.message}` },
    });
    return;
  }
  if (to instanceof Error) {
    res.status(400).json({
      error: { code: 'OC_SCHEDULE_BAD_QUERY', message: `Invalid ?to= value: ${to.message}` },
    });
    return;
  }

  const now = nowFn();
  const enriched: CalendarEventResponse[] = events.map((ev) => ({
    ...ev,
    nextOccurrence: computeNextOccurrence(ev, now)?.toISOString() ?? null,
  }));

  const filtered = enriched.filter((ev) => {
    if (ev.nextOccurrence === null) return false;
    const next = Date.parse(ev.nextOccurrence);
    if (from !== undefined && next < from.getTime()) return false;
    if (to !== undefined && next > to.getTime()) return false;
    return true;
  });

  const needsFilter = from !== undefined || to !== undefined;
  const body: ScheduleResponse = {
    file: 'HEARTBEAT.md',
    section: 'Schedule',
    events: needsFilter ? filtered : enriched,
  };
  res.status(200).json(body);
}

function parseDateQuery(raw: unknown): Date | undefined | Error {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || raw.length === 0) {
    return new Error('must be a non-empty ISO-8601 string');
  }
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return new Error(`not a valid ISO-8601 date: ${raw}`);
  return new Date(ms);
}
