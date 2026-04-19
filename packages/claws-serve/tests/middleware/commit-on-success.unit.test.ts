/**
 * L0 unit tests for the commit-on-success middleware.
 *
 * Verifies that the counter advances and a snapshot is recorded exactly
 * once per successful write, is skipped on non-2xx, survives a missing
 * IR cache, and passes through non-write methods. CP-6 R2 cluster H adds:
 *
 *  - H2: dry-run PATCH leaves counter + VersionStore untouched.
 *  - H4: body serialisation throw aborts BEFORE the counter advances.
 */

import express, { type Express } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  VersionManager,
} from '@bic/claws-sdk/workspace-edit';
import { VersionStore } from '@bic/claws-sdk/workspace';
import type { GovernanceIR } from '@bic/claws-sdk';

import { commitOnSuccess, stampPostEditHashes } from '../../src/middleware/commit-on-success.js';
import { dryRunMiddleware } from '../../src/middleware/dry-run.js';
import { CompilationHost } from '../../src/compilation-host.js';

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

const STUB_IR: GovernanceIR = {
  intents: [],
  capabilities: [],
  identity: {
    name: 'stub',
    role: 'stub',
    stance: 'stub',
    purpose: 'stub',
    values: [],
    mcpServers: [],
  },
  analysis: {
    violations: [],
    unreachable: [],
    redundancies: [],
    gaps: [],
    cycles: [],
    alignmentScore: 0,
    intentFlow: [],
    tensions: [],
    aestheticNorms: [],
    energeticStates: [],
    tacitKnowledge: [],
    fieldInteractions: [],
    phaseTransitions: [],
    trainingData: { examples: [], patterns: [], constraints: [] },
    knownImpossibilities: [],
  },
  bundles: [],
  metadata: {
    compiledAt: '2026-04-17T00:00:00.000Z',
    sourceFiles: [],
    ocVersion: '0.1.0',
  },
} as unknown as GovernanceIR;

let workspace: string;
let server: Server | undefined;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'commit-mw-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(workspace, { recursive: true, force: true });
});

async function buildServer(
  manager: VersionManager,
  store: VersionStore,
  host: CompilationHost,
  handler: (req: express.Request, res: express.Response) => void | Promise<void>,
): Promise<Server> {
  const app = express();
  app.use(express.json());
  app.use(
    commitOnSuccess({
      manager,
      store,
      host,
      workspaceRoot: workspace,
      now: () => new Date('2026-04-17T00:00:00.000Z'),
    }),
  );
  app.patch('/write', (req, res) => {
    void Promise.resolve(handler(req, res));
  });
  app.post('/write', (req, res) => {
    void Promise.resolve(handler(req, res));
  });
  app.get('/read', (_req, res) => {
    res.status(200).json({ read: true });
  });
  return listen(app);
}

