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
import { getTimeTravelState } from '../middleware/time-travel.js';
import { TIME_TRAVEL_CACHE_CONTROL } from './ir-resolution.js';

export function irRouter(host: CompilationHost): Router {
  const router = Router();

  router.get('/ir', (req: Request, res: Response) => {
    // Historical read — the time-travel middleware already resolved the
    // `?at=` parameter into a concrete `GovernanceIR`. Serve that IR
    // directly with the immutable cache header because snapshots are
    // content-addressed and never change.
    const timeTravel = getTimeTravelState(req);
    if (timeTravel !== undefined) {
      res.set('Cache-Control', TIME_TRAVEL_CACHE_CONTROL);
      res.status(200).json(timeTravel.governanceIR);
      return;
    }

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
