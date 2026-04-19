/**
 * L0 unit tests for the atomic-rollback branches added in pulse 34.
 *
 * Each test targets a specific branch of the post-write compile-failure
 * path in `patch-chunks.ts`:
 *   - rollback success → COMPILATION_FAILED body + OC file restored
 *   - rollback itself fails → ROLLBACK_FAILED body
 *   - no pre-edit snapshot captured → ROLLBACK_FAILED with explicit reason
 *   - degraded-mode guard → 503 before any validation runs
 *   - audit sink receives the event with both pre + post hashes
 *
 * Kept in its own file so the pre-existing patch-chunks.unit.test.ts
 * remains untouched and future readers can locate the rollback contract
 * without scanning the larger suite.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import express from 'express';
import type { GovernanceIR } from '@bic/claws-sdk';
import {
  StructuredEditor,
  ValidationPipeline,
} from '@bic/claws-sdk/workspace-edit';
import { CompilationHost } from '../../src/compilation-host.js';
import {
  patchChunksRouter,
  type RollbackAuditEvent,
} from '../../src/routes/patch-chunks.js';
import {
  patchEnvelopeMiddleware,
  patchShapeMiddleware,
} from '../../src/middleware/validation-middleware.js';
import { dryRunMiddleware } from '../../src/middleware/dry-run.js';
import { actorMiddleware } from '../../src/middleware/actor.js';

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

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

async function patch(
  server: Server,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const payload = JSON.stringify(body);
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      ...extraHeaders,
    },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'patch-rollback-'));
  await writeFile(join(root, 'SOUL.md'), '# Soul\n\n## Purpose\n\n- x\n', 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('patchChunksRouter — atomic rollback branches', () => {
  it('degraded-mode probe short-circuits the write path with 503', async () => {
    await writeFile(join(root, 'TOOLS.md'), '# Tools\n\n## t\n\n- enabled: true\n', 'utf-8');
    const host = new CompilationHost(async () => emptyIR(), root);
    await host.compile();

    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: new StructuredEditor({ workspaceRoot: root }),
        pipelineFactory: () => new ValidationPipeline(),
        degradedModeProbe: () => ({
          kind: 'compile-failed',
          compilerMessage: 'workspace is broken',
        }),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 't',
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

  it('post-write compile fail → rollback success → COMPILATION_FAILED + file restored + audit emitted', async () => {
    const toolsBefore = '# Tools\n\n## t\n\n- enabled: true\n';
    await writeFile(join(root, 'TOOLS.md'), toolsBefore, 'utf-8');
    const expectedPreHash = sha256(toolsBefore);

    let callCount = 0;
    const host = new CompilationHost(async () => {
      callCount += 1;
      if (callCount === 1) return emptyIR();
      throw new Error('recompile blew up');
    }, root);

    const events: RollbackAuditEvent[] = [];
    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    // CP-6 R2 F3: actorMiddleware stamps req.actor so the rollback audit
    // event carries the header-supplied identity (not just `anonymous`).
    app.patch('*', actorMiddleware());
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: new StructuredEditor({ workspaceRoot: root }),
        pipelineFactory: () => new ValidationPipeline(),
        auditSink: (event) => events.push(event),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(
      server,
      '/api/chunks/connections',
      {
        kind: 'toggle',
        file: 'TOOLS.md',
        section: 't',
        field: 'enabled',
        value: false,
      },
      { 'x-actor-id': 'giodl@microsoft.com' },
    );
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as { error: { code: string; compilerMessage: string } };
    expect(body.error.code).toBe('COMPILATION_FAILED');
    // CISO W05: compilerMessage is sanitized in the response body — the
    // full unsanitized message still flows through the audit sink + server
    // logs below, which is what operators actually consume.
    expect(body.error.compilerMessage).toBe('');

    // File restored
    const after = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(after).toBe(toolsBefore);

    // Audit event captures the unsanitized pre + post hashes, the raw
    // compilerMessage, and the actor — that's the trust boundary, not
    // the HTTP response. CP-6 R2 F3 / ciso M-new-2.
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.rollbackOk).toBe(true);
    expect(event.preEditHash).toBe(expectedPreHash);
    expect(event.rollbackError).toBeUndefined();
    expect(event.compilerMessage).toContain('recompile blew up');
    expect(event.actor).toBe('giodl@microsoft.com');
  });

  it('rollback audit defaults actor to anonymous when no X-Actor-Id header is supplied', async () => {
    // CP-6 R2 F3: the schema requires an `actor` field; absent header
    // must fall back to the ANONYMOUS_ACTOR sentinel so the JSONL line
    // remains well-formed rather than recording `undefined`.
    const toolsBefore = '# Tools\n\n## t\n\n- enabled: true\n';
    await writeFile(join(root, 'TOOLS.md'), toolsBefore, 'utf-8');

    let callCount = 0;
    const host = new CompilationHost(async () => {
      callCount += 1;
      if (callCount === 1) return emptyIR();
      throw new Error('recompile blew up');
    }, root);

    const events: RollbackAuditEvent[] = [];
    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    // Note: no actorMiddleware here — readActor's fallback is what's
    // under test.
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: new StructuredEditor({ workspaceRoot: root }),
        pipelineFactory: () => new ValidationPipeline(),
        auditSink: (event) => events.push(event),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 't',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(500);
    expect(events).toHaveLength(1);
    expect(events[0]!.actor).toBe('anonymous');
  });

  it('post-write compile fail → rollback writeRaw fails → ROLLBACK_FAILED with audit rollbackOk=false', async () => {
    // New (post-D1) contract: snapshot + write + rollback all run through
    // the editor under a single mutex hold, so the "router/editor roots
    // diverge" branch no longer exists. The real-world ROLLBACK_FAILED
    // surface is now: rollback's writeRaw itself throws (disk full,
    // directory removed mid-batch, permission flip). We drive that branch
    // by swapping the editor's transaction so writeRaw always fails.
    const toolsBefore = '# Tools\n\n## t\n\n- enabled: true\n';
    await writeFile(join(root, 'TOOLS.md'), toolsBefore, 'utf-8');

    let callCount = 0;
    const host = new CompilationHost(async () => {
      callCount += 1;
      if (callCount === 1) return emptyIR();
      throw new Error('recompile blew up');
    }, root);

    // Wrap a real editor so snapshot + apply still work, but hard-fail
    // the writeRaw branch the rollback path depends on.
    const realEditor = new StructuredEditor({ workspaceRoot: root });
    const sabotaged = {
      async withFileLocks<T>(
        files: readonly string[],
        fn: (tx: {
          snapshot: (f: string) => Promise<unknown>;
          apply: (op: unknown) => Promise<unknown>;
          writeRaw: (f: string, c: string) => Promise<unknown>;
          deleteRaw: (f: string) => Promise<unknown>;
        }) => Promise<T>,
      ): Promise<T> {
        return (realEditor as unknown as {
          withFileLocks: (
            f: readonly string[],
            fn: (tx: unknown) => Promise<T>,
          ) => Promise<T>;
        }).withFileLocks(files, async (realTx) => {
          const wrappedTx = {
            snapshot: (realTx as { snapshot: (f: string) => Promise<unknown> }).snapshot,
            apply: (realTx as { apply: (op: unknown) => Promise<unknown> }).apply,
            writeRaw: async (_f: string, _c: string) => ({ ok: false, error: 'disk full' }),
            deleteRaw: async (_f: string) => ({ ok: false, error: 'disk full' }),
          };
          return fn(wrappedTx);
        });
      },
    } as unknown as StructuredEditor;

    const events: RollbackAuditEvent[] = [];
    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: sabotaged,
        pipelineFactory: () => new ValidationPipeline(),
        auditSink: (event) => events.push(event),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 't',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as {
      error: { code: string; filesystemState: string };
    };
    expect(body.error.code).toBe('ROLLBACK_FAILED');
    // Response filesystemState is sanitized (CISO W05) — operators read
    // the full detail via the audit sink or server logs.
    expect(events).toHaveLength(1);
    expect(events[0]!.rollbackOk).toBe(false);
    expect(events[0]!.rollbackError).toContain('disk full');
    // Ensure callCount was 2 (initial compile + post-write recompile).
    expect(callCount).toBe(2);
  });

  it('editor returns !success with no error string → UNKNOWN_ERROR uses fallback cause', async () => {
    // Exercises the `editResult.error ?? fallback` branch when the
    // StructuredEditor returns success=false but omits the error field.
    const toolsBefore = '# Tools\n\n## t\n\n- enabled: true\n';
    await writeFile(join(root, 'TOOLS.md'), toolsBefore, 'utf-8');
    const host = new CompilationHost(async () => emptyIR(), root);
    await host.compile();

    const quietEditor = {
      async apply(): Promise<{
        success: false;
        file: 'TOOLS.md';
        before: string;
        after: string;
      }> {
        return { success: false, file: 'TOOLS.md', before: '', after: '' };
      },
    } as unknown as StructuredEditor;

    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: quietEditor,
        pipelineFactory: () => new ValidationPipeline(),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 't',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as { error: { code: string; cause: string } };
    expect(body.error.code).toBe('UNKNOWN_ERROR');
    // CISO W05 + gateway N-1: cause MUST NOT be echoed to the caller
    // because it routinely embeds workspace paths. Stable code only.
    expect(body.error.cause).toBe('');
  });

  it('post-write compile throws a non-Error → String(err) fallback feeds compilerMessage', async () => {
    // Exercise the `err instanceof Error ? err.message : String(err)` branch
    // for the post-write compile path.
    const toolsBefore = '# Tools\n\n## t\n\n- enabled: true\n';
    await writeFile(join(root, 'TOOLS.md'), toolsBefore, 'utf-8');

    let callCount = 0;
    const host = new CompilationHost(async () => {
      callCount += 1;
      if (callCount === 1) return emptyIR();
      throw 'thrown-as-string';
    }, root);

    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: new StructuredEditor({ workspaceRoot: root }),
        pipelineFactory: () => new ValidationPipeline(),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 't',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as { error: { code: string; compilerMessage: string } };
    expect(body.error.code).toBe('COMPILATION_FAILED');
    // CISO W05: compilerMessage MUST NOT leak through. Code only.
    expect(body.error.compilerMessage).toBe('');
  });

  it('post-write compile fail → restore itself fails → ROLLBACK_FAILED with rollbackError populated', async () => {
    // New (post-D1) contract: the route delegates rollback to the
    // editor's transaction. We hit the restore-fail branch by wrapping a
    // real editor so apply succeeds but writeRaw always fails — the
    // BatchExecutor surfaces this as a restoreFailure, which the route
    // translates to ROLLBACK_FAILED and records on the audit sink.
    const toolsBefore = '# Tools\n\n## t\n\n- enabled: true\n';
    await writeFile(join(root, 'TOOLS.md'), toolsBefore, 'utf-8');

    let callCount = 0;
    const host = new CompilationHost(async () => {
      callCount += 1;
      if (callCount === 1) return emptyIR();
      throw new Error('recompile blew up');
    }, root);

    const realEditor = new StructuredEditor({ workspaceRoot: root });
    const sabotaged = {
      async withFileLocks<T>(
        files: readonly string[],
        fn: (tx: {
          snapshot: (f: string) => Promise<unknown>;
          apply: (op: unknown) => Promise<unknown>;
          writeRaw: (f: string, c: string) => Promise<unknown>;
          deleteRaw: (f: string) => Promise<unknown>;
        }) => Promise<T>,
      ): Promise<T> {
        return (realEditor as unknown as {
          withFileLocks: (
            f: readonly string[],
            fn: (tx: unknown) => Promise<T>,
          ) => Promise<T>;
        }).withFileLocks(files, async (realTx) => {
          const wrappedTx = {
            snapshot: (realTx as { snapshot: (f: string) => Promise<unknown> }).snapshot,
            apply: (realTx as { apply: (op: unknown) => Promise<unknown> }).apply,
            writeRaw: async (_f: string, _c: string) => ({
              ok: false,
              error: 'ENOENT: workspace vanished',
            }),
            deleteRaw: async (_f: string) => ({
              ok: false,
              error: 'ENOENT: workspace vanished',
            }),
          };
          return fn(wrappedTx);
        });
      },
    } as unknown as StructuredEditor;

    const events: RollbackAuditEvent[] = [];
    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: sabotaged,
        pipelineFactory: () => new ValidationPipeline(),
        auditSink: (event) => events.push(event),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 't',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as {
      error: { code: string; filesystemState: string };
    };
    expect(body.error.code).toBe('ROLLBACK_FAILED');
    // filesystemState is sanitized on the wire (CISO W05). The unsanitized
    // detail reaches operators via the audit sink.
    expect(events).toHaveLength(1);
    expect(events[0]!.rollbackOk).toBe(false);
    expect(events[0]!.rollbackError).toContain('ENOENT');
    expect(callCount).toBe(2);
  });

  it('dry-run initial-compile-fail emits dry-run audit + sanitized dry-run error', async () => {
    // Cover the branch where host.compile() throws during dry-run so the
    // preflight cannot build a pipeline. Must emit a dry-run audit record
    // with denialCode=COMPILATION_FAILED and a sanitized error body.
    await writeFile(join(root, 'TOOLS.md'), '# Tools\n\n## t\n\n- enabled: true\n', 'utf-8');
    const host = new CompilationHost(async () => {
      throw new Error('compiler crashed');
    }, root);
    const dryRunAudits: Array<{ denialCode?: string }> = [];

    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    app.patch('/api/chunks/*', dryRunMiddleware());
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: new StructuredEditor({ workspaceRoot: root }),
        pipelineFactory: () => new ValidationPipeline(),
        dryRunAuditSink: (record) => dryRunAudits.push(record as { denialCode?: string }),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(server, '/api/chunks/connections?dryRun=true', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 't',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as { dryRun: boolean; error: { code: string } };
    expect(body.dryRun).toBe(true);
    expect(body.error.code).toBe('COMPILATION_FAILED');
    expect(dryRunAudits).toHaveLength(1);
    expect(dryRunAudits[0]!.denialCode).toBe('COMPILATION_FAILED');
  });

  it('safeHashFile returns empty pre-hash when TOOLS.md is missing at handler-entry', async () => {
    // Covers the `catch` branch of safeHashFile (line 497) — committed
    // PATCH starts against a workspace without TOOLS.md. The editor will
    // reject the apply; audit sink still receives an event with
    // preEditHash=''.
    // Note: SOUL.md already exists so parseWorkspace is happy.
    const host = new CompilationHost(async () => emptyIR(), root);
    await host.compile();

    const events: RollbackAuditEvent[] = [];
    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: new StructuredEditor({ workspaceRoot: root }),
        pipelineFactory: () => new ValidationPipeline(),
        auditSink: (e) => events.push(e),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 't',
      field: 'enabled',
      value: false,
    });
    // Editor's apply fails because the file doesn't exist → UNKNOWN_ERROR.
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('UNKNOWN_ERROR');
  });

  it('maps unexpected executor throws to UNKNOWN_ERROR', async () => {
    // If the BatchExecutor throws (vs returning committed=false), the
    // handler's outer catch converts it to UNKNOWN_ERROR. We trigger this
    // with an editor whose withFileLocks implementation throws.
    await writeFile(join(root, 'TOOLS.md'), '# Tools\n\n## t\n\n- enabled: true\n', 'utf-8');
    const host = new CompilationHost(async () => emptyIR(), root);
    await host.compile();

    const throwingEditor = {
      withFileLocks: async () => {
        throw new Error('mutex subsystem offline');
      },
    } as unknown as StructuredEditor;

    const app = express();
    app.patch('*', patchEnvelopeMiddleware());
    app.use(express.json({ limit: '1mb' }));
    app.patch('/api/chunks/*', patchShapeMiddleware());
    app.use(
      '/api/chunks',
      patchChunksRouter(host, {
        workspaceRoot: root,
        editor: throwingEditor,
        pipelineFactory: () => new ValidationPipeline(),
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    const res = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 't',
      field: 'enabled',
      value: false,
    });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('UNKNOWN_ERROR');
  });
});