describe('commitOnSuccess middleware', () => {
  it('advances the counter and records a snapshot on successful PATCH', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();
    await writeFile(join(workspace, 'SOUL.md'), '# soul\n', 'utf-8');

    server = await buildServer(manager, store, host, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe('"1"');
    expect(manager.getVersion()).toBe(1);
    const lookup = store.get(1);
    expect(lookup.kind).toBe('found');
    if (lookup.kind === 'found') {
      expect(lookup.snapshot.fileHashes['SOUL.md']).toBeDefined();
    }
  });

  it('does not advance the counter when the handler returns 4xx', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    server = await buildServer(manager, store, host, (_req, res) => {
      res.status(422).json({ error: { code: 'VALIDATION_FAILED' } });
    });
    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(res.status).toBe(422);
    expect(manager.getVersion()).toBe(0);
    expect(store.size()).toBe(0);
  });

  it('skips the snapshot when the compilation cache is empty', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    // Do NOT call host.compile() — cache stays empty.

    server = await buildServer(manager, store, host, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(res.status).toBe(200);
    // Counter advanced (write succeeded) but no snapshot recorded.
    expect(manager.getVersion()).toBe(1);
    expect(store.size()).toBe(0);
  });

  it('passes through non-write methods without touching the counter', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    server = await buildServer(manager, store, host, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const res = await fetch(`http://127.0.0.1:${String(portOf(server))}/read`);
    expect(res.status).toBe(200);
    expect(manager.getVersion()).toBe(0);
    expect(store.size()).toBe(0);
  });

  it('wraps res.send the same way it wraps res.json', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    server = await buildServer(manager, store, host, (_req, res) => {
      res.status(200).send('ok');
    });
    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'POST' },
    );
    expect(res.status).toBe(200);
    expect(manager.getVersion()).toBe(1);
  });

  it('uses Date.now as the default clock when none is provided', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    const app = express();
    app.use(express.json());
    app.use(
      commitOnSuccess({
        manager,
        store,
        host,
        workspaceRoot: workspace,
        // NOTE: no `now` override — exercises the default-clock branch.
      }),
    );
    app.patch('/write', (_req, res) => {
      res.status(200).json({ ok: true });
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(res.status).toBe(200);
    expect(manager.getVersion()).toBe(1);
    const lookup = store.get(1);
    expect(lookup.kind).toBe('found');
    if (lookup.kind === 'found') {
      // Default clock should produce a timestamp within the last few seconds.
      const compiledAt = Date.parse(lookup.snapshot.compiledAt);
      expect(Date.now() - compiledAt).toBeLessThan(5000);
    }
  });

  it('H2: dry-run PATCH leaves counter and VersionStore unchanged (upstream mount)', async () => {
    // Mount order matches production: commit-on-success runs FIRST, then
    // dry-run stamps the request, then the handler returns a dry-run
    // response body. The commit-hook's lazy dry-run re-check inside
    // commitIfSuccess must recognise the stamped flag and bail.
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    const app = express();
    app.use(express.json());
    app.use(
      commitOnSuccess({
        manager,
        store,
        host,
        workspaceRoot: workspace,
      }),
    );
    app.patch('/write', dryRunMiddleware(), (_req, res) => {
      res.status(200).json({ dryRun: true, valid: true });
    });
    server = await listen(app);

    const res1 = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write?dryRun=true`,
      { method: 'PATCH' },
    );
    expect(res1.status).toBe(200);
    const res2 = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write?dryRun=true`,
      { method: 'PATCH' },
    );
    expect(res2.status).toBe(200);
    // No state mutation from two dry-run probes.
    expect(manager.getVersion()).toBe(0);
    expect(store.size()).toBe(0);
    // ETag header MUST NOT advertise a new version — we skipped the commit.
    // Express may stamp a default weak body-hash ETag (`W/"..."`); only the
    // commit middleware emits strong numeric ETags (`"<n>"`). Reject the
    // latter.
    expect(res1.headers.get('etag')).not.toMatch(/^"\d+"$/);
    expect(res2.headers.get('etag')).not.toMatch(/^"\d+"$/);
  });

  it('H2: dry-run PATCH leaves counter unchanged (upstream dry-run mount)', async () => {
    // Alternative mount order: dry-run mounts BEFORE commit-on-success,
    // so the commit wrapper never installs. Exercises the fast-path
    // bypass at the top of commitOnSuccess.
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    const app = express();
    app.use(express.json());
    app.use(dryRunMiddleware());
    app.use(
      commitOnSuccess({
        manager,
        store,
        host,
        workspaceRoot: workspace,
      }),
    );
    app.patch('/write', (_req, res) => {
      res.status(200).json({ dryRun: true, valid: true });
    });
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write?dryRun=true`,
      { method: 'PATCH' },
    );
    expect(res.status).toBe(200);
    expect(manager.getVersion()).toBe(0);
    expect(store.size()).toBe(0);
  });

  it('H4: body serialisation throw aborts before the counter advances', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    // Silence the Express default error log when the handler throws.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const app = express();
    app.use(express.json());
    app.use(
      commitOnSuccess({
        manager,
        store,
        host,
        workspaceRoot: workspace,
      }),
    );
    app.patch('/write', (_req, res) => {
      // Circular reference — JSON.stringify throws synchronously.
      const body: Record<string, unknown> = { ok: true };
      body['self'] = body;
      res.status(200).json(body);
    });
    // Replace the default error handler so a thrown `res.json` surfaces a
    // 500 instead of Express's stock HTML.
    app.use(
      (
        err: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ): void => {
        res.status(500).json({
          error: {
            code: 'SERIALISATION_FAILED',
            message: err instanceof Error ? err.message : String(err),
          },
        });
      },
    );
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(res.status).toBe(500);
    // Counter must NOT have advanced — the pre-flight stringify threw
    // before commitIfSuccess was queued.
    expect(manager.getVersion()).toBe(0);
    expect(store.size()).toBe(0);
    consoleSpy.mockRestore();
  });

  it('H4: body serialisation throw on res.send aborts before the counter advances', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const app = express();
    app.use(express.json());
    app.use(
      commitOnSuccess({
        manager,
        store,
        host,
        workspaceRoot: workspace,
      }),
    );
    app.post('/write', (_req, res) => {
      const body: Record<string, unknown> = { ok: true };
      body['self'] = body;
      // `res.send` stringifies objects via JSON.stringify under the hood;
      // our wrappedSend pre-flights that path too.
      res.status(200).send(body);
    });
    app.use(
      (
        err: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ): void => {
        res.status(500).json({
          error: { message: err instanceof Error ? err.message : String(err) },
        });
      },
    );
    server = await listen(app);

    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'POST' },
    );
    expect(res.status).toBe(500);
    expect(manager.getVersion()).toBe(0);
    expect(store.size()).toBe(0);
    consoleSpy.mockRestore();
  });

  it('G2: reuses post-edit hashes from res.locals instead of re-reading from disk', async () => {
    // Populate the workspace with OC files — the middleware would normally
    // read them to compute fileHashes.
    await writeFile(join(workspace, 'TOOLS.md'), '# tools\n', 'utf-8');
    await writeFile(join(workspace, 'SOUL.md'), '# soul\n', 'utf-8');

    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    // Stub `readFile` via a spy on fs/promises would require module mocking;
    // instead we assert the stored hash matches the supplied stamp verbatim,
    // proving the middleware used the locals bag rather than reading disk.
    const STAMPED_TOOLS_HASH = 'a'.repeat(64);

    server = await buildServer(manager, store, host, (_req, res) => {
      stampPostEditHashes(res, { 'TOOLS.md': STAMPED_TOOLS_HASH });
      res.status(200).json({ ok: true });
    });
    const resp = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(resp.status).toBe(200);
    const lookup = store.get(1);
    expect(lookup.kind).toBe('found');
    if (lookup.kind === 'found') {
      // Stamped hash landed verbatim — no disk read replaced it.
      expect(lookup.snapshot.fileHashes['TOOLS.md']).toBe(STAMPED_TOOLS_HASH);
    }
  });

  it('G2: inherits fileHashes from the previous snapshot for untouched files', async () => {
    await writeFile(join(workspace, 'TOOLS.md'), '# tools v1\n', 'utf-8');
    await writeFile(join(workspace, 'SOUL.md'), '# soul v1\n', 'utf-8');

    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    // First request: no locals bag, middleware reads disk for every file
    // (cold start).
    server = await buildServer(manager, store, host, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const r1 = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(r1.status).toBe(200);
    const v1 = store.get(1);
    expect(v1.kind).toBe('found');
    const v1SoulHash = v1.kind === 'found' ? v1.snapshot.fileHashes['SOUL.md'] : undefined;
    expect(v1SoulHash).toBeDefined();
    server.close();

    // Second request: only TOOLS.md gets stamped. The middleware must
    // INHERIT SOUL.md's hash from v1 rather than re-reading disk.
    // To prove no disk read happens for SOUL.md, overwrite it on disk
    // with different content and verify the v2 snapshot still carries
    // the v1 hash.
    await writeFile(join(workspace, 'SOUL.md'), '# soul v2 (on disk, not hashed)\n', 'utf-8');
    const STAMPED_TOOLS_HASH = 'b'.repeat(64);
    server = await buildServer(manager, store, host, (_req, res) => {
      stampPostEditHashes(res, { 'TOOLS.md': STAMPED_TOOLS_HASH });
      res.status(200).json({ ok: true });
    });
    const r2 = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(r2.status).toBe(200);
    const v2 = store.get(2);
    expect(v2.kind).toBe('found');
    if (v2.kind === 'found') {
      // SOUL.md hash inherited from v1 (NOT re-read from disk post-write).
      expect(v2.snapshot.fileHashes['SOUL.md']).toBe(v1SoulHash);
      // TOOLS.md hash is the stamped value (from the route handler).
      expect(v2.snapshot.fileHashes['TOOLS.md']).toBe(STAMPED_TOOLS_HASH);
    }
  });

  it('G2: stampPostEditHashes merges across calls rather than clobbering', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    const TOOLS_HASH = 'c'.repeat(64);
    const SETTINGS_HASH = 'd'.repeat(64);

    server = await buildServer(manager, store, host, (_req, res) => {
      stampPostEditHashes(res, { 'TOOLS.md': TOOLS_HASH });
      stampPostEditHashes(res, { 'SETTINGS.md': SETTINGS_HASH });
      res.status(200).json({ ok: true });
    });
    const resp = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(resp.status).toBe(200);
    const lookup = store.get(1);
    expect(lookup.kind).toBe('found');
    if (lookup.kind === 'found') {
      expect(lookup.snapshot.fileHashes['TOOLS.md']).toBe(TOOLS_HASH);
      expect(lookup.snapshot.fileHashes['SETTINGS.md']).toBe(SETTINGS_HASH);
    }
  });

  it('G2: second stamp on the same file overrides the first', async () => {
    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    const FIRST_HASH = 'e'.repeat(64);
    const SECOND_HASH = 'f'.repeat(64);

    server = await buildServer(manager, store, host, (_req, res) => {
      stampPostEditHashes(res, { 'TOOLS.md': FIRST_HASH });
      stampPostEditHashes(res, { 'TOOLS.md': SECOND_HASH });
      res.status(200).json({ ok: true });
    });
    const resp = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(resp.status).toBe(200);
    const lookup = store.get(1);
    expect(lookup.kind).toBe('found');
    if (lookup.kind === 'found') {
      expect(lookup.snapshot.fileHashes['TOOLS.md']).toBe(SECOND_HASH);
    }
  });

  it('G2: cold path — disk read fallback when no prior snapshot and no stamp', async () => {
    // First write on a fresh store, no res.locals bag — the middleware
    // MUST fall back to disk so the snapshot still carries every
    // available OC file hash (drift detection depends on it).
    await writeFile(join(workspace, 'TOOLS.md'), '# tools cold\n', 'utf-8');

    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    server = await buildServer(manager, store, host, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const resp = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(resp.status).toBe(200);
    const lookup = store.get(1);
    expect(lookup.kind).toBe('found');
    if (lookup.kind === 'found') {
      // TOOLS.md was read from disk because neither prior snapshot nor
      // stamp supplied its hash.
      expect(lookup.snapshot.fileHashes['TOOLS.md']).toBeDefined();
      // Its hash must match the actual content on disk.
      const expected = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');
      const crypto = await import('node:crypto');
      const expectedHash = crypto.createHash('sha256').update(expected, 'utf-8').digest('hex');
      expect(lookup.snapshot.fileHashes['TOOLS.md']).toBe(expectedHash);
    }
  });

  it('G2: ignores empty-string hashes in the locals bag (treats as missing)', async () => {
    // BatchOperationResult.before is documented as "Empty when the file
    // did not exist". If a route forwards an empty post-edit hash by
    // mistake, the middleware must not persist it — fall through to
    // inheritance / disk.
    await writeFile(join(workspace, 'TOOLS.md'), '# tools real\n', 'utf-8');

    const manager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();

    server = await buildServer(manager, store, host, (_req, res) => {
      stampPostEditHashes(res, { 'TOOLS.md': '' });
      res.status(200).json({ ok: true });
    });
    const resp = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(resp.status).toBe(200);
    const lookup = store.get(1);
    expect(lookup.kind).toBe('found');
    if (lookup.kind === 'found') {
      // Hash is populated from the disk read (not the empty stamp).
      const contents = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');
      const crypto = await import('node:crypto');
      const expectedHash = crypto.createHash('sha256').update(contents, 'utf-8').digest('hex');
      expect(lookup.snapshot.fileHashes['TOOLS.md']).toBe(expectedHash);
    }
  });

  it('surfaces a commit error through the X-Version-Commit-Error header', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const manager = new VersionManager({ workspaceRoot: workspace });
    const host = new CompilationHost(async () => STUB_IR, workspace);
    await host.compile();
    // Force incrementVersion to fail by pointing the manager at a read-only root.
    // On Windows we can't chmod, so instead stub the manager.
    const breakingManager = new VersionManager({ workspaceRoot: workspace });
    const store = new VersionStore();
    const brokenIncrement = async (): Promise<number> => {
      throw new Error('disk full');
    };
    (breakingManager as unknown as { incrementVersion: () => Promise<number> }).incrementVersion =
      brokenIncrement;

    server = await buildServer(breakingManager, store, host, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const res = await fetch(
      `http://127.0.0.1:${String(portOf(server))}/write`,
      { method: 'PATCH' },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('x-version-commit-error')).toBe('1');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    // The no-op manager field has been mutated to have version unchanged
    // because incrementVersion threw before incrementing.
    expect(manager.getVersion()).toBe(0);
  });
});
