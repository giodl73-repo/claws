/**
 * L3 acceptance tests for CP-6 — cap-integration scenarios S07, S20, S33.
 *
 * S07 — All 8 PatchError types produce correct HTTP status and structured
 *       body through the full stack. Partners rely on these contracts to
 *       branch on status + code without parsing the human message.
 *
 * S20 — Atomic rollback on compilation failure (P-274). The OC file must
 *       be restored to pre-edit state AND the rollback must be audited
 *       with pre-edit and post-edit hashes.
 *
 * S33 — Startup health check sets degraded mode on a broken workspace,
 *       preventing writes until the root cause is fixed.
 */

import express, { type Express } from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { GovernanceIR } from '@bic/claws-sdk';
import {
  StructuredEditor,
  ValidationPipeline,
  createR5Validator,
} from '@bic/claws-sdk/workspace-edit';
import { cors } from '../../src/middleware/cors.js';
import {
  patchEnvelopeMiddleware,
  patchShapeMiddleware,
} from '../../src/middleware/validation-middleware.js';
import { CompilationHost } from '../../src/compilation-host.js';
import {
  patchChunksRouter,
  statusForPatchError,
  type RollbackAuditEvent,
} from '../../src/routes/patch-chunks.js';
import { runStartupHealthCheck } from '../../src/lifecycle/health-check.js';
import { createApp, type ServerState } from '../../src/server.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nAccept.\n\n## Purpose\n\n- govern\n';

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

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'patch-accept-errors-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S07 — all 8 PatchError codes map to the documented HTTP status', () => {
  it('pins the status-for-code contract so partners can branch on status', () => {
    expect(statusForPatchError('R5_LOCKED')).toBe(403);
    expect(statusForPatchError('FLEET_LOCKED')).toBe(403);
    expect(statusForPatchError('GOVERNANCE_DENIED')).toBe(403);
    expect(statusForPatchError('FILE_NOT_EDITABLE')).toBe(403);
    expect(statusForPatchError('VALIDATION_FAILED')).toBe(422);
    expect(statusForPatchError('COMPILATION_FAILED')).toBe(500);
    expect(statusForPatchError('ROLLBACK_FAILED')).toBe(500);
    expect(statusForPatchError('UNKNOWN_ERROR')).toBe(500);
  });

  it('R5_LOCKED body shape matches the partner contract via the HTTP stack', async () => {
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
    const body = JSON.parse(res.body) as {
      error: {
        code: string;
        message: string;
        ocPath: string;
        tool: string;
        lockSource: string;
      };
    };
    expect(body.error.code).toBe('R5_LOCKED');
    expect(body.error.ocPath).toBe('oc://TOOLS.md/delete_site/enabled');
    expect(body.error.tool).toBe('delete_site');
    expect(body.error.lockSource).toBe('r5');
    expect(body.error.message).toContain('R5_NON_NEGOTIABLE');
  });
});

describe('S20 — atomic rollback restores OC file + emits audit event (P-274)', () => {
  it('OC file bytes are byte-identical to pre-edit after compile failure', async () => {
    const toolsBefore = `# Tools

## read_inbox

- enabled: true
- description: Read inbox
`;
    await writeFile(join(root, 'TOOLS.md'), toolsBefore, 'utf-8');
    const preEditBytes = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    const expectedPreHash = sha256(preEditBytes);

    const auditEvents: RollbackAuditEvent[] = [];
    let compileCount = 0;
    const compileFn = async (): Promise<GovernanceIR> => {
      compileCount += 1;
      if (compileCount === 1) return governanceIRMultiServer();
      throw new Error('recompile failed: simulated compile error');
    };

    const app = express();
    app.use(cors());
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    const host = new CompilationHost(compileFn, root);
    const editor = new StructuredEditor({ workspaceRoot: root });
    const chunks = express.Router();
    chunks.patch('*', patchShapeMiddleware());
    chunks.use(
      '/',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor,
        pipelineFactory: (ir) => {
          const pipeline = new ValidationPipeline();
          pipeline.addValidator(createR5Validator(ir));
          return pipeline;
        },
        auditSink: (event) => auditEvents.push(event),
      }),
    );
    app.use('/api/chunks', chunks);
    server = await listenApp(app);

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('COMPILATION_FAILED');

    // OC file bytes restored exactly
    const postEditBytes = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(postEditBytes).toBe(preEditBytes);

    // Audit event emitted with pre + post edit hashes
    expect(auditEvents).toHaveLength(1);
    const event = auditEvents[0]!;
    expect(event.ocPath).toBe('oc://TOOLS.md/read_inbox');
    expect(event.preEditHash).toBe(expectedPreHash);
    expect(event.postEditHash).not.toBe(expectedPreHash);
    expect(event.rollbackOk).toBe(true);
    expect(event.compilerMessage).toContain('simulated compile error');
  });
});

describe('S33 — startup health check sets degraded mode on broken workspace', () => {
  it('broken compile → mode=degraded → PATCH returns 503', async () => {
    await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');

    const state: ServerState = { startedAt: Date.now(), compileCount: 0, mode: 'healthy' };
    const app = createApp(state, {
      compileFn: async () => {
        throw new Error('SOUL.md: unrecoverable — missing Purpose section');
      },
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });

    const host = new CompilationHost(async () => {
      throw new Error('SOUL.md: unrecoverable — missing Purpose section');
    }, root);
    const hc = await runStartupHealthCheck({ host });
    state.mode = hc.mode;
    state.degradedReason = hc.reason;

    expect(state.mode).toBe('degraded');
    expect(state.degradedReason?.kind).toBe('compile-failed');

    server = await listenApp(app);
    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(503);
    const body = JSON.parse(res.body) as {
      error: { code: string; reasonCode?: string; reason?: unknown };
    };
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    // K2 sanitization: the 503 body carries only the stable code.
    expect(body.error.reasonCode).toBe('COMPILATION_FAILED_AT_STARTUP');
    expect(body.error.reason).toBeUndefined();
  });
});
