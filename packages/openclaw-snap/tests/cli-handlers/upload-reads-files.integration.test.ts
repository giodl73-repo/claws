/**
 * L2 integration: `snap upload` reads workspace files (staged + canonical)
 * via `@bic/openclaw-workspace/staging.readStagedOrCanonical` and sends
 * the full file map in the POST body.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { upload } from '../../src/cli-handlers/upload.js';
import type { CliContext } from '../../src/cli-handlers/client.js';

function makeCapturingFetch(): { fetch: typeof fetch; bodies: unknown[] } {
  const bodies: unknown[] = [];
  const impl: typeof fetch = (async (_url, init) => {
    const body: unknown = init?.body === undefined
      ? undefined
      : JSON.parse(String(init.body));
    bodies.push(body);
    return new Response(JSON.stringify({ id: 'sha256-xyz', status: 'draft' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { fetch: impl, bodies };
}

function ctx(argv: string[], fetchImpl: typeof fetch): CliContext {
  return {
    argv,
    endpoint: 'http://127.0.0.1:0',
    fetch: fetchImpl,
    stdout: () => {},
    stderr: () => {},
  };
}

describe('snap upload — reads staged + canonical files', () => {
  it('POSTs a body containing all 3 canonical files', async () => {
    const root = mkdtempSync(join(tmpdir(), 'snap-upload-canonical-'));
    writeFileSync(join(root, 'AGENTS.md'), 'agents');
    writeFileSync(join(root, 'MEMORY.md'), 'memory');
    writeFileSync(join(root, 'SOUL.md'), 'soul');

    const { fetch: fetchImpl, bodies } = makeCapturingFetch();
    const res = await upload(ctx(['--files', root], fetchImpl));

    expect(res.exitCode).toBe(0);
    expect(bodies).toHaveLength(1);
    const posted = bodies[0] as { files: Record<string, string>; snapshotId: string };
    expect(Object.keys(posted.files).sort()).toEqual(['AGENTS.md', 'MEMORY.md', 'SOUL.md']);
    expect(posted.files['AGENTS.md']).toBe('agents');
    expect(posted.files['MEMORY.md']).toBe('memory');
    expect(posted.files['SOUL.md']).toBe('soul');
    expect(posted.snapshotId).toMatch(/^sha256-/);
  });

  it('staged content overrides canonical for the same path', async () => {
    const root = mkdtempSync(join(tmpdir(), 'snap-upload-staged-'));
    writeFileSync(join(root, 'AGENTS.md'), 'old');
    mkdirSync(join(root, '.stage'), { recursive: true });
    writeFileSync(join(root, '.stage', 'AGENTS.md'), 'new');

    const { fetch: fetchImpl, bodies } = makeCapturingFetch();
    const res = await upload(ctx(['--files', root], fetchImpl));

    expect(res.exitCode).toBe(0);
    const posted = bodies[0] as { files: Record<string, string> };
    expect(posted.files['AGENTS.md']).toBe('new');
    // .stage/ prefix must not leak into the snapshot key set
    expect(Object.keys(posted.files)).not.toContain('.stage/AGENTS.md');
  });

  it('clears .stage/ on 201 response', async () => {
    const root = mkdtempSync(join(tmpdir(), 'snap-upload-clear-'));
    writeFileSync(join(root, 'AGENTS.md'), 'a');
    mkdirSync(join(root, '.stage'), { recursive: true });
    writeFileSync(join(root, '.stage', 'AGENTS.md'), 'b');

    const { fetch: fetchImpl } = makeCapturingFetch();
    await upload(ctx(['--files', root], fetchImpl));

    expect(existsSync(join(root, '.stage'))).toBe(false);
  });
});
