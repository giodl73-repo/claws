/**
 * L2 end-to-end: boot the full claws-serve app with a live compile fn,
 * write a multi-section MEMORY.md to disk, and exercise the full
 * parse -> PATCH -> re-read round-trip through the `/api/oc` prefix so
 * we prove the loop-memory router mounts correctly AND cohabits with
 * the generic Layer 1 router (Pulse 27).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, type ServerState } from '../../src/server.js';
import type {
  LoopMemoryPatchResponse,
  LoopMemoryResponse,
} from '../../src/routes/loop-memory.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\n## Purpose\n\n- e2e\n';
const MEMORY = [
  '# Memory\n',
  '\n',
  '## Feedback\n',
  '\n',
  '- original finding\n',
  '\n',
  '## Project\n',
  '\n',
  '- ra wave active\n',
].join('');

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(server: Server, path: string): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

async function patch(
  server: Server,
  path: string,
  body: unknown,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loop-memory-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'MEMORY.md'), MEMORY, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('loop-memory — L2 e2e', () => {
  it('round-trips MEMORY.md parse + section edit through /api/oc', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    // 1) GET ?loop=true — initial snapshot, 2 sections with entry counts.
    const initial = await get(server, '/api/oc/MEMORY.md?loop=true');
    expect(initial.status).toBe(200);
    const initialBody = JSON.parse(initial.body) as LoopMemoryResponse;
    expect(initialBody.sections).toHaveLength(2);
    expect(initialBody.sections[0]!.id).toBe('feedback');
    expect(initialBody.sections[0]!.entryCount).toBe(1);

    // 2) PATCH — rewrite Feedback with three entries.
    const replacement = '## Feedback\n\n- A\n- B\n- C\n\n';
    const patched = await patch(server, '/api/oc/MEMORY.md', {
      sectionId: 'feedback',
      content: replacement,
    });
    expect(patched.status).toBe(200);
    const patchedBody = JSON.parse(patched.body) as LoopMemoryPatchResponse;
    expect(patchedBody.section.entryCount).toBe(3);

    // 3) Re-read — disk reflects the rewrite, Project is untouched, round-trip is lossless.
    const reread = await get(server, '/api/oc/MEMORY.md?loop=true');
    expect(reread.status).toBe(200);
    const rereadBody = JSON.parse(reread.body) as LoopMemoryResponse;
    expect(rereadBody.sections[0]!.entryCount).toBe(3);
    expect(rereadBody.sections[1]!.id).toBe('project');
    expect(rereadBody.sections[1]!.entryCount).toBe(1);

    const onDisk = await readFile(join(root, 'MEMORY.md'), 'utf-8');
    expect(onDisk).toBe(
      '# Memory\n\n## Feedback\n\n- A\n- B\n- C\n\n## Project\n\n- ra wave active\n',
    );

    // 4) GET without ?loop=true — falls through to generic Layer 1
    //    router (Pulse 27) so existing partners see no behavioural change.
    const generic = await get(server, '/api/oc/MEMORY.md');
    expect(generic.status).toBe(200);
    const genericBody = JSON.parse(generic.body) as { file: string; raw: string };
    expect(genericBody.file).toBe('MEMORY.md');
    expect(genericBody.raw).toContain('- A');
  });
});
