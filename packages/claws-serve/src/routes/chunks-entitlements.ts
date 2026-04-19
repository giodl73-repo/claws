/**
 * GET /api/chunks/entitlements — Layer 2 entitlements chunk.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): parses the workspace, reads the
 * cached GovernanceIR, calls `assembleChunks`, and serializes the
 * `entitlements` slice. Entitlements are read-only in the CAP UI —
 * `assembleChunks` emits the chunk without a `writeBack` field, and this
 * route surfaces that as-is (no PATCH endpoint is registered).
 *
 * IR-resolution contract: defers to the shared {@link resolveIR} helper.
 * Partners that receive 409 `COMPILATION_REQUIRED` drive `POST /compile`;
 * 503 `COMPILATION_ERRORED` indicates the last-good IR is unavailable.
 *
 * @module claws-serve/routes/chunks-entitlements
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  assembleChunks,
  parseWorkspace,
} from '../../../claws-sdk/src/workspace/index.js';
import type { CompilationHost } from '../compilation-host.js';
import {
  applyTimeTravelCache,
  resolveReadIR,
  respondCompilationRequired,
  respondIrErrored,
} from './ir-resolution.js';

export interface ChunksEntitlementsRouterOptions {
  readonly workspaceRoot: string;
}

/**
 * Attach `GET /entitlements` to the `chunks` prefix router. Read-only —
 * no PATCH is mounted because CAP entitlements flow through governance,
 * not direct edits.
 */
export function chunksEntitlementsRouter(
  host: CompilationHost,
  options: ChunksEntitlementsRouterOptions,
): Router {
  const router = Router();
  router.get('/entitlements', (req: Request, res: Response, next: NextFunction) => {
    handleEntitlements(host, options, req, res).catch(next);
  });
  return router;
}

async function handleEntitlements(
  host: CompilationHost,
  options: ChunksEntitlementsRouterOptions,
  req: Request,
  res: Response,
): Promise<void> {
  const resolution = resolveReadIR(req, host);
  if (resolution.status === 'missing') {
    respondCompilationRequired(res);
    return;
  }
  if (resolution.status === 'errored') {
    respondIrErrored(res, resolution.haltReason);
    return;
  }
  const workspace = await parseWorkspace(options.workspaceRoot);
  const result = await assembleChunks(workspace, resolution.ir);
  if (resolution.historical) applyTimeTravelCache(res);
  res.status(200).json(result.entitlements);
}
