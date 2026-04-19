/**
 * L0 unit tests for the CP-5 serve scaffold: `/api/health` endpoint
 * and the centralized error handler.
 *
 * Pulse 21 (serve-scaffold) deliverable.
 */
import { describe, it, expect } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import {
  registerRoutes,
  CLAWS_SERVE_VERSION,
  type ApiHealthResponse,
} from '../../src/routes/index.js';
import {
  errorHandler,
  ValidationError,
  notFoundHandler,
} from '../../src/middleware/error-handler.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

function makeHost(): CompilationHost {
  return new CompilationHost(async () => minimalGovernanceIR(), '/stub');
}

async function inject(app: express.Express, method: string, path: string): Promise<{ status: number; body: string }> {
  const { default: http } = await import('node:http');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', () => { resolve(); }); });
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no address');
  try {
    const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, { method });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    await new Promise<void>((resolve) => { server.close(() => { resolve(); }); });
  }
}

describe('GET /api/health', () => {
  it('returns 200 with { status: "ok", version, uptime } when fleet policy is available', async () => {
    const app = express();
    registerRoutes(app, makeHost(), { fleetPolicyAvailable: true, startedAt: Date.now() });

    const { status, body } = await inject(app, 'GET', '/api/health');
    const json = JSON.parse(body) as ApiHealthResponse;

    expect(status).toBe(200);
    expect(json.status).toBe('ok');
    expect(typeof json.version).toBe('string');
    expect(json.version.length).toBeGreaterThan(0);
    expect(typeof json.uptime).toBe('number');
    expect(json.uptime).toBeGreaterThanOrEqual(0);
    expect(json.reason).toBeUndefined();
  });

  it('response includes the claws-serve version string', async () => {
    const app = express();
    registerRoutes(app, makeHost(), { fleetPolicyAvailable: true });

    const { body } = await inject(app, 'GET', '/api/health');
    const json = JSON.parse(body) as ApiHealthResponse;

    expect(json.version).toBe(CLAWS_SERVE_VERSION);
  });

  it('reports { status: "degraded", reason: "fleet_policy_missing" } when fleet policy is unavailable', async () => {
    const app = express();
    registerRoutes(app, makeHost(), { fleetPolicyAvailable: false });

    const { status, body } = await inject(app, 'GET', '/api/health');
    const json = JSON.parse(body) as ApiHealthResponse;

    expect(status).toBe(200);
    expect(json.status).toBe('degraded');
    expect(json.reason).toBe('fleet_policy_missing');
  });
});

describe('errorHandler middleware', () => {
  it('maps ValidationError to 400 with structured JSON body', async () => {
    const app = express();
    app.get('/boom', (_req: Request, _res: Response, next: NextFunction) => {
      next(new ValidationError('bad input', 'BAD_INPUT', { field: 'x' }));
    });
    app.use(errorHandler());

    const { status, body } = await inject(app, 'GET', '/boom');
    const json = JSON.parse(body) as { error: { code: string; message: string; details?: Record<string, unknown> } };

    expect(status).toBe(400);
    expect(json.error.code).toBe('BAD_INPUT');
    expect(json.error.message).toBe('bad input');
    expect(json.error.details).toEqual({ field: 'x' });
  });

  it('maps unknown errors to 500 without leaking stack traces in production', async () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      const app = express();
      app.get('/kaboom', (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error('secret internals with sensitive detail'));
      });
      app.use(errorHandler());

      const { status, body } = await inject(app, 'GET', '/kaboom');
      const json = JSON.parse(body) as { error: { code: string; message: string; stack?: string } };

      expect(status).toBe(500);
      expect(json.error.code).toBe('INTERNAL_ERROR');
      expect(json.error.message).toBe('Internal server error');
      expect(json.error.stack).toBeUndefined();
      expect(body).not.toContain('secret internals');
    } finally {
      if (originalEnv === undefined) {
        delete process.env['NODE_ENV'];
      } else {
        process.env['NODE_ENV'] = originalEnv;
      }
    }
  });
});

describe('notFoundHandler', () => {
  it('returns 404 with structured JSON for unknown routes', async () => {
    const app = express();
    app.use(notFoundHandler());
    app.use(errorHandler());

    const { status, body } = await inject(app, 'GET', '/api/does-not-exist');
    const json = JSON.parse(body) as { error: { code: string; message: string } };

    expect(status).toBe(404);
    expect(json.error.code).toBe('ROUTE_NOT_FOUND');
    expect(json.error.message).toContain('/api/does-not-exist');
  });
});
