/**
 * L0 unit tests for the dry-run middleware — covers the six branches the
 * pulse specifies: detects `?dryRun=true`, passes through to validation,
 * short-circuits before write, R5 rejection matches real PATCH, successful
 * validation returns governance preview, and missing param proceeds normally.
 *
 * The middleware itself is a tiny query-string inspector; the interesting
 * behaviour lives at the handler seam, so several of these tests wire the
 * full router (envelope + shape + dryRun + handler) to assert end-to-end
 * that the short-circuit lands where the pulse requires.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildPatchError,
  StructuredEditor,
  ValidationPipeline,
  type EditOperation,
  type R5LockedError,
} from '@bic/claws-sdk/workspace-edit';
import type { GovernanceIR } from '@bic/claws-sdk';
import { CompilationHost } from '../../src/compilation-host.js';
import { dryRunMiddleware, isDryRunRequest } from '../../src/middleware/dry-run.js';
import { patchChunksRouter } from '../../src/routes/patch-chunks.js';
import {
  patchEnvelopeMiddleware,
  patchShapeMiddleware,
} from '../../src/middleware/validation-middleware.js';

function emptyIR(): GovernanceIR {
  return {
    capabilities: { tools: [], skills: [], agents: [], workflows: [] },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.1.0',
      compiledAt: '2026-04-17T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

interface Harness {
  server: Server;
  root: string;
  close: () => Promise<void>;
}

interface HarnessOverrides {
  readonly toolsMd?: string;
  readonly pipelineBuilder?: (ir: GovernanceIR) => ValidationPipeline;
}

async function buildHarness(overrides: HarnessOverrides = {}): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'dryrun-unit-'));
  await writeFile(
    join(root, 'SOUL.md'),
    '# Soul\n\nDry run.\n\n## Purpose\n\n- x\n',
    'utf-8',
  );
  await writeFile(
    join(root, 'TOOLS.md'),
    overrides.toolsMd ?? '# Tools\n\n## read_inbox\n\n- enabled: true\n',
    'utf-8',
  );
  const host = new CompilationHost(async () => emptyIR(), root);
  await host.compile();

  const app = express();
  app.patch('*', patchEnvelopeMiddleware());
  app.use(express.json({ limit: '1mb' }));
  app.patch('/api/chunks/*', patchShapeMiddleware());
  app.patch('/api/chunks/*', dryRunMiddleware());
  app.use(
    '/api/chunks',
    patchChunksRouter(host, {
      workspaceRoot: root,
      editor: new StructuredEditor({ workspaceRoot: root }),
      pipelineFactory: overrides.pipelineBuilder ?? (() => new ValidationPipeline()),
    }),
  );

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    server,
    root,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function patch(
  server: Server,
  path: string,
  body: unknown,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const payload = JSON.stringify(body);
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
    },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

let harness: Harness | undefined;

afterEach(async () => {
  if (harness !== undefined) {
    await harness.close();
    harness = undefined;
  }
});

describe('dryRunMiddleware — L0 unit', () => {
  it('stamps req.isDryRun=true when ?dryRun=true is present', () => {
    const mw = dryRunMiddleware();
    const req = { query: { dryRun: 'true' } } as unknown as Parameters<typeof mw>[0];
    let called = false;
    mw(req, {} as unknown as Parameters<typeof mw>[1], () => {
      called = true;
    });
    expect(called).toBe(true);
    expect(isDryRunRequest(req as unknown as import('express').Request)).toBe(true);
  });

  it('leaves req.isDryRun=false when the query param is absent or any other value', () => {
    const mw = dryRunMiddleware();
    for (const value of [undefined, 'false', '1', 'yes', '']) {
      const req = {
        query: value === undefined ? {} : { dryRun: value },
      } as unknown as Parameters<typeof mw>[0];
      mw(req, {} as unknown as Parameters<typeof mw>[1], () => {});
      expect(isDryRunRequest(req as unknown as import('express').Request)).toBe(false);
    }
  });

  it('short-circuits the handler before write — file hash unchanged', async () => {
    harness = await buildHarness();
    const before = await readFile(join(harness.root, 'TOOLS.md'), 'utf-8');
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    };
    const res = await patch(harness.server, '/api/chunks/connections?dryRun=true', op);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      dryRun: boolean;
      valid: boolean;
      governance: { warnings: unknown[]; errors: unknown[]; estimatedRecompileMs: number };
    };
    expect(body.dryRun).toBe(true);
    expect(body.valid).toBe(true);
    expect(Array.isArray(body.governance.warnings)).toBe(true);
    expect(Array.isArray(body.governance.errors)).toBe(true);
    expect(typeof body.governance.estimatedRecompileMs).toBe('number');
    const after = await readFile(join(harness.root, 'TOOLS.md'), 'utf-8');
    expect(after).toBe(before);
  });

  it('surfaces validator rejection with the same PatchError shape as a real PATCH', async () => {
    // Stub an R5 rejection and assert the dry-run response carries the
    // identical error envelope a real PATCH would produce, with dryRun: true
    // merged onto the body so clients can detect preview mode.
    harness = await buildHarness({
      pipelineBuilder: () => {
        const pipeline = new ValidationPipeline();
        pipeline.addValidator({
          name: 'r5',
          validate: () => ({
            ok: false,
            error: buildPatchError<R5LockedError>({
              code: 'R5_LOCKED',
              ocPath: 'oc://TOOLS.md/read_inbox/enabled',
              tool: 'read_inbox',
              lockSource: 'r5',
            }),
          }),
        });
        return pipeline;
      },
    });
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    };
    const res = await patch(harness.server, '/api/chunks/connections?dryRun=true', op);
    expect(res.status).toBe(403);
    const body = JSON.parse(res.body) as {
      dryRun: boolean;
      error: { code: string; tool: string; lockSource: string; message: string };
    };
    expect(body.dryRun).toBe(true);
    expect(body.error.code).toBe('R5_LOCKED');
    expect(body.error.tool).toBe('read_inbox');
    expect(body.error.lockSource).toBe('r5');
    expect(typeof body.error.message).toBe('string');
  });

  it('returns governance preview shape on success — warnings, errors, estimatedRecompileMs', async () => {
    harness = await buildHarness();
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    };
    const res = await patch(harness.server, '/api/chunks/connections?dryRun=true', op);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as {
      dryRun: true;
      valid: true;
      governance: { warnings: unknown[]; errors: unknown[]; estimatedRecompileMs: number };
    };
    expect(body.governance.errors).toEqual([]);
    expect(body.governance.estimatedRecompileMs).toBeGreaterThanOrEqual(0);
  });

  it('missing ?dryRun param proceeds normally through write phase', async () => {
    // No ?dryRun → real PATCH. The file IS mutated, the response is the
    // chunk envelope (no `dryRun` key), and `valid` is absent.
    harness = await buildHarness();
    const before = await readFile(join(harness.root, 'TOOLS.md'), 'utf-8');
    const op: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    };
    const res = await patch(harness.server, '/api/chunks/connections', op);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['dryRun']).toBeUndefined();
    expect(body['chunk']).toBeDefined();
    const after = await readFile(join(harness.root, 'TOOLS.md'), 'utf-8');
    expect(after).not.toBe(before);
    expect(after).toContain('- enabled: false');
  });
});
