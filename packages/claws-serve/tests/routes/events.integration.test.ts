/**
 * L1 integration tests for GET /api/events.
 *
 * Drives the Express server over a live TCP socket so the SSE-header
 * contract, initial `connected` event, and external event-source fan-out
 * are all exercised end-to-end through the route adapter.
 */
import { describe, it, expect, afterEach } from 'vitest';
import type { Server, IncomingMessage } from 'node:http';
import http from 'node:http';
import express from 'express';
import { createApp } from '../../src/server.js';
import type { ServerState } from '../../src/server.js';
import { EventStream } from '../../src/sse/event-stream.js';
import { registerRoutes } from '../../src/routes/index.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => {
      resolve(s);
    });
  });
}

/**
 * Open an HTTP GET against /api/events and return the raw response plus a
 * reader that yields each completed SSE frame (two-newline delimited).
 */
interface SseHandle {
  readonly response: IncomingMessage;
  readonly next: () => Promise<string>;
  readonly close: () => void;
}

function openSse(server: Server): Promise<SseHandle> {
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no address');
  return new Promise<SseHandle>((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: address.port,
        path: '/api/events',
        method: 'GET',
      },
      (res) => {
        let buffer = '';
        const pending: Array<(frame: string) => void> = [];
        const queue: string[] = [];

        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          buffer += chunk;
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary + 2);
            buffer = buffer.slice(boundary + 2);
            const waiter = pending.shift();
            if (waiter) waiter(frame);
            else queue.push(frame);
            boundary = buffer.indexOf('\n\n');
          }
        });

        const next = (): Promise<string> => {
          const queued = queue.shift();
          if (queued !== undefined) return Promise.resolve(queued);
          return new Promise<string>((r) => pending.push(r));
        };

        resolve({
          response: res,
          next,
          close: () => {
            req.destroy();
          },
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('GET /api/events — SSE headers + handshake', () => {
  let server: Server | undefined;
  let handle: SseHandle | undefined;

  afterEach(() => {
    handle?.close();
    handle = undefined;
    server?.close();
    server = undefined;
  });

  it('responds with 200 and SSE headers + sends an initial connected frame', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: '/stub',
    });
    server = await listen(app);

    handle = await openSse(server);
    expect(handle.response.statusCode).toBe(200);
    expect(handle.response.headers['content-type']).toBe('text/event-stream');
    expect(handle.response.headers['cache-control']).toBe('no-cache');
    expect(handle.response.headers['connection']).toBe('keep-alive');

    const first = await handle.next();
    expect(first).toContain('event: connected\n');
    expect(first).toContain('id: 1\n');
    const data = first
      .split('\n')
      .find((line) => line.startsWith('data: '))!
      .slice('data: '.length);
    const parsed = JSON.parse(data) as { sequence: number; payload: { sequence: number } };
    expect(parsed.sequence).toBe(1);
    expect(parsed.payload.sequence).toBe(1);
  });
});

describe('GET /api/events — idle heartbeat', () => {
  let server: Server | undefined;
  let handle: SseHandle | undefined;
  let stream: EventStream | undefined;

  afterEach(() => {
    handle?.close();
    handle = undefined;
    stream?.closeAll();
    stream = undefined;
    server?.close();
    server = undefined;
  });

  it('emits a :heartbeat comment frame to idle subscribers so proxies do not reap the connection', async () => {
    // Use a tight cadence so this L1 test does not take 15s. Fake timers would
    // stall the real TCP socket loop, so instead we re-arm the heartbeat at a
    // test-friendly interval and wait for real wall-clock ticks.
    stream = new EventStream();
    const app = express();
    const host = new CompilationHost(async () => minimalGovernanceIR(), '/stub');
    registerRoutes(app, host, { eventStream: stream, startedAt: Date.now() });
    server = await listen(app);

    handle = await openSse(server);

    // First frame is the `connected` anchor — drain it.
    const connectedFrame = await handle.next();
    expect(connectedFrame).toContain('event: connected\n');

    // Shorten cadence AFTER the first subscribe started the default 15s timer;
    // startHeartbeat is idempotent and re-arms against the new interval.
    stream.startHeartbeat(50);

    // Next frame with no external broadcast must be the heartbeat comment.
    const next = await handle.next();
    expect(next).toBe(':heartbeat\n\n');
    // Heartbeats do not advance the monotonic sequence — still at 1.
    expect(stream.currentSequence).toBe(1);
  }, 10_000);
});

describe('GET /api/events — external event fan-out', () => {
  let server: Server | undefined;
  let handle: SseHandle | undefined;

  afterEach(() => {
    handle?.close();
    handle = undefined;
    server?.close();
    server = undefined;
  });

  it('file_changed broadcasts on the shared EventStream reach the connected client', async () => {
    // Wire an externally-owned EventStream so the test can simulate watch
    // events arriving from outside the request lifecycle.
    const stream = new EventStream();
    const app = express();
    const host = new CompilationHost(async () => minimalGovernanceIR(), '/stub');
    registerRoutes(app, host, { eventStream: stream, startedAt: Date.now() });

    server = await listen(app);
    handle = await openSse(server);

    // Consume the initial connected frame.
    const connectedFrame = await handle.next();
    expect(connectedFrame).toContain('event: connected\n');

    // Simulate a claws watch file_changed event.
    stream.broadcast('file_changed', {
      path: 'SOUL.md',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:00.000Z',
    });

    const frame = await handle.next();
    expect(frame).toContain('event: file_changed\n');
    expect(frame).toContain('id: 2\n');
    const data = frame
      .split('\n')
      .find((line) => line.startsWith('data: '))!
      .slice('data: '.length);
    const parsed = JSON.parse(data) as { sequence: number; payload: { path: string; changedBy: string } };
    expect(parsed.sequence).toBe(2);
    expect(parsed.payload.path).toBe('SOUL.md');
    expect(parsed.payload.changedBy).toBe('user');
  });
});
