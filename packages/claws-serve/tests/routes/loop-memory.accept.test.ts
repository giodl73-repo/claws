/**
 * L3 acceptance — Scenario S09: Loop sync renders MEMORY.md sections
 * correctly and survives a full edit flow without losing or renaming
 * adjacent sections.
 *
 * Findings verified:
 *   - Sections are addressable by stable slug id
 *   - Entry counts update after a PATCH and reflect the new body
 *   - Replacement that attempts to rename a section heading is rejected
 *     so the id stays stable across edits (guard against S09 "silently
 *     renamed section" regression)
 *   - Replacement without a leading H2 is rejected (shape guard)
 *   - PATCH against a non-existent section returns 404 LOOP_MEMORY_SECTION_MISSING
 *   - Full round-trip over two independent edits leaves non-edited
 *     sections byte-for-byte identical
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
const SOUL = '# Soul\n\n## Purpose\n\n- accept\n';
const MEMORY = [
  '# Memory\n',
  '\n',
  '## Memory Index\n',
  '\n',
  '| slot | meaning |\n',
  '|------|---------|\n',
  '| feedback | corrections |\n',
  '\n',
  '## Feedback\n',
  '\n',
  '- never revert\n',
  '- never stash\n',
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
  root = await mkdtemp(join(tmpdir(), 'loop-memory-acc-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'MEMORY.md'), MEMORY, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S09 — Loop sync renders MEMORY.md sections correctly', () => {
  it('addressable sections + stable ids + rejection of rename/bad-shape + lossless adjacency', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    // 1) GET — all three sections addressable by stable slug id.
    const initial = await get(server, '/api/oc/MEMORY.md?loop=true');
    expect(initial.status).toBe(200);
    const initialBody = JSON.parse(initial.body) as LoopMemoryResponse;
    expect(initialBody.sections.map((s) => s.id)).toEqual([
      'memory-index',
      'feedback',
      'project',
    ]);

    // 2) PATCH — replace Feedback body. Entry count must update.
    const newFeedback = '## Feedback\n\n- corrected 1\n- corrected 2\n- corrected 3\n\n';
    const ok = await patch(server, '/api/oc/MEMORY.md', {
      sectionId: 'feedback',
      content: newFeedback,
    });
    expect(ok.status).toBe(200);
    const okBody = JSON.parse(ok.body) as LoopMemoryPatchResponse;
    expect(okBody.section.entryCount).toBe(3);

    // 3) Rename guard — S09 regression: replacement that attempts to
    //    change the heading must be rejected with 422 so the section id
    //    stays stable across edits. (Loop UI addresses by slug; a
    //    silent rename would orphan the Loop page binding.)
    const renamed = await patch(server, '/api/oc/MEMORY.md', {
      sectionId: 'feedback',
      content: '## Feedback Redux\n\n- x\n\n',
    });
    expect(renamed.status).toBe(422);
    const renamedErr = JSON.parse(renamed.body) as { error: { code: string } };
    expect(renamedErr.error.code).toBe('LOOP_MEMORY_VALIDATION_FAILED');

    // 4) Shape guard — replacement must start with `## Heading`.
    const noHeading = await patch(server, '/api/oc/MEMORY.md', {
      sectionId: 'feedback',
      content: '- missing heading\n',
    });
    expect(noHeading.status).toBe(422);

    // 5) Missing section — 404.
    const missing = await patch(server, '/api/oc/MEMORY.md', {
      sectionId: 'nonexistent',
      content: '## Feedback\n\n- x\n',
    });
    expect(missing.status).toBe(404);
    const missingErr = JSON.parse(missing.body) as { error: { code: string } };
    expect(missingErr.error.code).toBe('LOOP_MEMORY_SECTION_MISSING');

    // 6) Lossless adjacency — Memory Index table + Project section are
    //    byte-for-byte identical to the original input, and the rewritten
    //    Feedback sits between them in the correct order.
    const onDisk = await readFile(join(root, 'MEMORY.md'), 'utf-8');
    const expected = [
      '# Memory\n',
      '\n',
      '## Memory Index\n',
      '\n',
      '| slot | meaning |\n',
      '|------|---------|\n',
      '| feedback | corrections |\n',
      '\n',
      '## Feedback\n',
      '\n',
      '- corrected 1\n',
      '- corrected 2\n',
      '- corrected 3\n',
      '\n',
      '## Project\n',
      '\n',
      '- ra wave active\n',
    ].join('');
    expect(onDisk).toBe(expected);

    // 7) Second independent edit — Project — and re-verify full shape.
    const newProject = '## Project\n\n- ra wave complete\n\n';
    const second = await patch(server, '/api/oc/MEMORY.md', {
      sectionId: 'project',
      content: newProject,
    });
    expect(second.status).toBe(200);
    const finalDisk = await readFile(join(root, 'MEMORY.md'), 'utf-8');
    expect(finalDisk).toContain('- corrected 1');
    expect(finalDisk).toContain('- ra wave complete');
    expect(finalDisk).toContain('| feedback | corrections |');
  });
});
