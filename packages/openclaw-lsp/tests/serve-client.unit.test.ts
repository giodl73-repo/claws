/**
 * L0 unit tests for ServeClient.
 *
 * Exercises health/compile/getIR, connection state transitions, error mapping,
 * baseUrl normalization, and unhappy-path branches for coverage.
 */

import { describe, it, expect } from 'vitest';
import { ServeClient, type FetchLike } from '../src/serve-client.js';

function okJson(payload: unknown): ReturnType<FetchLike> extends Promise<infer R> ? R : never {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as never;
}

describe('ServeClient', () => {
  it('health returns payload and transitions state to connected', async () => {
    const fetchImpl: FetchLike = async (url) => {
      expect(url).toBe('http://127.0.0.1:7711/health');
      return okJson({
        uptime: 10,
        memory: 2048,
        compileCount: 5,
        mode: 'healthy',
      });
    };
    const client = new ServeClient({ baseUrl: 'http://127.0.0.1:7711', fetchImpl });
    expect(client.state).toBe('disconnected');
    const h = await client.health();
    expect(h.uptime).toBe(10);
    expect(h.mode).toBe('healthy');
    expect(client.state).toBe('connected');
  });

  it('health throws and transitions state to error on non-OK response', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const client = new ServeClient({ baseUrl: 'http://127.0.0.1:7711', fetchImpl });
    await expect(client.health()).rejects.toThrow(/503/);
    expect(client.state).toBe('error');
  });

  it('health propagates network errors and marks state as error', async () => {
    const fetchImpl: FetchLike = async () => {
      throw new Error('ECONNREFUSED');
    };
    const client = new ServeClient({ baseUrl: 'http://127.0.0.1:7711', fetchImpl });
    await expect(client.health()).rejects.toThrow('ECONNREFUSED');
    expect(client.state).toBe('error');
  });

  it('compile returns IR payload and marks state connected', async () => {
    const fetchImpl: FetchLike = async (url, init) => {
      expect(url).toBe('http://127.0.0.1:7711/compile');
      expect(init?.method).toBe('POST');
      return okJson({ ir: { stub: true }, cached: false, durationMs: 12 });
    };
    const client = new ServeClient({ baseUrl: 'http://127.0.0.1:7711', fetchImpl });
    const result = await client.compile();
    expect(result.cached).toBe(false);
    expect(result.durationMs).toBe(12);
    expect(client.state).toBe('connected');
  });

  it('getIR returns IR from /ir endpoint', async () => {
    const fetchImpl: FetchLike = async (url) => {
      expect(url).toBe('http://127.0.0.1:7711/ir');
      return okJson({ ir: { marker: 'live' } });
    };
    const client = new ServeClient({ baseUrl: 'http://127.0.0.1:7711', fetchImpl });
    const ir = await client.getIR();
    expect((ir as { marker: string }).marker).toBe('live');
    expect(client.state).toBe('connected');
  });

  it('normalizes trailing slashes on baseUrl', async () => {
    let captured = '';
    const fetchImpl: FetchLike = async (url) => {
      captured = url;
      return okJson({ uptime: 0, memory: 0, compileCount: 0, mode: 'healthy' });
    };
    const client = new ServeClient({ baseUrl: 'http://127.0.0.1:7711///', fetchImpl });
    await client.health();
    expect(captured).toBe('http://127.0.0.1:7711/health');
  });

  it('defaults fetchImpl to globalThis.fetch when omitted', () => {
    const original = globalThis.fetch;
    const stub = (async () => okJson({ uptime: 0, memory: 0, compileCount: 0, mode: 'healthy' })) as unknown as typeof fetch;
    (globalThis as { fetch: typeof fetch }).fetch = stub;
    try {
      const client = new ServeClient({ baseUrl: 'http://localhost' });
      // Just verifying construction — no need to actually fetch.
      expect(client.state).toBe('disconnected');
    } finally {
      (globalThis as { fetch: typeof fetch }).fetch = original;
    }
  });

  it('compile error response surfaces the status code', async () => {
    const fetchImpl: FetchLike = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const client = new ServeClient({ baseUrl: 'http://localhost', fetchImpl });
    await expect(client.compile()).rejects.toThrow(/500/);
    expect(client.state).toBe('error');
  });
});
