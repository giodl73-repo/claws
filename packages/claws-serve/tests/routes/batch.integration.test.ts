/**
 * L1 integration tests for POST /api/batch.
 *
 * Exercises the full route pipeline against the real SDK:
 *   - express.json() body parsing
 *   - real BatchExecutor + StructuredEditor + ValidationPipeline
 *   - CompilationHost.compile (drives the single-recompile invariant)
 *
 * Four cases pin the core multi-file / rollback / dry-run / recompile
 * behaviours that the unit tests stub out.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { BatchResult } from '@bic/claws-sdk/workspace-edit';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import { governanceIRMultiServer } from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nBatch integration.\n\n## Purpose\n\n- batch\n';
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

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function postJson(
  server: Server,
  path: string,
  body: unknown,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const payload = JSON.stringify(body);
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
    },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

function hash(s: string): string {
  return createHash('sha256').update(s, 'utf-8').digest('hex');
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'batch-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), TOOLS_MD, 'utf-8');
  await writeFile(join(root, 'SETTINGS.md'), SETTINGS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('POST /api/batch — L1 integration', () => {
  it('applies edits across multiple OC files atomically', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await postJson(server, '/api/batch', {
      operations: [
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        { kind: 'set', file: 'SETTINGS.md', section: 'preferences', field: 'language', value: 'fr' },
      ],
    });

    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as BatchResult;
    expect(body.committed).toBe(true);
    expect(body.results).toHaveLength(2);

    const tools = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    const settings = await readFile(join(root, 'SETTINGS.md'), 'utf-8');
    // read_inbox was flipped; send_mail is untouched.
    expect(tools).toContain('## read_inbox\n\n- enabled: false');
    expect(tools).toContain('## send_mail\n\n- enabled: true');
    expect(settings).toContain('- language: fr');
  });

  it('rolls back every file when an apply step fails mid-batch', async () => {
    // Build an IR that lets the first op validate but causes the second
    // op's StructuredEditor.apply to fail by targeting a section that
    // does not exist in TOOLS.md. Lossless writer raises EditTargetError
    // which StructuredEditor surfaces as a non-success result.
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const toolsBefore = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    const settingsBefore = await readFile(join(root, 'SETTINGS.md'), 'utf-8');
    const toolsHashBefore = hash(toolsBefore);
    const settingsHashBefore = hash(settingsBefore);

    const res = await postJson(server, '/api/batch', {
      operations: [
        // Valid: flips on disk.
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        // Invalid: section does not exist — apply fails, whole batch rolls back.
        { kind: 'toggle', file: 'TOOLS.md', section: 'no_such_tool', field: 'enabled', value: false },
      ],
    });

    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as BatchResult;
    expect(body.committed).toBe(false);
    expect(body.rollback?.triggered).toBe(true);

    const toolsAfter = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    const settingsAfter = await readFile(join(root, 'SETTINGS.md'), 'utf-8');
    expect(hash(toolsAfter)).toBe(toolsHashBefore);
    expect(hash(settingsAfter)).toBe(settingsHashBefore);
  });

  it('previews a mixed batch under dryRun without writing', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const toolsHashBefore = hash(await readFile(join(root, 'TOOLS.md'), 'utf-8'));

    const res = await postJson(server, '/api/batch?dryRun=true', {
      operations: [
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        { kind: 'toggle', file: 'TOOLS.md', section: 'send_mail', field: 'enabled', value: false },
      ],
    });

    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as BatchResult;
    expect(body.committed).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.results).toHaveLength(2);

    const toolsAfter = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(hash(toolsAfter)).toBe(toolsHashBefore);
  });

  it('triggers a single recompilation for the whole batch', async () => {
    let compileCalls = 0;
    const ir: GovernanceIR = governanceIRMultiServer();
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => {
        compileCalls += 1;
        return ir;
      },
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    // Drop the pre-batch compile from the count so the assertion reflects
    // only compiles attributable to the batch request itself: one for IR
    // resolution ahead of validation, one for post-batch recompile. The
    // key invariant is "not N per op" — we send 3 ops and expect 2, not 4.
    const preBatchCompiles = compileCalls;

    const res = await postJson(server, '/api/batch', {
      operations: [
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        { kind: 'toggle', file: 'TOOLS.md', section: 'send_mail', field: 'enabled', value: false },
        { kind: 'set', file: 'SETTINGS.md', section: 'preferences', field: 'language', value: 'fr' },
      ],
    });

    expect(res.status).toBe(200);
    // 1 pre-validate compile + 1 post-apply recompile = 2 additional calls,
    // regardless of the 3 ops in the batch.
    expect(compileCalls - preBatchCompiles).toBe(2);
  });
});
