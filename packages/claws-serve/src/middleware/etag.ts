/**
 * ETag middleware — optimistic concurrency guard wired to the SDK's
 * {@link VersionManager}.
 *
 * GET responses carry `ETag: "<version>"` so clients can round-trip the
 * value on their next write. PATCH requests must carry `If-Match` with the
 * version they expect; an absent header surfaces 428 Precondition Required
 * and a stale value surfaces 409 VERSION_CONFLICT. Successful PATCHes
 * increment the counter and replace the response ETag with the new value.
 *
 * Business logic lives in {@link VersionManager}; this file is the HTTP
 * adapter (SDK-owns-logic rule).
 *
 * @module claws-serve/middleware/etag
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  formatETag,
  parseETag,
  type VersionManager,
  type VersionConflictError,
} from '../../../claws-sdk/src/workspace-edit/index.js';

/**
 * Injects `ETag: "<version>"` on GET responses. Non-GET requests pass
 * through unchanged; the companion {@link requireIfMatch} middleware
 * handles PATCH precondition checks.
 */
export function etagResponse(manager: VersionManager): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET') {
      res.set('ETag', formatETag(manager.getVersion()));
    }
    next();
  };
}

/**
 * Mutating HTTP verbs whose bodies this server treats as state-changing
 * writes. Every one of them crosses the optimistic-concurrency boundary
 * and therefore requires an If-Match precondition.
 *
 * CP-6 R2 F2 (security NEW-1): R1 wired `app.post('/api/batch',
 * requireIfMatch(versionManager))` but the middleware short-circuited
 * every non-PATCH method, so the POST mount was a no-op and
 * `POST /api/batch` ran without any ETag guard. Broadening the method
 * check here closes that gap without needing a bespoke per-route
 * wrapper.
 */
const MUTATING_METHODS: ReadonlySet<string> = new Set(['PATCH', 'POST', 'DELETE']);

/**
 * Enforce `If-Match` on mutating requests (PATCH/POST/DELETE). Absent
 * headers => 428. Malformed or stale values => 409 with a
 * {@link VersionConflictError} body. Read verbs (GET/HEAD/OPTIONS) pass
 * through unchanged so the guard can be mounted on an app-wide or
 * prefix-wide path without breaking reads.
 *
 * On success, stashes the verified ETag on the request so downstream
 * handlers can call {@link commitVersion} after a successful write to
 * advance the counter and emit the new ETag.
 */
export function requireIfMatch(manager: VersionManager): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const headerValue = req.get('if-match');
    if (headerValue === undefined || headerValue.trim().length === 0) {
      res.status(428).json({
        error: {
          code: 'PRECONDITION_REQUIRED',
          message: `${req.method} requests require an If-Match header with the current ETag`,
        },
      });
      return;
    }

    const expected = parseETag(headerValue);
    if (expected === null) {
      const conflict: VersionConflictError = {
        code: 'VERSION_CONFLICT',
        message: `malformed If-Match header: "${headerValue}"`,
        current: manager.getVersion(),
        expected: -1,
      };
      res.status(409).json({ error: conflict });
      return;
    }

    const result = manager.checkVersion(expected);
    if (!result.match) {
      res.status(409).json({ error: result.error });
      return;
    }

    next();
  };
}

/**
 * Advance the counter and set the response `ETag` header to the new
 * version. Route handlers call this after a successful write so the
 * response carries the post-edit value for the client to round-trip on
 * its next PATCH.
 */
export async function commitVersion(
  manager: VersionManager,
  res: Response,
): Promise<number> {
  const next = await manager.incrementVersion();
  res.set('ETag', formatETag(next));
  return next;
}
