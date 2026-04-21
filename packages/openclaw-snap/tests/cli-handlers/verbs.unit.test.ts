/**
 * CLI verb coverage — exercise each handler with a stub fetch so every
 * branch (happy path, HTTP error, missing args) is touched.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { status } from '../../src/cli-handlers/status.js';
import { list } from '../../src/cli-handlers/list.js';
import { upload } from '../../src/cli-handlers/upload.js';
import { checkout } from '../../src/cli-handlers/checkout.js';
import { promote } from '../../src/cli-handlers/promote.js';
import { rollback } from '../../src/cli-handlers/rollback.js';
import { serve } from '../../src/cli-handlers/serve.js';
import { diffStaged } from '../../src/cli-handlers/diffStaged.js';
import type { CliContext } from '../../src/cli-handlers/client.js';

function stubFetch(status: number, body: unknown): typeof fetch {
  return (async (): Promise<Response> => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;
}

function ctx(argv: string[], fetchImpl?: typeof fetch): CliContext {
  const out: string[] = [];
  const err: string[] = [];
  return {
    argv,
    endpoint: 'http://127.0.0.1:0',
    ...(fetchImpl !== undefined ? { fetch: fetchImpl } : {}),
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
  };
}

let tmpRoot: string;

function freshWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'snap-verbs-'));
  writeFileSync(join(root, 'AGENTS.md'), 'agents-content');
  return root;
}

beforeEach(() => {
  if (tmpRoot !== undefined && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
});

describe('cli-handlers verbs — coverage', () => {
  it('status happy + failure', async () => {
    expect((await status(ctx([], stubFetch(200, [])))).exitCode).toBe(0);
    expect((await status(ctx([], stubFetch(500, {})))).exitCode).toBe(1);
  });

  it('list happy + failure', async () => {
    expect((await list(ctx([], stubFetch(200, [])))).exitCode).toBe(0);
    expect((await list(ctx([], stubFetch(500, {})))).exitCode).toBe(1);
  });

  it('upload happy + failure + usage + custom idempotency key', async () => {
    tmpRoot = freshWorkspace();
    expect((await upload(ctx(['--files', tmpRoot], stubFetch(201, { id: 'sha256-a' })))).exitCode).toBe(0);

    tmpRoot = freshWorkspace();
    expect((await upload(ctx(['--files', tmpRoot], stubFetch(400, {})))).exitCode).toBe(1);

    expect((await upload(ctx([]))).exitCode).toBe(2);

    tmpRoot = freshWorkspace();
    expect(
      (await upload(
        ctx(['--files', tmpRoot, '--idempotency-key', 'custom'], stubFetch(201, { id: 'x' })),
      )).exitCode,
    ).toBe(0);
  });

  it('checkout happy + failure + usage + response-shape guard', async () => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'snap-checkout-'));
    const fetchOk = stubFetch(200, { id: 'sha256-a', files: { 'A.md': 'alpha' } });
    expect((await checkout(ctx(['sha256-a', '--root', tmpRoot], fetchOk))).exitCode).toBe(0);
    expect(readFileSync(join(tmpRoot, 'A.md'), 'utf-8')).toBe('alpha');

    expect((await checkout(ctx(['sha256-a'], stubFetch(404, {})))).exitCode).toBe(1);

    // Body without .files -> exit 1 (guard path)
    expect((await checkout(ctx(['sha256-a'], stubFetch(200, { id: 'x' })))).exitCode).toBe(1);

    expect((await checkout(ctx([]))).exitCode).toBe(2);

    // --keep-stage path
    tmpRoot = mkdtempSync(join(tmpdir(), 'snap-checkout-ks-'));
    mkdirSync(join(tmpRoot, '.stage'), { recursive: true });
    writeFileSync(join(tmpRoot, '.stage', 'dirty.md'), 'dirty');
    const fetchOk2 = stubFetch(200, { id: 'sha256-a', files: { 'A.md': 'a' } });
    expect(
      (await checkout(ctx(['sha256-a', '--root', tmpRoot, '--keep-stage'], fetchOk2))).exitCode,
    ).toBe(0);
    expect(existsSync(join(tmpRoot, '.stage', 'dirty.md'))).toBe(true);
  });

  it('promote happy + failure + usage + custom key', async () => {
    expect((await promote(ctx(['sha256-a'], stubFetch(200, {})))).exitCode).toBe(0);
    expect((await promote(ctx(['sha256-a'], stubFetch(409, {})))).exitCode).toBe(1);
    expect((await promote(ctx([]))).exitCode).toBe(2);
    expect((await promote(ctx(['sha256-a', '--idempotency-key', 'k'], stubFetch(200, {})))).exitCode).toBe(0);
  });

  it('rollback happy + failure + usage + custom key', async () => {
    expect((await rollback(ctx(['sha256-a'], stubFetch(200, {})))).exitCode).toBe(0);
    expect((await rollback(ctx(['sha256-a'], stubFetch(404, {})))).exitCode).toBe(1);
    expect((await rollback(ctx([]))).exitCode).toBe(2);
    expect((await rollback(ctx(['sha256-a', '--idempotency-key', 'k'], stubFetch(200, {})))).exitCode).toBe(0);
  });

  it('serve with default and explicit ports', async () => {
    expect((await serve(ctx([]))).exitCode).toBe(0);
    expect((await serve(ctx(['--port', '9999']))).exitCode).toBe(0);
    expect((await serve(ctx(['--port', '-1']))).exitCode).toBe(2);
  });

  it('diffStaged requires --staged', async () => {
    expect((await diffStaged(ctx([]))).exitCode).toBe(2);
    expect((await diffStaged(ctx(['--staged']))).exitCode).toBe(0);
  });
});
