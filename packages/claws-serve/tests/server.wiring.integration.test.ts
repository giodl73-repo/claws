/**
 * L1 integration tests for the CP-6 R2 server wiring fixes.
 *
 * Covers the cluster-A findings:
 *  - A1: ETag precondition guards PATCH when requireETag is on
 *  - A2: time-travel middleware 400s on `?at=` with write verbs
 *  - A7: allow-all route refuses 503 in degraded mode
 *  - A8: single CompilationHost shared across routes (implicit — covered
 *    by the pipeline exercise, which would fail on a mismatched cache)
 *  - E4: POST /api/health/reset clears degraded flag with the admin token
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApp, type ServerState } from '../src/server.js';
import { ADMIN_TOKEN_HEADER } from '../src/routes/admin-reset.js';
import { governanceIRMixedRisk, MIXED_RISK_TOOLS_MD } from './fixtures/mixed-risk-workspace.js';
import {
  VersionManager,
  type CachedFleetPolicyLoader,
} from '@bic/claws-sdk/workspace-edit';
import { AutoSnapshotManager } from '@bic/claws-sdk/workspace';

import { TEST_TRUST_SIGNING_KEY } from './fixtures/trust-key.js';
const SOUL = '# Soul\n\nS03.\n\n## Purpose\n\n- wiring\n';

async function listen(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function portOf(server: Server): number {
  const a = server.address();
  if (a === null || typeof a === 'string') throw new Error('no port');
  return a.port;
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'server-wiring-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MIXED_RISK_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('server.ts CP-6 R2 wiring', () => {
  it('A1: PATCH returns 428 without If-Match when requireETag is on', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      requireETag: true,
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/chunks/connections`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'toggle',
          file: 'TOOLS.md',
          section: 'ping',
          field: 'enabled',
          value: true,
        }),
      },
    );
    expect(res.status).toBe(428);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('PRECONDITION_REQUIRED');
  });

  it('A1: GET response carries an ETag header', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      requireETag: true,
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/chunks/connections`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe('"0"');
  });

  it('A2: PATCH with ?at= returns 400 AT_WRITE_NOT_ALLOWED', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/chunks/connections?at=v5`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'toggle',
          file: 'TOOLS.md',
          section: 'ping',
          field: 'enabled',
          value: true,
        }),
      },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('AT_WRITE_NOT_ALLOWED');
  });

  it('A2: POST /api/batch with ?at= returns 400 AT_WRITE_NOT_ALLOWED', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/batch?at=v5`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: [] }),
      },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('AT_WRITE_NOT_ALLOWED');
  });

  it('A7: allow-all returns 503 when server is degraded', async () => {
    const state: ServerState = {
      startedAt: Date.now(),
      compileCount: 0,
      mode: 'degraded',
      degradedReason: {
        kind: 'fleet-policy-missing',
        policyFile: '/nowhere/fleet.json',
      },
    };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/chunks/connections/allow-all`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      error: { code: string; reasonCode?: string; reason?: unknown };
    };
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    // K2 sanitization: body exposes only the stable DegradedReasonCode
    // enum, never the raw DegradedReason with policyFile.
    expect(body.error.reasonCode).toBe('FLEET_POLICY_MISSING');
    expect(body.error.reason).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('/nowhere/fleet.json');
  });

  it('E4: /api/health/reset is 404 without admin token', async () => {
    const state: ServerState = {
      startedAt: Date.now(),
      compileCount: 0,
      mode: 'degraded',
    };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/health/reset`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    expect(res.status).toBe(404);
  });

  it('E4: /api/health/reset clears the degraded flag with a valid token', async () => {
    const state: ServerState = {
      startedAt: Date.now(),
      compileCount: 0,
      mode: 'degraded',
      degradedReason: {
        kind: 'compile-failed',
        compilerMessage: 'initial failure',
      },
    };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      adminToken: 'test-token',
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/health/reset`,
      {
        method: 'POST',
        headers: {
          [ADMIN_TOKEN_HEADER]: 'test-token',
          'Content-Type': 'application/json',
        },
      },
    );
    expect(res.status).toBe(200);
    expect(state.mode).toBe('healthy');
    expect(state.degradedReason).toBeUndefined();
  });

  it('E4: /api/health/reset returns 403 with a wrong token', async () => {
    const state: ServerState = {
      startedAt: Date.now(),
      compileCount: 0,
      mode: 'degraded',
    };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      adminToken: 'real-token',
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/health/reset`,
      {
        method: 'POST',
        headers: {
          [ADMIN_TOKEN_HEADER]: 'wrong-token',
          'Content-Type': 'application/json',
        },
      },
    );
    expect(res.status).toBe(403);
  });

  it('full pipeline: R5 toggle still rejects (validator wiring intact)', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listen(app);

    // delete_site is R5 in the mixed-risk fixture; a toggle-off must
    // return 403 R5_LOCKED.
    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/chunks/connections`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'toggle',
          file: 'TOOLS.md',
          section: 'delete_site',
          field: 'enabled',
          value: false,
        }),
      },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('R5_LOCKED');
  });

  it('G1: createCachedFleetPolicyLoader is constructed at process-scope when fleetPolicyFile is set', async () => {
    // Write a valid fleet policy so the loader can actually load something.
    const policyPath = join(root, 'fleet-policy.json');
    await writeFile(
      policyPath,
      JSON.stringify({ overrides: [] }),
      'utf-8',
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      fleetPolicyFile: policyPath,
    });

    // The loader must be attached to the app (so integration tests +
    // operators can probe its stats) rather than rebuilt per-request.
    const loader = app.get('cachedFleetLoader') as CachedFleetPolicyLoader | undefined;
    expect(loader).toBeDefined();
    expect(typeof loader?.load).toBe('function');
    expect(loader?.stats.invocations()).toBe(0);
    expect(loader?.stats.reads()).toBe(0);

    // Invoke directly — the first call reads, the second hits the cache.
    await loader?.load();
    await loader?.load();
    expect(loader?.stats.invocations()).toBe(2);
    expect(loader?.stats.reads()).toBe(1);
  });

  it('G1: cachedFleetLoader is undefined when fleetPolicyFile is absent', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      // No fleetPolicyFile.
    });

    // Without a policy file, no loader is constructed — the FleetValidator
    // is omitted from the pipeline rather than wired with a default.
    expect(app.get('cachedFleetLoader')).toBeUndefined();
  });

  it('G1: cached loader stats stay at 1 read across a multi-PATCH sweep (C1 scale proof)', async () => {
    // Write a valid fleet policy so the pipeline's FleetValidator doesn't
    // fail-closed on every op.
    const policyPath = join(root, 'fleet-policy.json');
    await writeFile(
      policyPath,
      JSON.stringify({ overrides: [] }),
      'utf-8',
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      fleetPolicyFile: policyPath,
    });
    server = await listen(app);

    const loader = app.get('cachedFleetLoader') as CachedFleetPolicyLoader | undefined;
    expect(loader).toBeDefined();

    // Fire 5 PATCHes in sequence. Each goes through the full validator
    // pipeline including fleet. Absent the cache, the file would be read
    // 5 times. With the process-scope cache, all reads after the first
    // are served from memory on the mtime-unchanged branch.
    for (let i = 0; i < 5; i += 1) {
      await fetch(
        `http://127.0.0.1:${String(portOf(server))}/api/chunks/connections`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'toggle',
            file: 'TOOLS.md',
            section: 'ping',
            field: 'enabled',
            value: true,
          }),
        },
      );
    }

    // 5 PATCHes invoke the loader at least 5 times (validator runs on
    // every op), but disk reads are capped at 1 because the mtime never
    // advanced. This is the "940 → 1" bullet from M6-R2.
    expect(loader?.stats.invocations()).toBeGreaterThanOrEqual(5);
    expect(loader?.stats.reads()).toBe(1);
  });

  it('logs and swallows VersionManager.loadVersion rejection during createApp', async () => {
    // VersionManager.loadVersion is catch-all-safe in prod, but the `.catch`
    // branch in server.ts guards against future throws (e.g. an injected fs
    // that rejects). Spy on the prototype to force a rejection and assert
    // the catch fires + is swallowed so the app keeps serving with the
    // in-memory counter.
    const spy = vi
      .spyOn(VersionManager.prototype, 'loadVersion')
      .mockRejectedValueOnce(new Error('simulated disk failure'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
      const app = createApp(state, {
        compileFn: async () => governanceIRMixedRisk(),
        trustSigningKey: TEST_TRUST_SIGNING_KEY,
        workspaceRoot: root,
      });
      const ready = app.get('versionManagerReady') as Promise<number>;
      const version = await ready;
      // The catch handler returns `versionManager.getVersion()` — 0 on a
      // brand-new manager.
      expect(version).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith(
        'VersionManager.loadVersion failed:',
        expect.any(Error),
      );
    } finally {
      spy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('allow-all pipeline wires the FleetValidator when fleetPolicyFile is set', async () => {
    // Exercises the allow-all pipeline factory's fleet branch (the
    // parallel to pipelineFactory's fleet wire). A PATCH to allow-all
    // with a valid fleet policy must reach the loader so its stats
    // advance, which only happens if the FleetValidator is in the
    // allow-all pipeline.
    const policyPath = join(root, 'fleet-policy.json');
    await writeFile(policyPath, JSON.stringify({ overrides: [] }), 'utf-8');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
      fleetPolicyFile: policyPath,
    });
    server = await listen(app);

    const loader = app.get('cachedFleetLoader') as CachedFleetPolicyLoader | undefined;
    expect(loader).toBeDefined();
    const invocationsBefore = loader!.stats.invocations();

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/api/chunks/connections/allow-all`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'wiring-test' }),
      },
    );
    expect(res.status).toBeLessThan(500);
    // The fleet validator must have been invoked at least once during
    // the allow-all pipeline execution (one invocation per candidate
    // enable-op is the minimum).
    expect(loader!.stats.invocations()).toBeGreaterThan(invocationsBefore);
  });

  it('CP-7 C3: createApp installs an AutoSnapshotManager on the app', async () => {
    // C3 wiring: server.ts must construct and expose the
    // AutoSnapshotManager via app.get('autoSnapshotManager'), and the
    // rehydrate promise via app.get('autoSnapshotReady'). This is the
    // contract that lets future routes (time-travel, diff, rollback)
    // read pre-edit snapshots without re-threading the manager.
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMixedRisk(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });

    const mgr = app.get('autoSnapshotManager');
    expect(mgr).toBeInstanceOf(AutoSnapshotManager);

    const ready = app.get('autoSnapshotReady');
    expect(ready).toBeInstanceOf(Promise);
    // Rehydrate must resolve (empty workspace => 0 entries, no throw).
    await expect(ready as Promise<void>).resolves.toBeUndefined();
    expect((mgr as AutoSnapshotManager).size()).toBe(0);
  });

  it('CP-7 C3: autoSnapshotReady.catch logs when load() throws a non-ENOENT error', async () => {
    // Covers the .catch(err => console.error(...)) arm of server.ts line
    // 317. Forcing `AutoSnapshotManager.load()` to reject requires
    // `.claws/snapshots/auto` to exist as a non-directory so `readdir`
    // throws ENOTDIR (not ENOENT, which is swallowed as "no prior
    // snapshots"). The rehydrate promise must still resolve to `undefined`
    // so `startServer` does not block at bind time.
    await mkdir(join(root, '.claws', 'snapshots'), { recursive: true });
    // Write a regular file at the path the manager expects to be a dir.
    await writeFile(join(root, '.claws', 'snapshots', 'auto'), 'not a dir', 'utf-8');

    const calls: unknown[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]): void => {
      calls.push(args);
    };
    try {
      const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
      const app = createApp(state, {
        compileFn: async () => governanceIRMixedRisk(),
        trustSigningKey: TEST_TRUST_SIGNING_KEY,
        workspaceRoot: root,
      });
      const ready = app.get('autoSnapshotReady') as Promise<void>;
      await expect(ready).resolves.toBeUndefined();
      const loadFailure = calls.find(
        (c) =>
          Array.isArray(c) &&
          typeof c[0] === 'string' &&
          c[0].startsWith('AutoSnapshotManager.load failed:'),
      );
      expect(loadFailure).toBeDefined();
    } finally {
      console.error = originalError;
    }
  });
});
