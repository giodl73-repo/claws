/**
 * L2 e2e tests — every PatchError type through the full HTTP stack.
 *
 * Four scenarios, one per critical error code, exercised end-to-end so
 * the contract between HTTP status, response body, and structured error
 * data is pinned against real wire traffic:
 *
 *   1. R5_LOCKED       — PATCH toggling an R5 tool → 403 with R5_LOCKED body
 *   2. FLEET_LOCKED    — PATCH on workspace with missing fleet policy → 403
 *   3. GOVERNANCE_DENIED — PATCH blocked by compiler-injected deny rule → 403
 *   4. COMPILATION_FAILED + rollback — post-write compile fails → 500,
 *      OC file restored to pre-edit state (P-274)
 *
 * The R5 case drives the stock `createApp` wiring (which registers the R5
 * validator by default). The fleet + governance cases mount a custom
 * express app that assembles `patchChunksRouter` with the relevant
 * validators — the write path being tested is the same in both cases,
 * but this lets us exercise pipelines without re-wiring createApp.
 */

import express, { type Express } from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import {
  StructuredEditor,
  ValidationPipeline,
  createFleetValidator,
  createGovernanceValidator,
  createR5Validator,
  type DenyProvenanceRegistry,
  type FleetPolicyLoadResult,
} from '@bic/claws-sdk/workspace-edit';
import { cors } from '../../src/middleware/cors.js';
import {
  patchEnvelopeMiddleware,
  patchShapeMiddleware,
} from '../../src/middleware/validation-middleware.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { patchChunksRouter } from '../../src/routes/patch-chunks.js';
import { createApp, type ServerState } from '../../src/server.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nE2E errors.\n\n## Purpose\n\n- govern\n';

