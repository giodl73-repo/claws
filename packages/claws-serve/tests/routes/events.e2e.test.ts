/**
 * L2 e2e test for the SSE event stream: drive file_changed + recompiled
 * events through the full Express adapter and verify monotonically
 * increasing sequence numbers on the wire.
 */
import { describe, it, expect, afterEach } from 'vitest';
import type { Server, IncomingMessage } from 'node:http';
import http from 'node:http';
import express from 'express';
import { registerRoutes } from '../../src/routes/index.js';
import { EventStream } from '../../src/sse/event-stream.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

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
          let b = buffer.indexOf('\n\n');
          while (b !== -1) {
            const frame = buffer.slice(0, b + 2);
            buffer = buffer.slice(b + 2);
            const waiter = pending.shift();
            if (waiter) waiter(frame);
            else queue.push(frame);
            b = buffer.indexOf('\n\n');
          }
        });
        const next = (): Promise<string> => {
          const q = queue.shift();
          if (q !== undefined) return Promise.resolve(q);
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

function parseFrame(frame: string): { type: string; sequence: number; payload: unknown } {
  const lines = frame.split('\n');
  const eventLine = lines.find((l) => l.startsWith('event: '));
  const dataLine = lines.find((l) => l.startsWith('data: '));
  if (eventLine === undefined || dataLine === undefined) throw new Error('malformed SSE frame');
  const type = eventLine.slice('event: '.length);
  const { sequence, payload } = JSON.parse(dataLine.slice('data: '.length)) as {
    sequence: number;
    payload: unknown;
  };
  return { type, sequence, payload };
}

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => {
      resolve(s);
    });
  });
}

describe('SSE e2e — file_changed + recompiled with monotonic sequences', () => {
  let server: Server | undefined;
  let handle: SseHandle | undefined;

  afterEach(() => {
    handle?.close();
    handle = undefined;
    server?.close();
    server = undefined;
  });

  it('delivers file_changed then recompiled with strictly increasing sequences', async () => {
    const stream = new EventStream();
    const app = express();
    const host = new CompilationHost(async () => minimalGovernanceIR(), '/stub');
    registerRoutes(app, host, { eventStream: stream });
    server = await listen(app);

    handle = await openSse(server);

    // Frame 1: initial connected.
    const connected = parseFrame(await handle.next());
    expect(connected.type).toBe('connected');
    expect(connected.sequence).toBe(1);

    // Simulate the watch -> compile pipeline.
    stream.broadcast('file_changed', {
      path: 'SOUL.md',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:00.000Z',
    });
    stream.broadcast('recompiled', {
      durationMs: 12,
      result: { violationCount: 0, warningCount: 0, cached: false },
      timestamp: '2026-04-17T00:00:01.000Z',
    });

    const fileFrame = parseFrame(await handle.next());
    const recompiledFrame = parseFrame(await handle.next());

    expect(fileFrame.type).toBe('file_changed');
    expect(recompiledFrame.type).toBe('recompiled');
    expect(fileFrame.sequence).toBeGreaterThan(connected.sequence);
    expect(recompiledFrame.sequence).toBeGreaterThan(fileFrame.sequence);

    // Payload sanity — gateway-eng contract.
    const filePayload = fileFrame.payload as { path: string; changedBy: string };
    expect(filePayload.path).toBe('SOUL.md');
    const recPayload = recompiledFrame.payload as {
      durationMs: number;
      result: { cached: boolean };
    };
    expect(recPayload.durationMs).toBe(12);
    expect(recPayload.result.cached).toBe(false);
  });
});
