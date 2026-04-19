/**
 * Dry-run middleware for PATCH /api/chunks/:tab.
 *
 * Detects `?dryRun=true` on the query string and stamps a boolean flag
 * on the request so the downstream handler can short-circuit after
 * validation, skipping the write + recompile phases. The same
 * ValidationPipeline (R5, fleet, governance) runs in both modes — there
 * is no separate preview logic that could drift from the real PATCH.
 *
 * Dry-run response shape:
 * ```
 * {
 *   dryRun: true,
 *   valid: boolean,
 *   governance: {
 *     warnings: ValidationWarning[],
 *     errors:   PatchError[],
 *     estimatedRecompileMs: number,
 *   }
 * }
 * ```
 * On validation failure, the handler returns the same HTTP status + error
 * envelope as a real PATCH, with `dryRun: true` merged onto the body so
 * clients can distinguish previews from committed rejections.
 *
 * @module claws-serve/middleware/dry-run
 */

import type { Request, RequestHandler } from 'express';

/** Request augmentation — tests and the handler read this flag. */
export interface DryRunRequest {
  isDryRun?: boolean;
}

/**
 * Detects `?dryRun=true` and stamps `req.isDryRun`. Any other value
 * (missing, `?dryRun=false`, `?dryRun=1`) leaves the flag `false` so
 * only the exact string `true` opts into the preview path. Case-insensitive.
 */
export function dryRunMiddleware(): RequestHandler {
  return (req, _res, next) => {
    const raw = req.query['dryRun'];
    const value = typeof raw === 'string' ? raw.toLowerCase() : '';
    (req as Request & DryRunRequest).isDryRun = value === 'true';
    next();
  };
}

/** Read the dry-run flag from a request. Returns false when unset. */
export function isDryRunRequest(req: Request): boolean {
  return (req as Request & DryRunRequest).isDryRun === true;
}
