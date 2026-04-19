/**
 * Time-travel middleware — intercepts `?at=` on read requests and serves
 * the resolved historical {@link GovernanceIR} from the compilation
 * forest cache instead of letting the request reach the live-workspace
 * handler.
 *
 * Three addressing modes are supported (see `parseAt` in
 * claws-sdk/workspace): version (`?at=v38`), time
 * (`?at=2026-04-14`), and named snapshot (`?at=snap:pre-upgrade`).
 *
 * Behaviour:
 * - GET + `?at=` → resolve via {@link resolveAt} and respond with the
 *   cached IR. The `X-Governance-Version` header carries the resolved
 *   version (or `snap:<name>` for snapshot mode).
 * - GET without `?at=` → pass through; downstream handler serves live.
 * - PATCH (or any non-GET) with `?at=` → 400 `AT_WRITE_NOT_ALLOWED`.
 * - Structurally missing `?at=` value → 400 `AT_MALFORMED`.
 * - Allow-list denial (invalid snapshot / version identifier, control
 *   chars, null bytes, Unicode) → 400 `INVALID_AT_PARAM` with no raw
 *   echo (see {@link parseAt}).
 * - Resolution failures → 404 with the resolver's structured error.
 *
 * Business logic (parse/resolve) lives in claws-sdk; this file is the
 * HTTP adapter (SDK-owns-logic rule).
 *
 * @module claws-serve/middleware/time-travel
 */

import type { Request, RequestHandler, Response } from 'express';
import {
  parseAt,
  resolveAt,
  type ResolvedAt,
  type ResolveError,
  type ResolverContext,
} from '../../../claws-sdk/src/workspace/index.js';

/** Header name for the resolved historical version. */
export const GOVERNANCE_VERSION_HEADER = 'X-Governance-Version';

/** Shape added to `req` when the middleware resolved a historical state. */
export interface TimeTravelRequestState {
  timeTravel?: ResolvedAt;
}

/** Options for {@link timeTravelMiddleware}. */
export interface TimeTravelMiddlewareOptions {
  readonly resolver: ResolverContext;
  /**
   * When true (default), the middleware sends the resolved IR as a JSON
   * body and ends the response. When false, the middleware only stamps
   * `req.timeTravel` and sets the response header, delegating the body
   * to downstream handlers — useful for routes that want to re-render
   * the IR into a smaller shape (e.g. a single OC file section).
   */
  readonly respondDirectly?: boolean;
}

/** Read the resolved historical state stamped by the middleware. */
export function getTimeTravelState(req: Request): ResolvedAt | undefined {
  return (req as Request & TimeTravelRequestState).timeTravel;
}

/**
 * Build the time-travel middleware. The returned handler should be
 * mounted ahead of any read/write route that honours `?at=`.
 */
export function timeTravelMiddleware(
  options: TimeTravelMiddlewareOptions,
): RequestHandler {
  const respondDirectly = options.respondDirectly ?? true;

  return (req, res, next): void => {
    const raw = req.query['at'];
    if (raw === undefined) {
      next();
      return;
    }
    if (Array.isArray(raw)) {
      // Express parses repeated ?at=a&at=b as an array. Reject with the
      // same AT_MALFORMED error shape parse would use, so clients don't
      // have to branch on the container type.
      respondMalformed(res, 'only one ?at= value is allowed', String(raw[0] ?? ''));
      return;
    }
    if (typeof raw !== 'string') {
      respondMalformed(res, '?at= must be a string', String(raw));
      return;
    }

    if (req.method !== 'GET') {
      res.status(400).json({
        error: {
          code: 'AT_WRITE_NOT_ALLOWED',
          message: `?at= is only supported on GET requests; received ${req.method}`,
        },
      });
      return;
    }

    const parseResult = parseAt(raw);
    if (!parseResult.ok) {
      res.status(400).json({ error: parseResult.error });
      return;
    }

    // Resolve asynchronously; the snapshot branch reads from disk so the
    // handler must await. Errors fall back to a 500 — unexpected here
    // because the resolver itself catches filesystem failures and
    // surfaces them as structured SNAPSHOT_NOT_FOUND.
    resolveAt(parseResult.parsed, options.resolver).then(
      (result) => {
        if (!result.ok) {
          respondResolveError(res, result.error);
          return;
        }
        const resolved = result.resolved;
        (req as Request & TimeTravelRequestState).timeTravel = resolved;
        res.set(GOVERNANCE_VERSION_HEADER, formatVersionHeader(resolved));
        if (!respondDirectly) {
          next();
          return;
        }
        res.status(200).json({
          at: {
            mode: resolved.mode,
            raw: resolved.raw,
            version: resolved.version,
            compiledAt: resolved.compiledAt,
          },
          governanceIR: resolved.governanceIR,
        });
      },
      (err: unknown) => {
        next(err);
      },
    );
  };
}

/** Render the `X-Governance-Version` header value for a resolution. */
function formatVersionHeader(resolved: ResolvedAt): string {
  if (resolved.mode === 'snapshot') {
    return `snap:${resolved.raw.startsWith('snap:') ? resolved.raw.slice('snap:'.length) : resolved.raw}`;
  }
  return resolved.version === null ? 'unknown' : String(resolved.version);
}

/** Write a 400 with the standard AT_MALFORMED shape. */
function respondMalformed(res: Response, message: string, raw: string): void {
  res.status(400).json({
    error: { code: 'AT_MALFORMED', message, raw },
  });
}

/** Map a {@link ResolveError} onto the appropriate HTTP status + body. */
function respondResolveError(res: Response, error: ResolveError): void {
  if (error.code === 'VERSION_EVICTED') {
    res.status(404).json({
      error: {
        code: 'AT_VERSION_EVICTED',
        reason: 'version_evicted',
        version: error.version,
        message: error.message,
      },
    });
    return;
  }
  if (error.code === 'VERSION_OUT_OF_RANGE') {
    res.status(404).json({
      error: {
        code: 'AT_VERSION_OUT_OF_RANGE',
        version: error.version,
        available: error.available,
        message: error.message,
      },
    });
    return;
  }
  if (error.code === 'TIME_OUT_OF_RANGE') {
    res.status(404).json({
      error: {
        code: 'AT_TIME_OUT_OF_RANGE',
        timestamp: error.timestamp,
        available: error.available,
        message: error.message,
      },
    });
    return;
  }
  if (error.code === 'AUTO_SNAPSHOT_NOT_CONFIGURED') {
    res.status(404).json({
      error: {
        code: 'AT_AUTO_SNAPSHOT_NOT_CONFIGURED',
        message: error.message,
      },
    });
    return;
  }
  if (error.code === 'AUTO_SNAPSHOT_OUT_OF_RANGE') {
    res.status(404).json({
      error: {
        code: 'AT_AUTO_SNAPSHOT_OUT_OF_RANGE',
        timestamp: error.timestamp,
        message: error.message,
      },
    });
    return;
  }
  if (error.code === 'AUTO_SNAPSHOT_IR_MISSING') {
    res.status(404).json({
      error: {
        code: 'AT_AUTO_SNAPSHOT_IR_MISSING',
        version: error.version,
        timestamp: error.timestamp,
        message: error.message,
      },
    });
    return;
  }
  // SNAPSHOT_NOT_FOUND or SNAPSHOT_IR_MISSING — identical surface for the client.
  res.status(404).json({
    error: {
      code: 'AT_SNAPSHOT_NOT_FOUND',
      name: error.name,
      message: error.message,
    },
  });
}
