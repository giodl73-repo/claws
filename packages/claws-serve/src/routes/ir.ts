/**
 * GET /ir — return cached GovernanceIR JSON with cache headers.
 *
 * Returns the cached GovernanceIR from the shared CompilationHost.
 * Sets ETag and Cache-Control headers for sub-100ms cache-hit response.
 *
 * @module claws-serve/routes/ir
 */

import { Router, type Request, type Response } from 'express';
import type { CompilationHost } from '../compilation-host.js';

export function irRouter(host: CompilationHost): Router {
  const router = Router();

  router.get('/ir', (_req: Request, res: Response) => {
    const ir = host.getCachedIR();

    if (ir === undefined) {
      res.status(404).json({ error: 'No compiled IR available. POST /compile first.' });
      return;
    }

    // hash is always defined when IR is cached (set atomically by compile)
    const hash = host.getHash()!;
    res.set('ETag', `"${hash}"`);
    res.set('Cache-Control', 'private, no-cache');

    res.status(200).json(ir);
  });

  return router;
}
