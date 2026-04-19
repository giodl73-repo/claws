/**
 * L2 e2e test for dry-run PATCH — boots the full serve daemon against a
 * real workspace, issues a dry-run PATCH through `fetch()`, and verifies:
 *   - response shape (dryRun, valid, governance envelope)
 *   - file hash is unchanged after the request
 *   - a subsequent real PATCH still succeeds (dry-run left no state)
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, type ServerState } from '../../src/server.js';
import { governanceIRMultiServer } from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nDry-run e2e.\n\n## Purpose\n\n- write\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
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

function hash(s: string): string {
  return createHash('sha256').update(s, 'utf-8').digest('hex');
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'dryrun-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('PATCH /api/chunks/:tab?dryRun=true — L2 e2e', () => {
  it('round-trips a dry-run PATCH and leaves the workspace untouched', async () => {
    const tools = `# Tools

## read_inbox

- enabled: true
- description: Read inbox
`;
    await writeFile(join(root, 'TOOLS.md'), tools, 'utf-8');
    const hashBefore = hash(await readFile(join(root, 'TOOLS.md'), 'utf-8'));

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const dryRes = await patch(server, '/api/chunks/connections?dryRun=true', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    });

    expect(dryRes.status).toBe(200);
    const dryBody = JSON.parse(dryRes.body) as {
      dryRun: true;
      valid: true;
      governance: { warnings: unknown[]; errors: unknown[]; estimatedRecompileMs: number };
    };
    expect(dryBody.dryRun).toBe(true);
    expect(dryBody.valid).toBe(true);
    expect(dryBody.governance).toBeDefined();
    expect(Array.isArray(dryBody.governance.warnings)).toBe(true);
    expect(Array.isArray(dryBody.governance.errors)).toBe(true);
    expect(typeof dryBody.governance.estimatedRecompileMs).toBe('number');

    const hashAfterDry = hash(await readFile(join(root, 'TOOLS.md'), 'utf-8'));
    expect(hashAfterDry).toBe(hashBefore);

    // A subsequent real PATCH still succeeds — dry-run left no residue.
    const realRes = await patch(server, '/api/chunks/connections', {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    });
    expect(realRes.status).toBe(200);
    const afterReal = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(afterReal).toContain('- enabled: false');
  });
});
