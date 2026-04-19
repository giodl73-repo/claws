/**
 * L3 acceptance test — scenario S08 (CAP Integration SSE stream).
 *
 * Acceptance criteria:
 *   1. Connect to /api/events, receive `connected` with current sequence.
 *   2. Trigger workspace file_changed + recompiled events; receive them
 *      with monotonic sequence numbers.
 *   3. Disconnect, trigger more events (lost because SSE is current-state
 *      only), then reconnect and verify the gap is detectable — the new
 *      `connected` sequence is strictly greater than last received + 1.
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
  readonly close: () => Promise<void>;
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
          close: (): Promise<void> =>
            new Promise((r) => {
              res.on('close', () => r());
              req.destroy();
            }),
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function parseFrame(frame: string): { type: string; sequence: number } {
  const lines = frame.split('\n');
  const eventLine = lines.find((l) => l.startsWith('event: '));
  const dataLine = lines.find((l) => l.startsWith('data: '));
  if (eventLine === undefined || dataLine === undefined) throw new Error('bad frame');
  const type = eventLine.slice('event: '.length);
  const { sequence } = JSON.parse(dataLine.slice('data: '.length)) as { sequence: number };
  return { type, sequence };
}

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => {
      resolve(s);
    });
  });
}

describe('S08 acceptance — SSE connect, edit, disconnect, reconnect gap', () => {
  let server: Server | undefined;
  let first: SseHandle | undefined;
  let second: SseHandle | undefined;

  afterEach(async () => {
    if (first !== undefined) await first.close();
    first = undefined;
    if (second !== undefined) await second.close();
    second = undefined;
    server?.close();
    server = undefined;
  });

  it('connects, receives events, detects sequence gap after reconnect', async () => {
    const stream = new EventStream();
    const app = express();
    const host = new CompilationHost(async () => minimalGovernanceIR(), '/stub');
    registerRoutes(app, host, { eventStream: stream });
    server = await listen(app);

    // 1. Connect + receive anchoring `connected` event.
    first = await openSse(server);
    const connected1 = parseFrame(await first.next());
    expect(connected1.type).toBe('connected');

    // 2. Trigger a workspace file edit and subsequent recompile.
    stream.broadcast('file_changed', {
      path: 'SOUL.md',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:00.000Z',
    });
    stream.broadcast('recompiled', {
      durationMs: 7,
      result: { violationCount: 0, warningCount: 0, cached: false },
      timestamp: '2026-04-17T00:00:01.000Z',
    });

    const fileFrame = parseFrame(await first.next());
    const recompiledFrame = parseFrame(await first.next());
    expect(fileFrame.type).toBe('file_changed');
    expect(recompiledFrame.type).toBe('recompiled');
    expect(fileFrame.sequence).toBeGreaterThan(connected1.sequence);
    expect(recompiledFrame.sequence).toBeGreaterThan(fileFrame.sequence);

    const lastReceived = recompiledFrame.sequence;

    // 3. Disconnect.
    await first.close();
    first = undefined;

    // 4. Events fired during disconnect are lost — SSE is current-state only.
    stream.broadcast('file_changed', {
      path: 'TOOLS.md',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:02.000Z',
    });
    stream.broadcast('governance_warning', {
      rule: 'R3',
      tool: 'read_file',
      message: 'advisory',
      timestamp: '2026-04-17T00:00:03.000Z',
    });

    // 5. Reconnect — the new `connected` event carries the server's current
    //    sequence, which has advanced past `lastReceived + 1`. Clients
    //    MUST refresh state rather than assume continuity.
    second = await openSse(server);
    const connected2 = parseFrame(await second.next());
    expect(connected2.type).toBe('connected');
    expect(connected2.sequence).toBeGreaterThan(lastReceived + 1);
  });
});
