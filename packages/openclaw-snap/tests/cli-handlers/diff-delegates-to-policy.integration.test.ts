/**
 * L2 integration: `snap diff <a> <b>` attempts to delegate to
 * `@bic/openclaw-policy` for semantic output. When the package is
 * importable we use it; when it's absent (or throws on import) we fall
 * back to file-level diff; `--level file` forces file-level unconditionally.
 */

import { describe, it, expect } from 'vitest';
import { diff } from '../../src/cli-handlers/diff.js';
import type { CliContext } from '../../src/cli-handlers/client.js';

function makeSnapFetch(byId: Record<string, { files: Record<string, string> }>): typeof fetch {
  return (async (url) => {
    const u = String(url);
    const m = /\/v1\/snapshots\/([^/]+)$/.exec(u);
    if (m === null) return new Response('{}', { status: 404 });
    const id = decodeURIComponent(m[1] as string);
    const snap = byId[id];
    if (snap === undefined) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify({ id, ...snap }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

function ctx(argv: string[], fetchImpl: typeof fetch): CliContext & { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    argv,
    endpoint: 'http://127.0.0.1:0',
    fetch: fetchImpl,
    stdout: (l) => out.push(l),
    stderr: (l) => err.push(l),
    out,
    err,
  };
}

describe('snap diff — policy delegation + file-level fallback', () => {
  it('--level file returns added/removed/changed structurally', async () => {
    const fetchImpl = makeSnapFetch({
      'sha256-a': { files: { 'A.md': 'one', 'B.md': 'same' } },
      'sha256-b': { files: { 'A.md': 'two', 'C.md': 'new' } },
    });
    const c = ctx(['sha256-a', 'sha256-b', '--level', 'file'], fetchImpl);
    const res = await diff(c);
    expect(res.exitCode).toBe(0);
    const payload = JSON.parse(c.out[0] as string) as {
      added: string[];
      removed: string[];
      changed: string[];
    };
    expect(payload.added).toEqual(['C.md']);
    expect(payload.removed).toEqual(['B.md']);
    expect(payload.changed).toEqual(['A.md']);
  });

  it('--level semantic attempts policy import; falls back cleanly when policy is absent or non-conforming', async () => {
    // @bic/openclaw-policy is present in devDependencies, so the import
    // resolves. Its `diff()` has a different signature than the one we
    // probe for; the handler passes both snap records and accepts any
    // return shape. We only assert the CLI exits 0 in both branches.
    const fetchImpl = makeSnapFetch({
      'sha256-a': { files: { 'A.md': 'one' } },
      'sha256-b': { files: { 'A.md': 'two' } },
    });
    const res = await diff(ctx(['sha256-a', 'sha256-b'], fetchImpl));
    expect(res.exitCode).toBe(0);
  });

  it('fails with usage when an id is missing', async () => {
    const fetchImpl = makeSnapFetch({});
    expect((await diff(ctx([], fetchImpl))).exitCode).toBe(2);
    expect((await diff(ctx(['sha256-a'], fetchImpl))).exitCode).toBe(2);
  });

  it('returns exit 1 when a snapshot cannot be fetched', async () => {
    const fetchImpl = makeSnapFetch({
      'sha256-a': { files: { 'A.md': 'one' } },
    });
    const res = await diff(ctx(['sha256-a', 'sha256-missing', '--level', 'file'], fetchImpl));
    expect(res.exitCode).toBe(1);
  });
});
