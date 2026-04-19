/**
 * L0 unit tests for the `/api/events` route — exercises the writer adapter
 * branches (writableEnded guard, write fall-through, close cleanup) that
 * are hard to hit deterministically through the HTTP integration tests.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { EventStream } from '../../src/sse/event-stream.js';
import { eventsRouter } from '../../src/routes/events.js';

/**
 * Simulate Express's lookup of the GET '/' handler. The router registers
 * its handlers via `router.get('/', handler)`; we reach in through the
 * public `stack` property because Express exposes no getHandler helper.
 */
function getHandler(router: ReturnType<typeof eventsRouter>): (req: Request, res: Response) => void {
  const layer = router.stack.find((l: { route?: { path: string } }) => l.route?.path === '/');
  if (layer === undefined) throw new Error('no handler');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((layer as any).route.stack[0].handle as (req: Request, res: Response) => void);
}

function makeReq(): Request & { _fire: (event: string) => void } {
  const handlers = new Map<string, () => void>();
  const req = {
    on(event: string, handler: () => void): unknown {
      handlers.set(event, handler);
      return this;
    },
    _fire(event: string): void {
      handlers.get(event)?.();
    },
  };
  return req as unknown as Request & { _fire: (event: string) => void };
}

function makeRes(): Response & {
  readonly frames: string[];
  setWritableEnded: (value: boolean) => void;
} {
  let writableEnded = false;
  const frames: string[] = [];
  const res = {
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(() => {
      writableEnded = true;
    }),
    write(frame: string): boolean {
      frames.push(frame);
      return true;
    },
    get writableEnded(): boolean {
      return writableEnded;
    },
    setWritableEnded(v: boolean): void {
      writableEnded = v;
    },
    get frames(): string[] {
      return frames;
    },
  };
  return res as unknown as Response & {
    readonly frames: string[];
    setWritableEnded: (value: boolean) => void;
  };
}

describe('eventsRouter — SSE handshake', () => {
  it('sets all four SSE headers and flushes them before broadcasting connected', () => {
    const stream = new EventStream();
    const router = eventsRouter(stream);
    const handler = getHandler(router);
    const req = makeReq();
    const res = makeRes();

    handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.flushHeaders).toHaveBeenCalledTimes(1);

    // The subscription + broadcast fires the connected frame.
    expect(res.frames).toHaveLength(1);
    expect(res.frames[0]).toContain('event: connected\n');
  });

  it('connected anchor: envelope sequence and payload.sequence match even after an interleaved broadcast', () => {
    // Regression guard for CP5-M06: a broadcast between the handler's sequence
    // read and its anchor emission used to leave `payload.sequence` one behind.
    // With `broadcastConnected`, allocation and payload mint are atomic, so a
    // pre-subscribe broadcast does not desync payload/id on the anchor frame.
    const stream = new EventStream();
    // Simulate a CompilerEventBus-style broadcast before the /api/events
    // handler runs — the stream already has sequence 1 emitted.
    stream.broadcast('recompiled', {
      durationMs: 5,
      result: { violationCount: 0, warningCount: 0, cached: false },
      timestamp: '2026-04-17T00:00:00.000Z',
    });

    const router = eventsRouter(stream);
    const handler = getHandler(router);
    const req = makeReq();
    const res = makeRes();

    handler(req, res);

    expect(res.frames).toHaveLength(1);
    const frame = res.frames[0]!;
    expect(frame).toContain('event: connected\n');
    expect(frame).toContain('id: 2\n');
    const data = frame.split('\n').find((l) => l.startsWith('data: '))!.slice('data: '.length);
    const parsed = JSON.parse(data) as { sequence: number; payload: { sequence: number } };
    expect(parsed.sequence).toBe(2);
    expect(parsed.payload.sequence).toBe(2);
  });

  it('writer returns false once the response is already ended so the stream evicts it', () => {
    const stream = new EventStream();
    const router = eventsRouter(stream);
    const handler = getHandler(router);
    const req = makeReq();
    const res = makeRes();

    handler(req, res);
    expect(stream.clientCount).toBe(1);

    // Simulate the socket being half-closed between broadcasts — the writer
    // must refuse to write so EventStream evicts it on the next broadcast.
    res.setWritableEnded(true);

    stream.broadcast('file_changed', {
      path: 'SOUL.md',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:00.000Z',
    });
    expect(stream.clientCount).toBe(0);
  });

  it('close event unsubscribes and ends the response', () => {
    const stream = new EventStream();
    const router = eventsRouter(stream);
    const handler = getHandler(router);
    const req = makeReq();
    const res = makeRes();

    handler(req, res);
    expect(stream.clientCount).toBe(1);

    req._fire('close');
    expect(stream.clientCount).toBe(0);
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  it('aborted event cleans up without double-ending the response', () => {
    const stream = new EventStream();
    const router = eventsRouter(stream);
    const handler = getHandler(router);
    const req = makeReq();
    const res = makeRes();

    handler(req, res);
    // Simulate response already ended before the aborted fires.
    res.setWritableEnded(true);

    req._fire('aborted');
    expect(stream.clientCount).toBe(0);
    expect(res.end).not.toHaveBeenCalled();
  });
});
