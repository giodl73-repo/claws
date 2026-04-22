/**
 * L2 integration: `snap checkout` materializes the response's `files`
 * map onto the working tree using atomic tmp+rename writes.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { checkout } from '../../src/cli-handlers/checkout.js';
import type { CliContext } from '../../src/cli-handlers/client.js';

function stubFetch(status: number, body: unknown): typeof fetch {
  return (async (): Promise<Response> => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;
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

describe('snap checkout — writes files to working tree atomically', () => {
  it('writes every file from res.body.files onto the root', async () => {
    const root = mkdtempSync(join(tmpdir(), 'snap-checkout-write-'));
    const body = {
      id: 'sha256-x',
      files: {
        'AGENTS.md': 'agents-v2',
        'sub/nested.md': 'nested-v2',
      },
    };
    const res = await checkout(ctx(['sha256-x', '--root', root], stubFetch(200, body)));
    expect(res.exitCode).toBe(0);

    expect(readFileSync(join(root, 'AGENTS.md'), 'utf-8')).toBe('agents-v2');
    expect(readFileSync(join(root, 'sub', 'nested.md'), 'utf-8')).toBe('nested-v2');
  });

  it('clears .stage/ by default on successful checkout', async () => {
    const root = mkdtempSync(join(tmpdir(), 'snap-checkout-clear-'));
    mkdirSync(join(root, '.stage'), { recursive: true });
    writeFileSync(join(root, '.stage', 'dirty.md'), 'dirty');

    const body = { id: 'sha256-x', files: { 'AGENTS.md': 'a' } };
    await checkout(ctx(['sha256-x', '--root', root], stubFetch(200, body)));

    expect(existsSync(join(root, '.stage'))).toBe(false);
  });

  it('respects --keep-stage (does NOT clear .stage/)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'snap-checkout-keep-'));
    mkdirSync(join(root, '.stage'), { recursive: true });
    writeFileSync(join(root, '.stage', 'dirty.md'), 'dirty');

    const body = { id: 'sha256-x', files: { 'AGENTS.md': 'a' } };
    await checkout(ctx(['sha256-x', '--root', root, '--keep-stage'], stubFetch(200, body)));

    expect(existsSync(join(root, '.stage', 'dirty.md'))).toBe(true);
  });

  it('atomic write: no half-written tempfiles remain after success', async () => {
    const root = mkdtempSync(join(tmpdir(), 'snap-checkout-atomic-'));
    const body = { id: 'sha256-x', files: { 'AGENTS.md': 'a' } };
    await checkout(ctx(['sha256-x', '--root', root], stubFetch(200, body)));

    const entries = readdirSync(root);
    expect(entries.filter((e) => e.includes('.tmp-'))).toHaveLength(0);
    expect(entries).toContain('AGENTS.md');
  });
});
