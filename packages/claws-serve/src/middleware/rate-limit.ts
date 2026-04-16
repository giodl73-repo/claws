import type { Request, Response, NextFunction, RequestHandler } from 'express';

export interface RateLimitOptions {
  maxPerMinute?: number | undefined;
  sweepIntervalMs?: number | undefined;
}

interface WindowEntry {
  timestamps: number[];
}

const DEFAULT_MAX = 10;
const DEFAULT_SWEEP_INTERVAL_MS = 60_000;

export interface RateLimitMiddleware extends RequestHandler {
  /** Stop the background sweep timer and clear all tracked clients. */
  dispose(): void;
}

export function rateLimit(options: RateLimitOptions = {}): RateLimitMiddleware {
  const maxPerMinute = options.maxPerMinute ?? DEFAULT_MAX;
  const windowMs = 60_000;
  const sweepIntervalMs = options.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
  const clients = new Map<string, WindowEntry>();

  // Periodic sweep: remove entries with no recent timestamps
  const sweepTimer = setInterval(() => {
    const now = Date.now();
    const cutoff = now - windowMs;
    for (const [key, entry] of clients) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        clients.delete(key);
      }
    }
  }, sweepIntervalMs);

  // Allow the process to exit without waiting for the timer
  if (typeof sweepTimer === 'object' && 'unref' in sweepTimer) {
    sweepTimer.unref();
  }

  const middleware = ((req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? '127.0.0.1';
    const now = Date.now();
    const cutoff = now - windowMs;

    let entry = clients.get(key);
    if (entry === undefined) {
      entry = { timestamps: [] };
      clients.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= maxPerMinute) {
      res.status(429).json({ error: 'Too Many Requests' });
      return;
    }

    entry.timestamps.push(now);
    next();
  }) as RateLimitMiddleware;

  middleware.dispose = (): void => {
    clearInterval(sweepTimer);
    clients.clear();
  };

  return middleware;
}
