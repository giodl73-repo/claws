/**
 * CORS middleware — deny cross-origin access by default.
 *
 * Sets restrictive CORS headers on all HTTP responses.
 * No Access-Control-Allow-Origin header means browsers will
 * block cross-origin requests.
 *
 * @module claws-serve/middleware/cors
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function cors(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // Deny cross-origin by omitting Access-Control-Allow-Origin.
    // Explicitly set restrictive headers.
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    next();
  };
}
