/**
 * L2 E2E: exit-code coverage for all 11 `claws snap <verb>` handlers.
 *
 * The snap HTTP surface is stubbed via ctx.fetch; these tests assert the
 * handler exits 0 (happy path) with well-formed argv. Error paths are
 * already covered in verbs.unit.test.ts; this suite is the conformance
 * gate for the pulse 58 deliverable (11 verbs green E2E).
 */

import { describe, it, expect } from 'vitest';
import { stage } from '../../src/cli-handlers/stage.js';
import { status } from '../../src/cli-handlers/status.js';
import { diffStaged } from '../../src/cli-handlers/diffStaged.js';
import { discardStage } from '../../src/cli-handlers/discardStage.js';
import { upload } from '../../src/cli-handlers/upload.js';
import { list } from '../../src/cli-handlers/list.js';
import { diff } from '../../src/cli-handlers/diff.js';
import { checkout } from '../../src/cli-handlers/checkout.js';
import { promote } from '../../src/cli-handlers/promote.js';
import { rollback } from '../../src/cli-handlers/rollback.js';
import { serve } from '../../src/cli-handlers/serve.js';
import type { CliContext } from '../../src/cli-handlers/client.js';

function stubFetch(status: number, body: unknown): typeof fetch {
  return (async (): Promise<Response> => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;
}

function ctx(argv: string[], fetchImpl?: typeof fetch): CliContext {
  return {
    argv,
    endpoint: 'http://127.0.0.1:0',
    ...(fetchImpl !== undefined ? { fetch: fetchImpl } : {}),
    stdout: () => {},
    stderr: () => {},
  };
}

describe('claws snap <verb> — exit-code E2E (11 verbs)', () => {
  it('snap stage-on exits 0', async () => {
    expect((await stage(ctx(['on']))).exitCode).toBe(0);
  });
  it('snap stage-off exits 0', async () => {
    expect((await stage(ctx(['off']))).exitCode).toBe(0);
  });
  it('snap status exits 0 on 200', async () => {
    expect((await status(ctx([], stubFetch(200, { staged: false })))).exitCode).toBe(0);
  });
  it('snap diff-staged exits 0 with --staged', async () => {
    expect((await diffStaged(ctx(['--staged']))).exitCode).toBe(0);
  });
  it('snap discard-stage exits 0 with --stage', async () => {
    expect((await discardStage(ctx(['--stage']))).exitCode).toBe(0);
  });
  it('snap upload exits 0 on 201', async () => {
    expect((await upload(ctx(['--files', 'x.json'], stubFetch(201, { id: 'sha256-a' })))).exitCode).toBe(0);
  });
  it('snap list exits 0 on 200', async () => {
    expect((await list(ctx([], stubFetch(200, [])))).exitCode).toBe(0);
  });
  it('snap diff exits 0 on 200', async () => {
    expect((await diff(ctx(['sha256-a', 'sha256-b'], stubFetch(200, { diff: [] })))).exitCode).toBe(0);
  });
  it('snap checkout exits 0 on 200', async () => {
    expect((await checkout(ctx(['sha256-a'], stubFetch(200, { id: 'sha256-a' })))).exitCode).toBe(0);
  });
  it('snap promote exits 0 on 200', async () => {
    expect((await promote(ctx(['sha256-a'], stubFetch(200, {})))).exitCode).toBe(0);
  });
  it('snap rollback exits 0 on 200', async () => {
    expect((await rollback(ctx(['sha256-a'], stubFetch(200, {})))).exitCode).toBe(0);
  });
  it('snap serve exits 0 with default port', async () => {
    expect((await serve(ctx([]))).exitCode).toBe(0);
  });
});
