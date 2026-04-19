/**
 * Actor capture middleware — reads the `X-Actor-Id` header and stamps
 * `req.actor` so downstream audit sinks can attribute writes.
 *
 * The header is the CAP UI convention for identifying the human behind a
 * PATCH. Production deployments SHOULD layer stronger authentication in
 * front (mTLS, session middleware, etc.) and either set the header
 * upstream or swap this middleware for a stronger extractor. When the
 * header is absent or empty the middleware leaves `req.actor` as
 * `undefined` — downstream code defaults to `ANONYMOUS_ACTOR` via
 * {@link readActor}.
 *
 * Sanitization contract (CP-6 R2 M-6):
 *   - `X-Actor-Id` longer than {@link ACTOR_MAX_LENGTH} characters → 400
 *     `BAD_ACTOR`. Unbounded headers would blow the sink's PIPE_BUF
 *     atomicity budget (512 bytes on Windows) and balloon JSONL lines.
 *   - Any ASCII control character (U+0000–U+001F, U+007F) → 400
 *     `BAD_ACTOR`. A raw `\r\n` in the header lets a partner forge log
 *     lines in the append-only JSONL audit sink.
 *   - Absent or empty header → leave `req.actor` undefined (legitimate;
 *     downstream treats as anonymous).
 *
 * @module claws-serve/middleware/actor
 */

import type { Request, RequestHandler, Response } from 'express';

/** Default actor when the header is absent or empty. */
export const ANONYMOUS_ACTOR = 'anonymous';

/** Name of the header the middleware reads. */
export const ACTOR_HEADER = 'x-actor-id';

/**
 * Maximum length (in characters) accepted in an `X-Actor-Id` header.
 * Picked to sit well under the per-line PIPE_BUF atomicity budget on
 * Windows (512 bytes) so audit writes can never be torn by a single
 * adversarial header value.
 */
export const ACTOR_MAX_LENGTH = 256;

/**
 * Error code surfaced on a 400 response when the header fails
 * sanitization. Matches the CAP error-envelope convention
 * (`{ error: { code, message } }`).
 */
export const BAD_ACTOR_CODE = 'BAD_ACTOR';

/**
 * Regex matching ASCII control characters — C0 range (U+0000–U+001F)
 * plus DEL (U+007F). Matching includes CR, LF, TAB and null, all of
 * which can break JSONL audit-line framing or inject forged records.
 */
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/;

/** Shape added to `req` when the middleware runs. */
export interface ActorRequestState {
  actor?: string;
}

/**
 * Validate a candidate actor string against the sanitization contract.
 * Returns `undefined` if the value is acceptable, or a human-readable
 * reason when it must be rejected.
 */
function validateActorValue(value: string): string | undefined {
  if (value.length > ACTOR_MAX_LENGTH) {
    return `X-Actor-Id exceeds ${String(ACTOR_MAX_LENGTH)} character limit`;
  }
  if (CONTROL_CHAR_RE.test(value)) {
    return 'X-Actor-Id contains control characters';
  }
  return undefined;
}

/**
 * Extract a raw candidate value from the header. Returns `undefined`
 * when the header is absent or empty (valid — treated as anonymous).
 * Returns the first non-empty string when the header arrived as an
 * array (Node coerces duplicated headers to arrays).
 */
function rawHeaderValue(req: Request): string | undefined {
  const header = req.headers[ACTOR_HEADER];
  if (typeof header === 'string') {
    return header.length > 0 ? header : undefined;
  }
  if (Array.isArray(header)) {
    for (const entry of header) {
      if (typeof entry === 'string' && entry.length > 0) return entry;
    }
  }
  return undefined;
}

/**
 * Read the actor identity from a request. Used by audit-emitting handlers
 * that were not downstream of {@link actorMiddleware}. Defaults to
 * {@link ANONYMOUS_ACTOR} when the header is missing or empty. Values
 * that violate the sanitization contract are rejected — callers that
 * need a strict pre-stamped actor should read `req.actor` (populated by
 * the middleware after validation) rather than calling this helper.
 */
export function readActor(req: Request): string {
  const stamped = (req as Request & ActorRequestState).actor;
  if (typeof stamped === 'string' && stamped.length > 0) return stamped;
  const raw = rawHeaderValue(req);
  if (raw !== undefined && validateActorValue(raw) === undefined) {
    return raw;
  }
  return ANONYMOUS_ACTOR;
}

/**
 * Build the actor-capture middleware. Mount on any write route that
 * needs an actor stamped on `req` for downstream audit construction.
 *
 * When the header is present but violates the sanitization contract
 * (length or control chars) the middleware responds 400 with a
 * `{ error: { code: 'BAD_ACTOR', ... } }` body and does NOT invoke
 * `next()` — the downstream handler never runs, so no audit sink ever
 * sees the tainted value.
 */
export function actorMiddleware(): RequestHandler {
  return (req, res, next): void => {
    const raw = rawHeaderValue(req);
    if (raw === undefined) {
      // Absent header is legitimate — leave req.actor undefined so
      // downstream readActor() defaults to ANONYMOUS_ACTOR.
      next();
      return;
    }
    const reason = validateActorValue(raw);
    if (reason !== undefined) {
      respondBadActor(res, reason);
      return;
    }
    (req as Request & ActorRequestState).actor = raw;
    next();
  };
}

function respondBadActor(res: Response, reason: string): void {
  res.status(400).json({
    error: {
      code: BAD_ACTOR_CODE,
      message: reason,
    },
  });
}
