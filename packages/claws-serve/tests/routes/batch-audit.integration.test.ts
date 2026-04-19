/**
 * L1 integration tests for POST /api/batch rollback-audit wiring
 * (CP-6 R2 F1 / F3 — cluster F).
 *
 * The production /api/batch path must record a {@link RollbackAuditEvent}
 * per touched OC file whenever BatchExecutor triggers a post-compile
 * rollback, symmetric to PATCH /api/chunks. Each event must carry the
 * `actor` identity captured from `req.actor` / `X-Actor-Id`.
 *
 * These tests mount `batchRouter` directly (skipping full `createApp`)
 * so they can inject:
 *   - a spy `auditSink` to capture emitted events
 *   - a `resolveActor` bound to the actor middleware
 *   - a `CompilationHost` whose second compile throws, forcing the
 *     executor through the compile-phase rollback branch.
 */

import express, { type Express } from 'express';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import {
  StructuredEditor,
  ValidationPipeline,
} from '@bic/claws-sdk/workspace-edit';
import type { GovernanceIR } from '@bic/claws-sdk';

import { batchRouter } from '../../src/routes/batch.js';
import { actorMiddleware } from '../../src/middleware/actor.js';
import { dryRunMiddleware } from '../../src/middleware/dry-run.js';
import type {
  RollbackAuditEvent,
  RollbackAuditSink,
} from '../../src/routes/patch-chunks.js';
import type { CompilationHost } from '../../src/compilation-host.js';
import { governanceIRMultiServer } from '../fixtures/governance-ir-multi-server.js';

const TOOLS_MD = `# Tools

## read_inbox

- enabled: true
- description: Read inbox

## send_mail

- enabled: true
- description: Send email
`;

const SETTINGS_MD = `# Settings

## preferences

- language: en
`;

function listen(app: Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function getPort(server: Server): number {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  return addr.port;
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf-8').digest('hex');
}

/**
 * Build a CompilationHost that succeeds on the first call (so validators
 * bind and the editor can apply) and throws on the second call (the
 * post-apply recompile), forcing BatchExecutor into its rollback branch.
 */
function makeFlakyHost(ir: GovernanceIR): {
  host: CompilationHost;
  compileCount: () => number;
} {
  let count = 0;
  const host: CompilationHost = {
    async compile() {
      count += 1;
      if (count >= 2) {
        throw new Error('simulated compiler failure');
      }
      return { ir, durationMs: 1 };
    },
  } as unknown as CompilationHost;
  return { host, compileCount: () => count };
}

let workspace: string;
let server: Server | undefined;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'batch-audit-'));
  await writeFile(join(workspace, 'TOOLS.md'), TOOLS_MD, 'utf-8');
  await writeFile(join(workspace, 'SETTINGS.md'), SETTINGS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(workspace, { recursive: true, force: true });
});

