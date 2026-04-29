/**
 * @bic/openclaw-snap/error — `toSnapError` helper per snap.md §Fail-closed.
 *
 * Every 4xx (and the 503 AUTH_CONTEXT_UNAVAILABLE) response routes through
 * this helper. It enforces the closed-code enum, truncates the message,
 * strips absolute paths, and redacts bearer/secret patterns so raw parser
 * errors and attacker-controlled header bytes never reach callers.
 *
 * @module @bic/openclaw-snap/error
 */

import type { SnapshotError, SnapshotErrorCode } from './types.js';

const MAX_MESSAGE = 200;
const ABSOLUTE_PATH = /(?:^|\s)(?:\/[^\s]+|[A-Z]:\\[^\s]+)/g;
const BEARER = /bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SECRET_KV = /(secret|token|password|authorization|api[-_]?key)\s*[:=]\s*\S+/gi;
// GitHub personal/OAuth/user/server/refresh tokens — all share a
// `gh[pousr]_` prefix followed by ≥36 alphanumerics.
const GITHUB_TOKEN = /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g;
// Bare JWT payloads — three dot-separated base64url segments where the
// first two segments start with `eyJ` (base64 of `{"`). Caught even
// when the surrounding text did not include the word `bearer`.
const JWT = /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

/**
 * Sanitize a free-form message: strip absolute paths, redact secrets, cap
 * length. Runs on every error path (parser SyntaxError, validator, header
 * parsing) so `details` never leaks filesystem layout, bearer tokens,
 * GitHub tokens, or bare JWT payloads.
 */
export function sanitizeMessage(raw: string): string {
  const scrubbed = raw
    .replace(GITHUB_TOKEN, '[REDACTED:GITHUB_TOKEN]')
    .replace(JWT, '[REDACTED:JWT]')
    .replace(BEARER, '[redacted]')
    .replace(SECRET_KV, '[redacted]')
    .replace(ABSOLUTE_PATH, ' [path]');
  if (scrubbed.length <= MAX_MESSAGE) return scrubbed;
  return `${scrubbed.slice(0, MAX_MESSAGE - 1)}…`;
}

export interface ErrContext {
  readonly snapshotId?: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Build a `SnapError` envelope. `code` is gated to the closed enum at the
 * type level; `message` is sanitized; `snapshotId` is only emitted when in
 * scope. Accepts `unknown` errors so catch blocks can funnel anything
 * through one path.
 */
export function toSnapError(
  code: SnapshotErrorCode,
  err: unknown,
  ctx: ErrContext = {},
): SnapshotError & { details?: Record<string, unknown>; snapshotId?: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const envelope: {
    code: SnapshotErrorCode;
    message: string;
    details?: Record<string, unknown>;
    snapshotId?: string;
  } = {
    code,
    message: sanitizeMessage(rawMessage),
  };
  if (ctx.details !== undefined) envelope.details = ctx.details;
  if (ctx.snapshotId !== undefined) envelope.snapshotId = ctx.snapshotId;
  return envelope;
}
