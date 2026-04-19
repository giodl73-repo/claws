/**
 * Shared IR-resolution contract for Layer 2/3 chunk + summary routes.
 *
 * Every route that reads from a cached GovernanceIR uses the same
 * discriminated-union resolver so partners see a consistent response
 * shape across endpoints:
 *
 * - `missing` → route returns 409 `COMPILATION_REQUIRED` (canonical error).
 * - `errored` → route returns 503 with the compile halt reason; partners
 *   can fall back to degraded UI without a retry storm.
 * - `stale`   → route returns 200 with the last-good IR; the caller is
 *   expected to surface `compilationStatus: 'stale'` alongside payloads
 *   (the status endpoints do this already).
 * - `ok`      → route returns 200 with a fresh IR.
 *
 * Routes consume `resolveIR(host)` and pattern-match on `status`. The
 * shared {@link respondCompilationRequired} / {@link respondIrErrored}
 * helpers render the canonical 409 / 503 bodies so every route uses
 * identical error codes.
 *
 * Time-travel (`?at=`) is layered on top via {@link resolveReadIR}: when
 * the time-travel middleware has stamped `req.timeTravel`, the read
 * resolver short-circuits with the historical IR and emits an immutable
 * cache header (snapshots are content-addressed by version/name and
 * never change). Without a stamp, read routes behave exactly as they
 * did before — {@link resolveReadIR} degenerates to {@link resolveIR}.
 *
 * @module claws-serve/routes/ir-resolution
 */
import type { Request, Response } from 'express';
import type { GovernanceIR } from '../../../claws-sdk/src/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { getTimeTravelState } from '../middleware/time-travel.js';

/**
 * Canonical error code emitted by every chunk/governance route when no
 * GovernanceIR has been compiled. Partners write one 409 handler that
 * drives `POST /compile`. Do not introduce per-route variants.
 */
export const COMPILATION_REQUIRED_CODE = 'COMPILATION_REQUIRED' as const;

/**
 * Canonical error code emitted when compilation ran but halted (the
 * last-good IR is unavailable or rejected). Distinct from 409 because
 * a retry of `POST /compile` alone will not fix it — operator action
 * is required.
 */
export const COMPILATION_ERRORED_CODE = 'COMPILATION_ERRORED' as const;

/** Discriminated union returned by {@link resolveIR}. */
export type IrResolution =
  | { readonly status: 'missing' }
  | { readonly status: 'errored'; readonly ir: GovernanceIR; readonly haltReason: string }
  | { readonly status: 'stale'; readonly ir: GovernanceIR }
  | { readonly status: 'ok'; readonly ir: GovernanceIR };

/**
 * Inspect the CompilationHost and classify its cached IR (if any) into
 * the uniform `missing | errored | stale | ok` contract.
 *
 * Pure synchronous lookup — never triggers a compile. Routes that need
 * a just-in-time compile (e.g. the connections route's deferred bridge)
 * should call `host.compile()` themselves first, then pass through this
 * resolver.
 */
export function resolveIR(host: CompilationHost): IrResolution {
  const ir = host.getCachedIR();
  if (ir === undefined) {
    return { status: 'missing' };
  }
  if (ir.conflicts.haltReason !== null) {
    return { status: 'errored', ir, haltReason: ir.conflicts.haltReason };
  }
  if (ir.analysis.violations.length > 0) {
    return { status: 'stale', ir };
  }
  return { status: 'ok', ir };
}

/**
 * Render the canonical 409 `COMPILATION_REQUIRED` body. Kept in one
 * place so every route emits the same code + message shape — partners
 * write a single 409 handler that drives `POST /compile`.
 */
export function respondCompilationRequired(res: Response): void {
  res.status(409).json({
    error: {
      code: COMPILATION_REQUIRED_CODE,
      message: 'No compiled GovernanceIR — run `claws compile` or POST /compile before reading chunks.',
    },
  });
}

/**
 * Render the canonical 503 `COMPILATION_ERRORED` body with the halt
 * reason surfaced in `details.haltReason`. Partners can drop into a
 * degraded UI without polling `POST /compile` in a loop.
 */
export function respondIrErrored(res: Response, haltReason: string): void {
  res.status(503).json({
    error: {
      code: COMPILATION_ERRORED_CODE,
      message: 'Compilation halted — last-good IR is unavailable.',
      details: { haltReason },
    },
  });
}

/**
 * Cache-Control value for historical (time-travel) responses. A
 * resolved `?at=vN` / `?at=snap:X` / `?at=<date>` payload is
 * content-addressed — the same request parameters always resolve to
 * the same IR bytes (versions are immutable, snapshots are written
 * once, time queries pin to a version). Clients can cache aggressively:
 * one year max-age with the immutable directive tells shared caches and
 * browsers never to revalidate.
 *
 * Used by {@link applyTimeTravelCache} which every GET route consuming
 * `req.timeTravel` must call before writing the response body.
 */
export const TIME_TRAVEL_CACHE_CONTROL = 'immutable, max-age=31536000';

/**
 * Read-side resolver that honours `?at=` time-travel stamps. When the
 * time-travel middleware has stamped `req.timeTravel`, the function
 * returns the historical IR tagged `historical: true` so the route can
 * skip `resolveIR(host)` (which would return the live cached IR and
 * defeat the whole point of the `?at=` read).
 *
 * The historical branch always reports `status: 'ok'` because the
 * middleware already performed the resolution and rendered the
 * appropriate 404 / 400 error body for failures; by the time we reach
 * a handler, a stamped `req.timeTravel` is a fully-formed IR.
 *
 * Routes that opt into time-travel reads:
 *   const resolution = resolveReadIR(req, host);
 *   if (resolution.status === 'missing') return respondCompilationRequired(res);
 *   if (resolution.status === 'errored') return respondIrErrored(res, ...);
 *   if (resolution.historical) applyTimeTravelCache(res);
 *   // use resolution.ir as the IR for assembleChunks / diff / etc.
 *
 * Without a `?at=` stamp the function degenerates to `resolveIR(host)`
 * with `historical: false`, so existing callers need only swap the
 * call and add the cache-header line.
 */
export type ReadIrResolution =
  | { readonly status: 'missing'; readonly historical: false }
  | {
      readonly status: 'errored';
      readonly ir: GovernanceIR;
      readonly haltReason: string;
      readonly historical: false;
    }
  | { readonly status: 'stale'; readonly ir: GovernanceIR; readonly historical: false }
  | { readonly status: 'ok'; readonly ir: GovernanceIR; readonly historical: boolean };

export function resolveReadIR(req: Request, host: CompilationHost): ReadIrResolution {
  const timeTravel = getTimeTravelState(req);
  if (timeTravel !== undefined) {
    return { status: 'ok', ir: timeTravel.governanceIR, historical: true };
  }
  const live = resolveIR(host);
  if (live.status === 'missing') return { status: 'missing', historical: false };
  if (live.status === 'errored') {
    return {
      status: 'errored',
      ir: live.ir,
      haltReason: live.haltReason,
      historical: false,
    };
  }
  if (live.status === 'stale') {
    return { status: 'stale', ir: live.ir, historical: false };
  }
  return { status: 'ok', ir: live.ir, historical: false };
}

/**
 * Stamp the immutable cache header on a historical response. Call
 * before `res.status(200).json(...)` so the header lands on the outer
 * envelope. No-op for callers — present as a helper so the header
 * value lives in one place.
 */
export function applyTimeTravelCache(res: Response): void {
  res.set('Cache-Control', TIME_TRAVEL_CACHE_CONTROL);
}