describe('POST /api/batch — rollback audit wiring (CP-6 R2 F1/F3)', () => {
  it('emits one RollbackAuditEvent per touched file with actor populated', async () => {
    const ir = governanceIRMultiServer();
    const { host } = makeFlakyHost(ir);
    const sink = vi.fn<RollbackAuditSink>();
    const editor = new StructuredEditor({ workspaceRoot: workspace });

    const app = express();
    app.use(express.json());
    app.use(actorMiddleware());
    app.post('/api/batch', dryRunMiddleware());
    app.use(
      '/api/batch',
      batchRouter(host, {
        workspaceRoot: workspace,
        editor,
        pipelineFactory: (): ValidationPipeline => new ValidationPipeline(),
        auditSink: sink,
      }),
    );

    server = await listen(app);
    const port = getPort(server);

    const toolsPreHash = sha256(TOOLS_MD);
    const settingsPreHash = sha256(SETTINGS_MD);

    const res = await fetch(`http://127.0.0.1:${String(port)}/api/batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-actor-id': 'giodl@microsoft.com',
      },
      body: JSON.stringify({
        operations: [
          { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
          { kind: 'set', file: 'SETTINGS.md', section: 'preferences', field: 'language', value: 'fr' },
        ],
      }),
    });

    expect(res.status).toBe(500);
    // Two touched files → two audit events (rollback is per-file).
    expect(sink).toHaveBeenCalledTimes(2);

    const events = sink.mock.calls.map((c) => c[0]);
    const toolsEvent = events.find((e) => e.filePath.endsWith('TOOLS.md'));
    const settingsEvent = events.find((e) => e.filePath.endsWith('SETTINGS.md'));
    expect(toolsEvent).toBeDefined();
    expect(settingsEvent).toBeDefined();

    for (const event of events) {
      expect(event.actor).toBe('giodl@microsoft.com');
      expect(event.rollbackOk).toBe(true);
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.compilerMessage).toContain('simulated compiler failure');
    }
    expect(toolsEvent!.ocPath).toBe('oc://TOOLS.md');
    expect(toolsEvent!.preEditHash).toBe(toolsPreHash);
    expect(settingsEvent!.ocPath).toBe('oc://SETTINGS.md');
    expect(settingsEvent!.preEditHash).toBe(settingsPreHash);
  });

  it('defaults actor to anonymous when no X-Actor-Id header is supplied', async () => {
    const ir = governanceIRMultiServer();
    const { host } = makeFlakyHost(ir);
    const sink = vi.fn<RollbackAuditSink>();
    const editor = new StructuredEditor({ workspaceRoot: workspace });

    const app = express();
    app.use(express.json());
    app.use(actorMiddleware());
    app.post('/api/batch', dryRunMiddleware());
    app.use(
      '/api/batch',
      batchRouter(host, {
        workspaceRoot: workspace,
        editor,
        pipelineFactory: (): ValidationPipeline => new ValidationPipeline(),
        auditSink: sink,
      }),
    );

    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/api/batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        operations: [
          { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        ],
      }),
    });

    expect(res.status).toBe(500);
    expect(sink).toHaveBeenCalledOnce();
    const event: RollbackAuditEvent = sink.mock.calls[0]![0];
    expect(event.actor).toBe('anonymous');
  });

  it('does not emit rollback audit events on successful commit', async () => {
    const ir = governanceIRMultiServer();
    // Host that never throws → no rollback.
    const host: CompilationHost = {
      async compile() {
        return { ir, durationMs: 1 };
      },
    } as unknown as CompilationHost;
    const sink = vi.fn<RollbackAuditSink>();
    const editor = new StructuredEditor({ workspaceRoot: workspace });

    const app = express();
    app.use(express.json());
    app.use(actorMiddleware());
    app.post('/api/batch', dryRunMiddleware());
    app.use(
      '/api/batch',
      batchRouter(host, {
        workspaceRoot: workspace,
        editor,
        pipelineFactory: (): ValidationPipeline => new ValidationPipeline(),
        auditSink: sink,
      }),
    );

    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${String(port)}/api/batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-actor-id': 'giodl@microsoft.com',
      },
      body: JSON.stringify({
        operations: [
          { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(sink).not.toHaveBeenCalled();
  });

  it('does not emit rollback audit events on dry-run probes', async () => {
    const ir = governanceIRMultiServer();
    const { host } = makeFlakyHost(ir);
    const sink = vi.fn<RollbackAuditSink>();
    const editor = new StructuredEditor({ workspaceRoot: workspace });

    const app = express();
    app.use(express.json());
    app.use(actorMiddleware());
    app.post('/api/batch', dryRunMiddleware());
    app.use(
      '/api/batch',
      batchRouter(host, {
        workspaceRoot: workspace,
        editor,
        pipelineFactory: (): ValidationPipeline => new ValidationPipeline(),
        auditSink: sink,
      }),
    );

    server = await listen(app);
    const port = getPort(server);

    const res = await fetch(
      `http://127.0.0.1:${String(port)}/api/batch?dryRun=true`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-actor-id': 'giodl@microsoft.com',
        },
        body: JSON.stringify({
          operations: [
            { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
          ],
        }),
      },
    );

    // dry-run validates only; rollback path never fires.
    expect(res.status).toBeLessThan(500);
    expect(sink).not.toHaveBeenCalled();
  });
});
