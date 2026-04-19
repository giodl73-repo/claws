/**
 * L2 e2e tests for POST /api/batch.
 *
 * Boots the full serve daemon against a real workspace and drives two
 * end-to-end scenarios over the HTTP boundary:
 *   1. multi-operation batch → verify all operations applied on disk
 *   2. batch with a failing operation → verify rollback restored every file
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BatchResult } from '@bic/claws-sdk/workspace-edit';
import { createApp, type ServerState } from '../../src/server.js';
import { governanceIRMultiServer } from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nBatch e2e.\n\n## Purpose\n\n- run\n';
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
  root = await mkdtemp(join(tmpdir(), 'batch-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), TOOLS_MD, 'utf-8');
  await writeFile(join(root, 'SETTINGS.md'), SETTINGS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('POST /api/batch — L2 e2e', () => {
  it('applies a multi-operation batch and reflects every edit on disk', async () => {
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
        { kind: 'toggle', file: 'TOOLS.md', section: 'send_mail', field: 'enabled', value: false },
        { kind: 'set', file: 'SETTINGS.md', section: 'preferences', field: 'language', value: 'fr' },
      ],
    });

    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as BatchResult;
    expect(body.committed).toBe(true);
    expect(body.results.map((r) => r.index)).toEqual([0, 1, 2]);

    const tools = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    const settings = await readFile(join(root, 'SETTINGS.md'), 'utf-8');
    expect(tools).toContain('## read_inbox\n\n- enabled: false');
    expect(tools).toContain('## send_mail\n\n- enabled: false');
    expect(settings).toContain('- language: fr');
  });

  it('rolls the workspace back when a mid-batch operation fails', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const toolsHashBefore = hash(await readFile(join(root, 'TOOLS.md'), 'utf-8'));
    const settingsHashBefore = hash(await readFile(join(root, 'SETTINGS.md'), 'utf-8'));

    const res = await postJson(server, '/api/batch', {
      operations: [
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        { kind: 'set', file: 'SETTINGS.md', section: 'preferences', field: 'language', value: 'de' },
        // Section does not exist → StructuredEditor.apply fails → rollback.
        { kind: 'toggle', file: 'TOOLS.md', section: 'no_such_tool', field: 'enabled', value: false },
      ],
    });

    expect(res.status).toBe(500);
    const body = JSON.parse(res.body) as BatchResult;
    expect(body.committed).toBe(false);
    expect(body.rollback?.triggered).toBe(true);

    const toolsHashAfter = hash(await readFile(join(root, 'TOOLS.md'), 'utf-8'));
    const settingsHashAfter = hash(await readFile(join(root, 'SETTINGS.md'), 'utf-8'));
    expect(toolsHashAfter).toBe(toolsHashBefore);
    expect(settingsHashAfter).toBe(settingsHashBefore);
  });
});
