/**
 * POST /compile — trigger recompilation and return GovernanceIR.
 *
 * When a ClientManager is provided, emits compile:start and compile:complete
 * WebSocket events to all connected clients.
 *
 * @module claws-serve/routes/compile
 */

import { Router, type Request, type Response } from 'express';
import type { CompilationHost } from '../compilation-host.js';
import type { ServerState } from '../server.js';
import type { ClientManager } from '../ws/events.js';
import { createEvent } from '../ws/events.js';

export interface CompileResponse {
  readonly ir: unknown;
  readonly cached: boolean;
  readonly durationMs: number;
}

export function compileRouter(
  host: CompilationHost,
  state: ServerState,
  clientManager?: ClientManager | undefined,
): Router {
  const router = Router();

  router.post('/compile', async (_req: Request, res: Response) => {
    try {
      clientManager?.broadcast(createEvent('compile:start'));

      const result = await host.compile();
      state.compileCount++;

      const body: CompileResponse = {
        ir: result.ir,
        cached: result.cached,
        durationMs: result.durationMs,
      };

      clientManager?.broadcast(createEvent('compile:complete', {
        cached: result.cached,
        durationMs: result.durationMs,
      }));

      // Emit diagnostic:update if there are violations or warnings
      const ir = result.ir;
      if (ir.analysis.violations.length > 0 || ir.analysis.warnings.length > 0) {
        clientManager?.broadcast(createEvent('diagnostic:update', {
          violationCount: ir.analysis.violations.length,
          warningCount: ir.analysis.warnings.length,
        }));
      }

      // Emit tension:detected for each conflict
      if (ir.conflicts.totalConflicts > 0) {
        clientManager?.broadcast(createEvent('tension:detected', {
          totalConflicts: ir.conflicts.totalConflicts,
          oboConflicts: ir.conflicts.oboConflicts.length,
          multiConstraintConflicts: ir.conflicts.multiConstraintConflicts.length,
        }));
      }

      res.status(200).json(body);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
