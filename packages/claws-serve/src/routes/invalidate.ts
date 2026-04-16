/**
 * POST /invalidate — force cache invalidation on the CompilationHost.
 *
 * After invalidation, the next GET /ir will return 404 until a
 * POST /compile triggers a full recompile.
 *
 * @module claws-serve/routes/invalidate
 */

import { Router, type Request, type Response } from 'express';
import type { CompilationHost } from '../compilation-host.js';
import type { ClientManager } from '../ws/events.js';
import { createEvent } from '../ws/events.js';

export function invalidateRouter(host: CompilationHost, clientManager?: ClientManager | undefined): Router {
  const router = Router();

  router.post('/invalidate', (_req: Request, res: Response) => {
    host.clear();

    clientManager?.broadcast(createEvent('ir:invalidated'));

    // Emit tension:resolved since cache is cleared (no more conflicts)
    clientManager?.broadcast(createEvent('tension:resolved', {
      reason: 'cache_invalidated',
    }));

    res.status(200).json({ invalidated: true });
  });

  return router;
}
