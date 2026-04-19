/**
 * POST /api/health/reset — operator escape hatch for degraded mode.
 *
 * When the startup health check flips the server to `degraded`, writes
 * are refused (S33). Recovery today requires a full restart; this route
 * lets an operator re-run the check and, on success, clear the flag
 * without bouncing the process.
 *
 * Access control: the route is admin-only. The caller MUST present an
 * `X-Admin-Token` header whose value equals the server's configured
 * admin token. When no admin token is configured (env var unset and no
 * option supplied), the route returns 404 — it does not exist from the
 * partner's view until the operator opts in.
 *
 * Rationale: a reset path that bypasses the fail-closed guard is the
 * kind of endpoint attackers probe first. Requiring a shared secret
 * means a leaked route path alone is insufficient; the operator controls
 * whether the endpoint is mounted at all via the env var.
 *
 * @module claws-serve/routes/admin-reset
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  degradedReasonCode,
  runStartupHealthCheck,
  type DegradedReason,
  type DegradedReasonCode,
  type HealthCheckOptions,
  type HealthCheckResult,
  type ServerMode,
} from '../lifecycle/health-check.js';

/** Name of the admin-token header. */
export const ADMIN_TOKEN_HEADER = 'x-admin-token';

/** Env var the server consults for the admin token. */
export const ADMIN_TOKEN_ENV = 'CLAWS_ADMIN_TOKEN';

/**
 * Mutable server-mode state the reset route flips on success.
 * Structurally compatible with {@link ServerState} in server.ts — the
 * route only touches `mode` and `degradedReason` so it never races with
 * state fields it doesn't own.
 */
export interface ServerModeState {
  mode?: ServerMode;
  degradedReason?: DegradedReason;
}

/**
 * Audit record emitted on every reset attempt after the admin-token
 * check (CP-6 R3 security NEW-2). `outcome` captures the verdict:
 *
 *   - `forbidden` — token supplied but did not match (403)
 *   - `reset_ok` — token matched, recheck healthy, mode flipped (200)
 *   - `still_degraded` — token matched, recheck still failed (503)
 *
 * The "no admin token configured" branch (404) emits no record — the
 * endpoint is invisible by design and an audit line would leak that
 * the route exists.
 */
export interface AdminResetAuditRecord {
  readonly timestamp: string;
  readonly actor: string;
  readonly outcome: 'forbidden' | 'reset_ok' | 'still_degraded';
  readonly priorMode?: ServerMode | undefined;
  readonly newMode?: ServerMode | undefined;
  readonly reasonCode?: DegradedReasonCode | undefined;
}

export type AdminResetAuditSink = (
  record: AdminResetAuditRecord,
) => void | Promise<void>;

/** Options for {@link adminResetRouter}. */
export interface AdminResetRouterOptions {
  /** Mutable server state; the route flips `mode` on successful recheck. */
  readonly state: ServerModeState;
  /**
   * Admin token. When undefined the router is effectively disabled —
   * every request returns 404 so the endpoint shape is invisible to
   * unauthenticated probes.
   */
  readonly adminToken: string | undefined;
  /**
   * Factory for the health-check options. Called each time the route
   * fires so the probe re-reads fresh policy files. Matches the
   * {@link runStartupHealthCheck} contract.
   */
  readonly healthCheckOptions: () => HealthCheckOptions;
  /** Health-check runner; defaults to {@link runStartupHealthCheck}. */
  readonly runHealthCheck?: (
    opts: HealthCheckOptions,
  ) => Promise<HealthCheckResult>;
  /**
   * Optional audit sink. Invoked once per authenticated reset attempt
   * (forbidden, reset_ok, still_degraded). Failures are logged but
   * never propagate back to the caller.
   */
  readonly auditSink?: AdminResetAuditSink | undefined;
}

/**
 * Body returned on successful reset. `mode` is always `'healthy'` on 200;
 * operators who hit 503 can parse `reasonCode` to diagnose why the
 * recheck still failed.
 *
 * CP-6 R2 K2: the public body carries only the stable
 * {@link DegradedReasonCode} enum — never `policyFile`, `cause`, or
 * `compilerMessage`. The full {@link DegradedReason} is logged
 * server-side; admin operators pair this endpoint's code with log
 * detail for triage. This matches the degradedModeError / /health
 * sanitization so all three surfaces expose the same shape.
 */
export interface AdminResetResponse {
  readonly mode: ServerMode;
  readonly reasonCode?: DegradedReasonCode;
}

