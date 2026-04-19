import { Router, type Request, type Response } from 'express';
import type { ServerState } from '../server.js';
import {
  degradedReasonCode,
  type DegradedReasonCode,
  type ServerMode,
} from '../lifecycle/health-check.js';

export interface HealthResponse {
  uptime: number;
  memory: number;
  compileCount: number;
  /** Operational mode set by the startup health check (S33). */
  mode: ServerMode;
  /**
   * Populated when `mode === 'degraded'`. A stable code — never absolute
   * paths or raw compiler output. Operators read the full reason from
   * server logs; anonymous /health callers only receive the code so they
   * can decide whether to retry or surface an incident.
   */
  degradedReasonCode?: DegradedReasonCode;
}

export function healthRouter(state: ServerState): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    const uptimeMs = Date.now() - state.startedAt;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const memoryUsage = process.memoryUsage().heapUsed;

    const body: HealthResponse = {
      uptime: uptimeSeconds,
      memory: memoryUsage,
      compileCount: state.compileCount,
      mode: state.mode ?? 'healthy',
    };
    if (state.degradedReason !== undefined) {
      body.degradedReasonCode = degradedReasonCode(state.degradedReason);
    }

    res.json(body);
  });

  return router;
}
