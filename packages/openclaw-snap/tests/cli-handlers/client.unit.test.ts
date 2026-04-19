/**
 * Additional coverage for cli-handlers/client: httpCall body variants +
 * writeLine channel selection + parseArgs edge cases.
 */

import { describe, it, expect } from 'vitest';
import { httpCall, parseArgs, writeLine, type CliContext } from '../../src/cli-handlers/client.js';

describe('cli-handlers/client — coverage', () => {
  it('httpCall sends body + idempotencyKey when provided; omits when not', async () => {
    const captured: { init?: RequestInit; url?: string }[] = [];
    const fetchImpl = (async (url: unknown, init?: RequestInit): Promise<Response> => {
      captured.push({ url: String(url), ...(init !== undefined ? { init } : {}) });
      return new Response('{"ok":true}', { status: 200 });
    }) as typeof fetch;
    const ctx: CliContext = { argv: [], endpoint: 'http://127.0.0.1:0', fetch: fetchImpl };

    await httpCall(ctx, 'POST', '/v1/snapshots', { body: { foo: 1 }, idempotencyKey: 'k' });
    await httpCall(ctx, 'GET', '/v1/snapshots');
    expect(captured).toHaveLength(2);
    expect(captured[0]?.init?.body).toBe('{"foo":1}');
    expect((captured[0]?.init?.headers as Record<string, string>)['idempotency-key']).toBe('k');
    expect(captured[1]?.init?.body).toBeUndefined();
  });

  it('httpCall handles empty response body without crashing', async () => {
    const fetchImpl = (async (): Promise<Response> => new Response('', { status: 200 })) as typeof fetch;
    const ctx: CliContext = { argv: [], endpoint: 'http://127.0.0.1:0', fetch: fetchImpl };
    const { status, body } = await httpCall(ctx, 'GET', '/v1/healthz');
    expect(status).toBe(200);
    expect(body).toBeUndefined();
  });

  it('writeLine routes to the configured stdout/stderr; no-ops when absent', () => {
    const out: string[] = [];
    const err: string[] = [];
    const ctx: CliContext = { argv: [], endpoint: '', stdout: (l) => out.push(l), stderr: (l) => err.push(l) };
    writeLine(ctx, 'hello');
    writeLine(ctx, 'uhoh', 'err');
    expect(out).toEqual(['hello']);
    expect(err).toEqual(['uhoh']);

    const silent: CliContext = { argv: [], endpoint: '' };
    writeLine(silent, 'x');
    writeLine(silent, 'y', 'err');
  });

  it('parseArgs handles --flag terminating the argv', () => {
    const result = parseArgs(['--flag']);
    expect(result.flags['flag']).toBe(true);
    expect(result.positional).toEqual([]);
  });
});
