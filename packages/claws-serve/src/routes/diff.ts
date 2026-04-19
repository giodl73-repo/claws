/**
 * GET /api/diff — structured governance diff between two history points.
 *
 * Thin HTTP adapter: parses `from` and `to` query params using the same
 * {@link parseAt} + {@link resolveAt} pair that drives the time-travel
 * middleware, then delegates to {@link diffGovernance} for the actual
 * comparison. Business logic — oc:// path construction, field-level
 * classification, provenance attribution — lives in claws-sdk
 * (SDK-owns-logic rule).
 *
 * The special token `current` resolves to the live cached IR on the
 * CompilationHost with no version mapping (the differ records
 * `toVersion: null` for snapshot-like sources). Any addressable mode
 * supported by `?at=` — `v38`, `2026-04-14`, `snap:pre-upgrade` — also
 * works for `from` and `to`.
 *
 * Error surface:
 * - Missing `from` or `to` → 400 `DIFF_PARAM_REQUIRED`.
 * - Structurally missing value → 400 `AT_MALFORMED`.
 * - Allow-list denial (invalid snapshot / version identifier) → 400
 *   `INVALID_AT_PARAM` (no raw echo; see {@link parseAt}).
 * - Resolution failure → 404 with structured `AT_*` code.
 * - `current` requested but no IR has been compiled → 409
 *   `COMPILATION_REQUIRED` (same shape chunk routes use).
 *
 * @module claws-serve/routes/diff
 */

import { Router, type Request, type Response } from 'express';
import {
  diffGovernance,
  parseAt,
  resolveAt,
  type DiffResult,
  type ResolveError,
  type ResolvedAt,
  type ResolverContext,
} from '../../../claws-sdk/src/workspace/index.js';
import type { GovernanceIR } from '../../../claws-sdk/src/index.js';
import type { CompilationHost } from '../compilation-host.js';
import { respondCompilationRequired } from './ir-resolution.js';

/** Sentinel token the API accepts for "the current (live) cached IR". */
export const CURRENT_TOKEN = 'current';

/** Options for {@link diffRouter}. */
export interface DiffRouterOptions {
  readonly resolver: ResolverContext;
}

/** Shape returned by GET /api/diff — the DiffResult wrapped with request context. */
export interface DiffResponse {
  readonly from: {
    readonly raw: string;
    readonly mode: 'version' | 'time' | 'snapshot' | 'current' | 'auto';
    readonly version: number | null;
    readonly compiledAt: string | null;
  };
  readonly to: {
    readonly raw: string;
    readonly mode: 'version' | 'time' | 'snapshot' | 'current' | 'auto';
    readonly version: number | null;
    readonly compiledAt: string | null;
  };
  readonly diff: DiffResult;
}

/** Build the diff router. */
export function diffRouter(
  host: CompilationHost,
  options: DiffRouterOptions,
): Router {
  const router = Router();

  router.get('/diff', (req: Request, res: Response): void => {
    const fromRaw = readSingleQuery(req, 'from');
    const toRaw = readSingleQuery(req, 'to');

    if (fromRaw === undefined) {
      respondParamRequired(res, 'from');
      return;
    }
    if (toRaw === undefined) {
      respondParamRequired(res, 'to');
      return;
    }

    void resolveSide(fromRaw, host, options.resolver)
      .then(async (fromResult) => {
        if (!fromResult.ok) {
          respondSideError(res, 'from', fromResult.error);
          return;
        }
        const toResult = await resolveSide(toRaw, host, options.resolver);
        if (!toResult.ok) {
          respondSideError(res, 'to', toResult.error);
          return;
        }
        const fromSide = fromResult.side;
        const toSide = toResult.side;
        const diff = diffGovernance(fromSide.ir, toSide.ir, {
          fromVersion: fromSide.version,
          toVersion: toSide.version,
          fromCompiledAt: fromSide.compiledAt,
          toCompiledAt: toSide.compiledAt,
        });
        const body: DiffResponse = {
          from: {
            raw: fromRaw,
            mode: fromSide.mode,
            version: fromSide.version,
            compiledAt: fromSide.compiledAt,
          },
          to: {
            raw: toRaw,
            mode: toSide.mode,
            version: toSide.version,
            compiledAt: toSide.compiledAt,
          },
          diff,
        };
        res.status(200).json(body);
      })
      .catch((err: unknown) => {
        // Do NOT echo Error.message or stack back to the caller — upstream
        // errors from fs/compiler routinely embed absolute workspace paths.
        // Log server-side and return a stable, content-free 500 so the
        // error envelope cannot be used as a filesystem oracle.
        // eslint-disable-next-line no-console
        console.error('GET /api/diff internal error:', err);
        res.status(500).json({
          error: {
            code: 'DIFF_INTERNAL_ERROR',
            message: 'Internal error while computing diff',
          },
        });
      });
  });

  return router;
}

