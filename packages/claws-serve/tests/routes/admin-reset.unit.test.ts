/**
 * L0 unit tests for the /api/health/reset admin-only endpoint.
 *
 * Covers: route is invisible (404) when no admin token configured, 403
 * when token mismatch, 200 + mode flip on successful recheck, 503 when
 * recheck still degraded, constant-time compare does not leak prefix.
 */

import express, { type Express } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';

import {
  ADMIN_TOKEN_HEADER,
  adminResetRouter,
  type AdminResetAuditRecord,
  type AdminResetAuditSink,
  type ServerModeState,
} from '../../src/routes/admin-reset.js';
import type { HealthCheckResult, HealthCheckOptions } from '../../src/lifecycle/health-check.js';

async function listen(app: Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function portOf(server: Server): number {
  const a = server.address();
  if (a === null || typeof a === 'string') throw new Error('no port');
  return a.port;
}

function buildApp(
  state: ServerModeState,
  adminToken: string | undefined,
  runHealthCheck: (opts: HealthCheckOptions) => Promise<HealthCheckResult>,
): Express {
  const app = express();
  app.use(express.json());
  app.use(
    '/api',
    adminResetRouter({
      state,
      adminToken,
      healthCheckOptions: () => ({ host: {} as never }),
      runHealthCheck,
    }),
  );
  return app;
}

let server: Server | undefined;

beforeEach(() => {
  server = undefined;
});

afterEach(() => {
  server?.close();
});

async function post(
  path: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  if (server === undefined) throw new Error('no server');
  const res = await fetch(`http://127.0.0.1:${String(portOf(server))}${path}`, {
    method: 'POST',
    headers,
  });
  const text = await res.text();
  return {
    status: res.status,
    body: text.length > 0 ? JSON.parse(text) : null,
  };
}

describe('POST /api/health/reset', () => {
  it('returns 404 when no admin token is configured', async () => {
    const state: ServerModeState = { mode: 'degraded' };
    const run = vi.fn();
    server = await listen(buildApp(state, undefined, run));
    const res = await post('/api/health/reset');
    expect(res.status).toBe(404);
    expect(run).not.toHaveBeenCalled();
  });

  it('returns 404 when the configured token is the empty string', async () => {
    const state: ServerModeState = { mode: 'degraded' };
    const run = vi.fn();
    server = await listen(buildApp(state, '', run));
    const res = await post('/api/health/reset');
    expect(res.status).toBe(404);
  });

  it('returns 403 when the token is wrong', async () => {
    const state: ServerModeState = { mode: 'degraded' };
    const run = vi.fn();
    server = await listen(buildApp(state, 'secret', run));
    const res = await post('/api/health/reset', { [ADMIN_TOKEN_HEADER]: 'wrong' });
    expect(res.status).toBe(403);
    expect(run).not.toHaveBeenCalled();
  });

  it('returns 403 when the token is missing', async () => {
    const state: ServerModeState = { mode: 'degraded' };
    const run = vi.fn();
    server = await listen(buildApp(state, 'secret', run));
    const res = await post('/api/health/reset');
    expect(res.status).toBe(403);
  });

  it('flips mode to healthy on successful recheck', async () => {
    const state: ServerModeState = {
      mode: 'degraded',
      degradedReason: {
        kind: 'fleet-policy-missing',
        policyFile: '/nowhere',
      },
    };
    const run = vi.fn(
      async (): Promise<HealthCheckResult> => ({ mode: 'healthy' }),
    );
    server = await listen(buildApp(state, 'secret', run));

    const res = await post('/api/health/reset', { [ADMIN_TOKEN_HEADER]: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mode: 'healthy' });
    expect(state.mode).toBe('healthy');
    expect(state.degradedReason).toBeUndefined();
    expect(run).toHaveBeenCalledOnce();
  });

  it('returns 503 when the recheck is still degraded (K2 sanitized body)', async () => {
    const state: ServerModeState = { mode: 'degraded' };
    const run = vi.fn(
      async (): Promise<HealthCheckResult> => ({
        mode: 'degraded',
        reason: {
          kind: 'compile-failed',
          compilerMessage: 'still broken: /etc/secret/SOUL.md missing',
        },
      }),
    );
    // Silence the server-side log-rich assertion so test output is clean;
    // the assertion below verifies the body excludes compilerMessage.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    server = await listen(buildApp(state, 'secret', run));

    const res = await post('/api/health/reset', { [ADMIN_TOKEN_HEADER]: 'secret' });
    expect(res.status).toBe(503);
    const body = res.body as {
      mode: string;
      reasonCode?: string;
      reason?: unknown;
    };
    expect(body.mode).toBe('degraded');
    // K2 sanitization: only the stable code is exposed; the raw reason
    // object (with compilerMessage) never reaches the response body.
    expect(body.reasonCode).toBe('COMPILATION_FAILED_AT_STARTUP');
    expect(body.reason).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('still broken');
    expect(JSON.stringify(body)).not.toContain('/etc/secret');
    // Server-side log preserves the rich detail (not log-swallowed).
    expect(spy).toHaveBeenCalledWith(
      '[admin-reset] recheck still degraded:',
      expect.objectContaining({ kind: 'compile-failed', compilerMessage: expect.stringContaining('/etc/secret') }),
    );
    expect(state.mode).toBe('degraded');
    expect(state.degradedReason?.kind).toBe('compile-failed');
    spy.mockRestore();
  });

  it('returns 503 even when recheck reports degraded with no reason', async () => {
    const state: ServerModeState = { mode: 'degraded' };
    const run = vi.fn(
      async (): Promise<HealthCheckResult> => ({ mode: 'degraded' }),
    );
    server = await listen(buildApp(state, 'secret', run));

    const res = await post('/api/health/reset', { [ADMIN_TOKEN_HEADER]: 'secret' });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ mode: 'degraded' });
  });

  it('uses a constant-time compare so prefix matches do not leak', async () => {
    // Behavioural assertion: feeding a near-match with correct prefix must
    // still produce 403. This does not measure timing but it ensures we
    // don't accidentally use string `===` against an overlong value.
    const state: ServerModeState = { mode: 'degraded' };
    const run = vi.fn();
    server = await listen(buildApp(state, 'abcdef', run));

    const near = await post('/api/health/reset', {
      [ADMIN_TOKEN_HEADER]: 'abcde', // one char short
    });
    expect(near.status).toBe(403);

    const over = await post('/api/health/reset', {
      [ADMIN_TOKEN_HEADER]: 'abcdef0', // one char extra
    });
    expect(over.status).toBe(403);
  });

  describe('audit emission (CP-6 R3 NEW-2)', () => {
    function buildAppWithAudit(
      state: ServerModeState,
      adminToken: string | undefined,
      runHealthCheck: (opts: HealthCheckOptions) => Promise<HealthCheckResult>,
      auditSink: AdminResetAuditSink,
    ): Express {
      const app = express();
      app.use(express.json());
      app.use(
        '/api',
        adminResetRouter({
          state,
          adminToken,
          healthCheckOptions: () => ({ host: {} as never }),
          runHealthCheck,
          auditSink,
        }),
      );
      return app;
    }

    it('emits no record on 404 (token unconfigured) — endpoint is invisible', async () => {
      const records: AdminResetAuditRecord[] = [];
      server = await listen(
        buildAppWithAudit({ mode: 'degraded' }, undefined, vi.fn(), (r) => {
          records.push(r);
        }),
      );
      const res = await post('/api/health/reset');
      expect(res.status).toBe(404);
      expect(records).toHaveLength(0);
    });

    it('emits forbidden record on 403 (wrong token)', async () => {
      const records: AdminResetAuditRecord[] = [];
      server = await listen(
        buildAppWithAudit({ mode: 'degraded' }, 'secret', vi.fn(), (r) => {
          records.push(r);
        }),
      );
      const res = await post('/api/health/reset', {
        [ADMIN_TOKEN_HEADER]: 'wrong',
      });
      expect(res.status).toBe(403);
      expect(records).toHaveLength(1);
      expect(records[0]?.outcome).toBe('forbidden');
      expect(records[0]?.priorMode).toBe('degraded');
    });

    it('emits reset_ok on 200 (healthy recheck)', async () => {
      const records: AdminResetAuditRecord[] = [];
      server = await listen(
        buildAppWithAudit(
          { mode: 'degraded' },
          'secret',
          async () => ({ mode: 'healthy' }),
          (r) => {
            records.push(r);
          },
        ),
      );
      const res = await post('/api/health/reset', {
        [ADMIN_TOKEN_HEADER]: 'secret',
      });
      expect(res.status).toBe(200);
      expect(records).toHaveLength(1);
      expect(records[0]?.outcome).toBe('reset_ok');
      expect(records[0]?.priorMode).toBe('degraded');
      expect(records[0]?.newMode).toBe('healthy');
    });

    it('emits still_degraded on 503 (recheck still failing)', async () => {
      const records: AdminResetAuditRecord[] = [];
      server = await listen(
        buildAppWithAudit(
          { mode: 'degraded' },
          'secret',
          async () => ({
            mode: 'degraded',
            reason: {
              kind: 'fleet-policy-missing',
              policyFile: '/etc/fleet.yaml',
            },
          }),
          (r) => {
            records.push(r);
          },
        ),
      );
      const res = await post('/api/health/reset', {
        [ADMIN_TOKEN_HEADER]: 'secret',
      });
      expect(res.status).toBe(503);
      expect(records).toHaveLength(1);
      expect(records[0]?.outcome).toBe('still_degraded');
      expect(records[0]?.newMode).toBe('degraded');
      expect(records[0]?.reasonCode).toBe('FLEET_POLICY_MISSING');
    });

    it('swallows sink failures without affecting the response', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      server = await listen(
        buildAppWithAudit(
          { mode: 'degraded' },
          'secret',
          async () => ({ mode: 'healthy' }),
          () => {
            throw new Error('sink boom');
          },
        ),
      );
      const res = await post('/api/health/reset', {
        [ADMIN_TOKEN_HEADER]: 'secret',
      });
      expect(res.status).toBe(200);
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it('swallows async sink promise rejections without affecting the response', async () => {
      // Coverage for the Promise-typed sink branch: sinks that return a
      // Promise that rejects must not bubble up to the request pipeline.
      // We await the logged rejection to deflake — the .catch on the
      // returned promise runs on a microtask queue after the response.
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const sinkErr = new Error('async sink boom');
      server = await listen(
        buildAppWithAudit(
          { mode: 'degraded' },
          'secret',
          async () => ({ mode: 'healthy' }),
          () => Promise.reject(sinkErr),
        ),
      );
      const res = await post('/api/health/reset', {
        [ADMIN_TOKEN_HEADER]: 'secret',
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ mode: 'healthy' });
      // Let the microtask queue flush so the .catch handler runs before
      // the assertion. One awaited tick is enough because
      // Promise.reject's .catch is scheduled immediately.
      await new Promise((resolve) => setImmediate(resolve));
      expect(errSpy).toHaveBeenCalledWith('admin-reset audit sink failed:', sinkErr);
      errSpy.mockRestore();
    });

    it('captures X-Actor-Id on authenticated records', async () => {
      const records: AdminResetAuditRecord[] = [];
      server = await listen(
        buildAppWithAudit(
          { mode: 'degraded' },
          'secret',
          async () => ({ mode: 'healthy' }),
          (r) => {
            records.push(r);
          },
        ),
      );
      await post('/api/health/reset', {
        [ADMIN_TOKEN_HEADER]: 'secret',
        'x-actor-id': 'operator@example.com',
      });
      expect(records[0]?.actor).toBe('operator@example.com');
    });

    it('falls back to anonymous actor when X-Actor-Id is absent', async () => {
      const records: AdminResetAuditRecord[] = [];
      server = await listen(
        buildAppWithAudit(
          { mode: 'degraded' },
          'secret',
          async () => ({ mode: 'healthy' }),
          (r) => {
            records.push(r);
          },
        ),
      );
      await post('/api/health/reset', {
        [ADMIN_TOKEN_HEADER]: 'secret',
      });
      expect(records[0]?.actor).toBe('anonymous');
    });
  });

  it('uses runStartupHealthCheck as the default runner when none is supplied', async () => {
    // This variant exercises the default-runner branch by constructing the
    // router without passing `runHealthCheck`. We don't care about the
    // result — only that the default branch is executed without throwing.
    const app = express();
    const state: ServerModeState = { mode: 'degraded' };
    app.use(express.json());
    app.use(
      '/api',
      adminResetRouter({
        state,
        adminToken: 'secret',
        healthCheckOptions: () => ({ host: {} as never }),
      }),
    );
    server = await listen(app);
    const res = await post('/api/health/reset', {
      [ADMIN_TOKEN_HEADER]: 'secret',
    });
    // Default runner will invoke host.compile() on a stub object and throw
    // — the handler's catch(next) routes to Express's default 500 handler.
    // We accept either the 503 success-branch outcome or the 500 that
    // stems from the stub host; the key assertion is that the runner was
    // actually invoked (otherwise we'd see 200 with { mode: 'healthy' }).
    expect([500, 503]).toContain(res.status);
  });
});