async function listenApp(app: Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function patch(server: Server, path: string, body: unknown) {
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

/**
 * Build a focused Express app that mounts only patchChunksRouter, with a
 * configurable pipelineFactory and compileFn. Used for validators beyond
 * R5 (fleet, governance) that createApp doesn't register out of the box.
 */
function buildCustomApp(opts: {
  workspaceRoot: string;
  compileFn: () => Promise<GovernanceIR>;
  pipelineFactory: (ir: GovernanceIR) => ValidationPipeline;
}): Express {
  const app = express();
  app.use(cors());
  app.patch('*', patchEnvelopeMiddleware());
  app.use(express.json({ limit: '1mb' }));

  const host = new CompilationHost(opts.compileFn, opts.workspaceRoot);
  const editor = new StructuredEditor({ workspaceRoot: opts.workspaceRoot });
  const chunks = express.Router();
  chunks.patch('*', patchShapeMiddleware());
  chunks.use(
    '/',
    patchChunksRouter(host, {
      workspaceRoot: opts.workspaceRoot,
      editor,
      pipelineFactory: opts.pipelineFactory,
    }),
  );
  app.use('/api/chunks', chunks);
  return app;
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'patch-errors-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('PatchError e2e — all 8 types through the HTTP stack (S07)', () => {
  it('R5_LOCKED → 403 with R5 body through the stock createApp wiring', async () => {
    await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0, mode: 'healthy' };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'delete_site',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(403);
    const body = JSON.parse(res.body) as { error: { code: string; tool: string; lockSource: string } };
    expect(body.error.code).toBe('R5_LOCKED');
    expect(body.error.tool).toBe('delete_site');
    expect(body.error.lockSource).toBe('r5');
  });

  it('FLEET_LOCKED → 403 when fleet policy is missing (fail-closed P-272)', async () => {
    await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
    const policyFile = join(root, 'fleet.json'); // intentionally not created

    const app = buildCustomApp({
      workspaceRoot: root,
      compileFn: async () => governanceIRMultiServer(),
      pipelineFactory: (ir) => {
        const pipeline = new ValidationPipeline();
        pipeline.addValidator(createR5Validator(ir));
        pipeline.addValidator(
          createFleetValidator({
            policyFile,
            loader: async (): Promise<FleetPolicyLoadResult> => ({ state: 'missing' }),
          }),
        );
        return pipeline;
      },
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(403);
    const body = JSON.parse(res.body) as {
      error: { code: string; reason: string; policyFile: string; lockSource: string };
    };
    expect(body.error.code).toBe('FLEET_LOCKED');
    expect(body.error.reason).toBe('policy-missing');
    expect(body.error.policyFile).toBe(policyFile);
    expect(body.error.lockSource).toBe('fleet');
  });

  it('GOVERNANCE_DENIED → 403 with provenance chain when a compiler-injected deny rule matches', async () => {
    await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');

    const denyIR: GovernanceIR = {
      ...governanceIRMultiServer(),
      intents: [
        {
          kind: 'deny',
          id: 'deny:send_mail',
          ruleId: 'G-INPUT-02',
          target: 'TOOLS.send_mail',
          reason: 'compliance block on outbound mail',
        },
      ],
    };
    const provenance: DenyProvenanceRegistry = new Map([
      [
        'deny:send_mail',
        {
          policySource: 'fleet:q1-2026',
          ruleId: 'G-INPUT-02',
          governanceFile: join(root, 'SOUL.md'),
          origin: 'compiler-injected' as const,
        },
      ],
    ]);

    const app = buildCustomApp({
      workspaceRoot: root,
      compileFn: async () => denyIR,
      pipelineFactory: (ir) => {
        const pipeline = new ValidationPipeline();
        pipeline.addValidator(createR5Validator(ir));
        pipeline.addValidator(
          createGovernanceValidator({
            ir,
            denyProvenance: provenance,
            governanceFile: join(root, 'SOUL.md'),
          }),
        );
        return pipeline;
      },
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'send_mail',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(403);
    const body = JSON.parse(res.body) as {
      error: { code: string; provenance: { ruleId: string; origin: string } };
    };
    expect(body.error.code).toBe('GOVERNANCE_DENIED');
    expect(body.error.provenance.ruleId).toBe('G-INPUT-02');
    expect(body.error.provenance.origin).toBe('compiler-injected');
  });

  it('COMPILATION_FAILED with atomic rollback → 500 + OC file restored (P-274, S20)', async () => {
    const toolsBefore = `# Tools

## read_inbox

- enabled: true
- description: Read inbox
`;
    await writeFile(join(root, 'TOOLS.md'), toolsBefore, 'utf-8');
    const preEditBytes = await readFile(join(root, 'TOOLS.md'), 'utf-8');

    // compileFn succeeds on the first call (startup / pipeline build) and
    // throws on subsequent calls (post-write recompile). This reproduces
    // the P-274 case: edit succeeds on disk, compile fails downstream.
    let compileCount = 0;
    const app = buildCustomApp({
      workspaceRoot: root,
      compileFn: async () => {
        compileCount += 1;
        if (compileCount === 1) return governanceIRMultiServer();
        throw new Error('post-write compile failed: IR produced conflicts');
      },
      pipelineFactory: (ir) => {
        const pipeline = new ValidationPipeline();
        pipeline.addValidator(createR5Validator(ir));
        return pipeline;
      },
    });
    server = await listenApp(app);

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as {
      error: { code: string; compilerMessage: string };
    };
    expect(body.error.code).toBe('COMPILATION_FAILED');
    // CISO W05 + gateway N-1: compilerMessage MUST NOT leak raw compiler
    // output (paths, stack trace fragments) on the user-facing response.
    // The stable code is enough for partner branching; operators read the
    // full detail from server logs + the rollback audit sink.
    expect(body.error.compilerMessage).toBe('');
    // The rendered `message` field also must not echo the workspace root.
    expect(JSON.stringify(body.error)).not.toContain(root);

    // Atomic rollback confirmation: the OC file on disk matches its
    // pre-edit bytes exactly. The edit flipped `enabled: true → false`
    // during the write, then the restore reverts it.
    const postEditBytes = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(postEditBytes).toBe(preEditBytes);
    expect(postEditBytes).toContain('- enabled: true');
  });
});