/** Internal resolved-side shape. */
interface ResolvedSide {
  readonly ir: GovernanceIR;
  readonly mode: 'version' | 'time' | 'snapshot' | 'current' | 'auto';
  readonly version: number | null;
  readonly compiledAt: string | null;
}

type SideError =
  | {
      readonly kind: 'parse';
      readonly code: 'AT_MALFORMED' | 'INVALID_AT_PARAM';
      readonly message: string;
      readonly raw: string;
    }
  | { readonly kind: 'compilation_required' }
  | { readonly kind: 'resolve'; readonly error: ResolveError };

type SideResult =
  | { readonly ok: true; readonly side: ResolvedSide }
  | { readonly ok: false; readonly error: SideError };

async function resolveSide(
  raw: string,
  host: CompilationHost,
  resolver: ResolverContext,
): Promise<SideResult> {
  if (raw === CURRENT_TOKEN) {
    const ir = host.getCachedIR();
    if (ir === undefined) {
      return { ok: false, error: { kind: 'compilation_required' } };
    }
    const compiledAt = host.getCompiledAt() ?? null;
    return { ok: true, side: { ir, mode: 'current', version: null, compiledAt } };
  }

  const parsed = parseAt(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      error: {
        kind: 'parse',
        code: parsed.error.code,
        message: parsed.error.message,
        raw: parsed.error.raw,
      },
    };
  }
  const resolved = await resolveAt(parsed.parsed, resolver);
  if (!resolved.ok) {
    return { ok: false, error: { kind: 'resolve', error: resolved.error } };
  }
  return { ok: true, side: resolvedToSide(resolved.resolved) };
}

function resolvedToSide(resolved: ResolvedAt): ResolvedSide {
  return {
    ir: resolved.governanceIR,
    mode: resolved.mode,
    version: resolved.version,
    compiledAt: resolved.compiledAt,
  };
}

function readSingleQuery(req: Request, key: string): string | undefined {
  const v = req.query[key];
  if (v === undefined) return undefined;
  if (Array.isArray(v)) {
    // Repeated params are rejected upstream; collapse to the first so
    // the caller sees a normal string.
    return typeof v[0] === 'string' ? v[0] : undefined;
  }
  return typeof v === 'string' ? v : undefined;
}

function respondParamRequired(res: Response, name: string): void {
  res.status(400).json({
    error: {
      code: 'DIFF_PARAM_REQUIRED',
      param: name,
      message: `GET /api/diff requires ?${name}= (version, date, snap:<name>, or current)`,
    },
  });
}

function respondSideError(res: Response, side: 'from' | 'to', error: SideError): void {
  if (error.kind === 'parse') {
    res.status(400).json({
      error: {
        code: error.code,
        side,
        message: error.message,
        raw: error.raw,
      },
    });
    return;
  }
  if (error.kind === 'compilation_required') {
    respondCompilationRequired(res);
    return;
  }
  respondResolveErrorWithSide(res, side, error.error);
}

function respondResolveErrorWithSide(
  res: Response,
  side: 'from' | 'to',
  error: ResolveError,
): void {
  if (error.code === 'VERSION_EVICTED') {
    res.status(404).json({
      error: {
        code: 'AT_VERSION_EVICTED',
        reason: 'version_evicted',
        side,
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
        side,
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
        side,
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
        side,
        message: error.message,
      },
    });
    return;
  }
  if (error.code === 'AUTO_SNAPSHOT_OUT_OF_RANGE') {
    res.status(404).json({
      error: {
        code: 'AT_AUTO_SNAPSHOT_OUT_OF_RANGE',
        side,
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
        side,
        version: error.version,
        timestamp: error.timestamp,
        message: error.message,
      },
    });
    return;
  }
  res.status(404).json({
    error: {
      code: 'AT_SNAPSHOT_NOT_FOUND',
      side,
      name: error.name,
      message: error.message,
    },
  });
}
