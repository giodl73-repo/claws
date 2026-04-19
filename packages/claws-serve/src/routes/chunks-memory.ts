/**
 * GET /api/chunks/memory — Layer 2 memory & knowledge chunk.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): parses the workspace, asks the
 * CompilationHost for its cached GovernanceIR, then calls `assembleChunks`
 * and serializes the `memory` slice. Every policy decision — knowledge
 * source classification, data label inference, governance lock derivation
 * for RESTRICTED/CONFIDENTIAL sources — lives in
 * `claws-sdk/workspace/chunk-assembler`. See Pulse 23 for the full
 * assembly pipeline; this route is a 1-chunk projector.
 *
 * Governance lock contract (CL-10 §Knowledge Sources):
 *  - CONFIDENTIAL and RESTRICTED sources get `lock.source: 'governance'`
 *    so CAP partners must disable/re-enable them via the governance flow
 *    rather than direct toggle. The assembler writes the lock; this route
 *    only surfaces it.
 *
 * IR-resolution contract: defers to the shared {@link resolveIR} helper.
 * Partners that receive 409 `COMPILATION_REQUIRED` drive `POST /compile`;
 * 503 `COMPILATION_ERRORED` indicates the last-good IR is unavailable.
 *
 * @module claws-serve/routes/chunks-memory
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

export interface ChunksMemoryRouterOptions {
  /** Absolute workspace root to read OC files from. */
  readonly workspaceRoot: string;
}

/**
 * Attach `GET /memory` to the `chunks` prefix router returned by
 * `registerRoutes`. The caller owns mounting — this stays a plain Router
 * for test-level composition.
 */
export function chunksMemoryRouter(
  host: CompilationHost,
  options: ChunksMemoryRouterOptions,
): Router {
  const router = Router();
  router.get('/memory', (req: Request, res: Response, next: NextFunction) => {
    handleMemory(host, options, req, res).catch(next);
  });
  return router;
}

async function handleMemory(
  host: CompilationHost,
  options: ChunksMemoryRouterOptions,
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
  res.status(200).json(result.memory);
}
