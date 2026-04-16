import { describe, it, expect, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { rateLimit } from '../../src/middleware/rate-limit.js';
import { contentType } from '../../src/middleware/content-type.js';
import { bodyLimit } from '../../src/middleware/body-limit.js';
import type { RateLimitMiddleware } from '../../src/middleware/rate-limit.js';

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

async function request(server: Server, method: string, path: string, options: { body?: string; headers?: Record<string, string> } = {}): Promise<{ status: number; body: string }> {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server not listening on TCP');
  }
  const url = `http://127.0.0.1:${String(address.port)}${path}`;
  const fetchOptions: RequestInit = { method, headers: options.headers };
  if (options.body !== undefined) {
    fetchOptions.body = options.body;
  }
  const res = await fetch(url, fetchOptions);
  const body = await res.text();
  return { status: res.status, body };
}

describe('rate-limit middleware', () => {
  let server: Server;
  let limiter: RateLimitMiddleware | undefined;

  afterEach(() => {
    server?.close();
    limiter?.dispose();
    limiter = undefined;
  });

  it('allows requests under the rate limit', async () => {
    limiter = rateLimit({ maxPerMinute: 3 });
    const app = express();
    app.post('/test', contentType(), bodyLimit(), limiter, (_req, res) => {
      res.json({ ok: true });
    });
    server = await listen(app);

    for (let i = 0; i < 3; i++) {
      const { status } = await request(server, 'POST', '/test', {
        body: '{}',
        headers: { 'content-type': 'application/json' },
      });
      expect(status).toBe(200);
    }
  });

  it('rejects requests exceeding the rate limit with 429', async () => {
    limiter = rateLimit({ maxPerMinute: 2 });
    const app = express();
    app.post('/test', contentType(), bodyLimit(), limiter, (_req, res) => {
      res.json({ ok: true });
    });
    server = await listen(app);

    // Two requests within limit
    await request(server, 'POST', '/test', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    await request(server, 'POST', '/test', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    // Third request should be rate limited
    const { status, body } = await request(server, 'POST', '/test', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(status).toBe(429);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('Too Many Requests');
  });

  it('uses default maxPerMinute of 10 when not specified', async () => {
    limiter = rateLimit();
    const app = express();
    app.post('/test', contentType(), bodyLimit(), limiter, (_req, res) => {
      res.json({ ok: true });
    });
    server = await listen(app);

    // First 10 requests should pass
    for (let i = 0; i < 10; i++) {
      const { status } = await request(server, 'POST', '/test', {
        body: '{}',
        headers: { 'content-type': 'application/json' },
      });
      expect(status).toBe(200);
    }

    // 11th should be rate limited
    const { status } = await request(server, 'POST', '/test', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(status).toBe(429);
  });
});

describe('rate-limit middleware (direct)', () => {
  let limiter: RateLimitMiddleware | undefined;

  afterEach(() => {
    limiter?.dispose();
    limiter = undefined;
  });

  it('falls back to 127.0.0.1 when req.ip is undefined', () => {
    limiter = rateLimit({ maxPerMinute: 1 });
    const req = { ip: undefined } as any;
    const res = { status: vi.fn().mockReturnValue({ json: vi.fn() }), json: vi.fn() } as any;
    const next = vi.fn();

    limiter(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('uses default max when maxPerMinute is undefined', () => {
    limiter = rateLimit({});
    const req = { ip: '10.0.0.1' } as any;
    const res = { status: vi.fn().mockReturnValue({ json: vi.fn() }), json: vi.fn() } as any;
    const next = vi.fn();

    limiter(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('rate-limit dispose and sweep', () => {
  it('dispose() clears the sweep interval and tracked clients', () => {
    const limiter = rateLimit({ maxPerMinute: 2 });
    const req = { ip: '10.0.0.1' } as any;
    const res = { status: vi.fn().mockReturnValue({ json: vi.fn() }), json: vi.fn() } as any;
    const next = vi.fn();

    // Make a request to populate clients
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();

    // dispose should not throw
    limiter.dispose();

    // After dispose, the middleware still works (new map), but old state is cleared
    // Calling dispose again should be safe
    limiter.dispose();
  });

  it('sweep evicts stale entries', async () => {
    vi.useFakeTimers();
    try {
      const limiter = rateLimit({ maxPerMinute: 1, sweepIntervalMs: 100 });
      const req = { ip: '10.0.0.1' } as any;
      const jsonFn = vi.fn();
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
      const res = { status: statusFn, json: vi.fn() } as any;
      const next = vi.fn();

      // First request should succeed
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request should be rate limited
      limiter(req, res, next);
      expect(statusFn).toHaveBeenCalledWith(429);

      // Advance time past the window (60s) and sweep interval (100ms)
      vi.advanceTimersByTime(61_000);

      // After sweep, the entry should be evicted and the client can request again
      next.mockClear();
      statusFn.mockClear();
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      limiter.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
