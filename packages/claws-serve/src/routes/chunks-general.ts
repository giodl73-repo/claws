/**
 * GET /api/chunks/general/identity — Layer 2 General tab chunk.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handler parses the workspace,
 * assembles the chunk set via `assembleChunks`, and returns the `general`
 * entry as-is. All per-field editability, governance projection, and
 * write-back URL derivation lives in `claws-sdk/workspace/chunk-assembler`.
 *
 * When IDENTITY.md is absent the workspace parser still succeeds (IDENTITY
 * is optional) but the General chunk has no authoritative identity source
 * to project. The handler detects this and returns a structured 404 so
 * partners can skip the General tab rendering rather than consuming
 * placeholder data.
 *
 * IR-resolution contract: defers to the shared {@link resolveIR} helper.
 * Partners that receive 409 `COMPILATION_REQUIRED` drive `POST /compile`;
 * 503 `COMPILATION_ERRORED` indicates the last-good IR is unavailable.
 *
 * @module claws-serve/routes/chunks-general
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  assembleChunks,
  parseWorkspace,
  type FleetPolicy,
} from '../../../claws-sdk/src/workspace/index.js';
import type { CompilationHost } from '../compilation-host.js';
import {
  applyTimeTravelCache,
  resolveReadIR,
  respondCompilationRequired,
  respondIrErrored,
} from './ir-resolution.js';

export interface ChunksGeneralRouterOptions {
  /** Absolute workspace root to parse per request. */
  readonly workspaceRoot: string;
  /** Optional fleet policy to pass through to the assembler. */
  readonly fleetPolicy?: FleetPolicy;
}

/**
 * Attach `GET /general/identity` to the `chunks` prefix router returned by
 * `registerRoutes`. The caller owns mounting — this router stays a plain
 * Express Router for test-level composition.
 */
export function chunksGeneralRouter(
  host: CompilationHost,
  options: ChunksGeneralRouterOptions,
): Router {
  const router = Router();

  router.get('/general/identity', (req: Request, res: Response, next: NextFunction) => {
    handleGeneralIdentity(host, options, req, res, next).catch(next);
  });

  return router;
}

async function handleGeneralIdentity(
  host: CompilationHost,
  options: ChunksGeneralRouterOptions,
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const workspace = await parseWorkspace(options.workspaceRoot);
  if (workspace.identity === null) {
    res.status(404).json({
      error: {
        code: 'IDENTITY_MISSING',
        message: 'IDENTITY.md is absent — General tab cannot be rendered.',
      },
    });
    return;
  }
  const resolution = resolveReadIR(req, host);
  if (resolution.status === 'missing') {
    respondCompilationRequired(res);
    return;
  }
  if (resolution.status === 'errored') {
    respondIrErrored(res, resolution.haltReason);
    return;
  }
  const result = await assembleChunks(workspace, resolution.ir, {
    ...(options.fleetPolicy !== undefined ? { fleetPolicy: options.fleetPolicy } : {}),
  });
  if (resolution.historical) applyTimeTravelCache(res);
  res.status(200).json(result.general);
}
