/**
 * GET /api/chunks/groups — Layer 2 groups membership chunk.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): parses the workspace, reads the
 * cached GovernanceIR, calls `assembleChunks`, and serializes the `groups`
 * slice. The assembler reads group memberships from AGENTS/IDENTITY and
 * separates them into `m365`, `security`, and `onPremise` arrays —
 * this route just projects.
 *
 * IR-resolution contract: defers to the shared {@link resolveIR} helper.
 * Partners that receive 409 `COMPILATION_REQUIRED` drive `POST /compile`;
 * 503 `COMPILATION_ERRORED` indicates the last-good IR is unavailable.
 *
 * @module claws-serve/routes/chunks-groups
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

export interface ChunksGroupsRouterOptions {
  readonly workspaceRoot: string;
}

/**
 * Attach `GET /groups` to the `chunks` prefix router. Plain Router for
 * per-test composition.
 */
export function chunksGroupsRouter(
  host: CompilationHost,
  options: ChunksGroupsRouterOptions,
): Router {
  const router = Router();
  router.get('/groups', (req: Request, res: Response, next: NextFunction) => {
    handleGroups(host, options, req, res).catch(next);
  });
  return router;
}

async function handleGroups(
  host: CompilationHost,
  options: ChunksGroupsRouterOptions,
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
  res.status(200).json(result.groups);
}
