import { Router, type Request, type Response } from 'express';
import type { ServerState } from '../server.js';

export interface HealthResponse {
  uptime: number;
  memory: number;
  compileCount: number;
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
    };

    res.json(body);
  });

  return router;
}