/**
 * Stable 404 body for "route doesn't exist". Identical to an unknown-
 * route response so an attacker cannot distinguish "no admin token
 * configured" from "route never existed" by body shape.
 */
function respondHidden(res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Not Found',
    },
  });
}

function respondForbidden(res: Response): void {
  res.status(403).json({
    error: {
      code: 'FORBIDDEN',
      message: 'admin token required',
    },
  });
}

/** Build the admin-reset router. Mount as `app.use('/api', router)`. */
export function adminResetRouter(options: AdminResetRouterOptions): Router {
  const router = Router();

  router.post('/health/reset', (req: Request, res: Response, next: NextFunction) => {
    handleReset(options, req, res).catch(next);
  });

  return router;
}

async function handleReset(
  options: AdminResetRouterOptions,
  req: Request,
  res: Response,
): Promise<void> {
  // Without a configured admin token the route is invisible. 404 also
  // hides the route's existence from probe scanners. No audit record —
  // the endpoint's existence is not authenticated to the caller.
  if (options.adminToken === undefined || options.adminToken.length === 0) {
    respondHidden(res);
    return;
  }

  // Token check — constant-time compare avoids a timing oracle that leaks
  // prefix matches. Node's `timingSafeEqual` requires equal-length buffers,
  // so normalise lengths first.
  const presented = req.headers[ADMIN_TOKEN_HEADER];
  const presentedStr = typeof presented === 'string' ? presented : '';
  const actor = readAdminActor(req);
  if (!constantTimeEqual(presentedStr, options.adminToken)) {
    respondForbidden(res);
    emitAudit(options.auditSink, {
      timestamp: new Date().toISOString(),
      actor,
      outcome: 'forbidden',
      priorMode: options.state.mode,
    });
    return;
  }

  const priorMode = options.state.mode;
  const runner = options.runHealthCheck ?? runStartupHealthCheck;
  const hcOptions = options.healthCheckOptions();
  const result = await runner(hcOptions);

  if (result.mode === 'healthy') {
    options.state.mode = 'healthy';
    delete options.state.degradedReason;
    const body: AdminResetResponse = { mode: 'healthy' };
    res.status(200).json(body);
    emitAudit(options.auditSink, {
      timestamp: new Date().toISOString(),
      actor,
      outcome: 'reset_ok',
      priorMode,
      newMode: 'healthy',
    });
    return;
  }

  // Recheck still degraded — keep the flag set and surface the stable
  // reason code so operators know which failure class persists without
  // leaking policyFile / cause / compilerMessage to anyone with the
  // admin token (the K2 sanitization contract treats the 503 body as
  // public even when the caller authenticated).
  options.state.mode = 'degraded';
  if (result.reason !== undefined) {
    options.state.degradedReason = result.reason;
    // Operators still need the rich detail — emit a structured log
    // line so server logs carry policyFile / cause / compilerMessage
    // even though the response body stays sanitized.
    console.error('[admin-reset] recheck still degraded:', result.reason);
  }
  const reasonCode = result.reason !== undefined
    ? degradedReasonCode(result.reason)
    : undefined;
  const body: AdminResetResponse = reasonCode === undefined
    ? { mode: 'degraded' }
    : { mode: 'degraded', reasonCode };
  res.status(503).json(body);
  emitAudit(options.auditSink, {
    timestamp: new Date().toISOString(),
    actor,
    outcome: 'still_degraded',
    priorMode,
    newMode: 'degraded',
    ...(reasonCode !== undefined ? { reasonCode } : {}),
  });
}

function readAdminActor(req: Request): string {
  const raw = req.headers['x-actor-id'];
  if (typeof raw === 'string' && raw.length > 0 && raw.length <= 256) {
    // actorMiddleware already sanitizes control chars on the `/api`
    // mount path; admin-reset sits under `/api` so any request reaching
    // here passed that gate. Fall back to 'anonymous' only on an
    // unexpected header shape.
    return raw;
  }
  return 'anonymous';
}

function emitAudit(
  sink: AdminResetAuditSink | undefined,
  record: AdminResetAuditRecord,
): void {
  if (sink === undefined) {
    return;
  }
  try {
    const maybe = sink(record);
    if (maybe instanceof Promise) {
      maybe.catch((err: unknown): void => {
        // eslint-disable-next-line no-console
        console.error('admin-reset audit sink failed:', err);
      });
    }
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('admin-reset audit sink threw:', err);
  }
}

/**
 * Constant-time string compare — runs in time proportional to the longer
 * of the two strings so an attacker cannot probe the shared secret byte
 * by byte.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }
  return diff === 0;
}
