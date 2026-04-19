/**
 * L0 unit tests for the SSE EventStream broadcaster.
 *
 * Covers monotonic sequence allocation, event serialization, client
 * disconnect cleanup, and concurrent broadcast fan-out.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  EventStream,
  HEARTBEAT_FRAME,
  serializeSseFrame,
  type ClientWriter,
  type SseEnvelope,
} from '../../src/sse/event-stream.js';

function makeWriter(): ClientWriter & { frames: string[] } {
  const frames: string[] = [];
  return {
    frames,
    write(frame: string): boolean {
      frames.push(frame);
      return true;
    },
  };
}

describe('EventStream sequence counter', () => {
  it('allocates monotonically increasing sequences across heterogeneous event types', () => {
    const stream = new EventStream();
    const client = makeWriter();
    stream.subscribe(client);

    const s1 = stream.broadcast('file_changed', {
      path: 'SOUL.md',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:00.000Z',
    });
    const s2 = stream.broadcast('recompiled', {
      durationMs: 42,
      result: { violationCount: 0, warningCount: 0, cached: false },
      timestamp: '2026-04-17T00:00:01.000Z',
    });
    const s3 = stream.broadcast('governance_warning', {
      rule: 'R3',
      tool: 'read_file',
      message: 'advisory',
      timestamp: '2026-04-17T00:00:02.000Z',
    });
    const s4 = stream.broadcast('governance_state_changed', {
      from: 'clean',
      to: 'warning',
      activeViolations: 1,
      timestamp: '2026-04-17T00:00:03.000Z',
    });

    expect([s1, s2, s3, s4]).toEqual([1, 2, 3, 4]);
    expect(stream.currentSequence).toBe(4);
    expect(client.frames).toHaveLength(4);
  });
});

describe('SSE frame serialization', () => {
  it('serializes every event type to the RFC 6202 wire format with event, data, id', () => {
    const cases: Array<SseEnvelope> = [
      {
        sequence: 1,
        type: 'connected',
        payload: { sequence: 1, timestamp: '2026-04-17T00:00:00.000Z' },
      },
      {
        sequence: 2,
        type: 'file_changed',
        payload: { path: 'SOUL.md', changedBy: 'user', timestamp: '2026-04-17T00:00:01.000Z' },
      },
      {
        sequence: 3,
        type: 'recompiled',
        payload: {
          durationMs: 17,
          result: { violationCount: 0, warningCount: 1, cached: true },
          timestamp: '2026-04-17T00:00:02.000Z',
        },
      },
      {
        sequence: 4,
        type: 'governance_warning',
        payload: { rule: 'R4', tool: 'write_file', message: 'advisory', timestamp: '2026-04-17T00:00:03.000Z' },
      },
      {
        sequence: 5,
        type: 'governance_state_changed',
        payload: { from: 'clean', to: 'error', activeViolations: 3, timestamp: '2026-04-17T00:00:04.000Z' },
      },
    ];

    for (const envelope of cases) {
      const frame = serializeSseFrame(envelope);
      expect(frame).toContain(`event: ${envelope.type}\n`);
      expect(frame).toContain(`id: ${String(envelope.sequence)}\n`);
      expect(frame.endsWith('\n\n')).toBe(true);

      const dataLine = frame.split('\n').find((line) => line.startsWith('data: '));
      expect(dataLine).toBeDefined();
      const parsed = JSON.parse(dataLine!.slice('data: '.length)) as { sequence: number; payload: unknown };
      expect(parsed.sequence).toBe(envelope.sequence);
      expect(parsed.payload).toEqual(envelope.payload);
    }
  });
});

describe('client lifecycle', () => {
  it('unsubscribe removes the client so further broadcasts do not reach it', () => {
    const stream = new EventStream();
    const client = makeWriter();
    const unsubscribe = stream.subscribe(client);

    stream.broadcast('file_changed', {
      path: 'a',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:00.000Z',
    });
    expect(client.frames).toHaveLength(1);
    expect(stream.clientCount).toBe(1);

    unsubscribe();
    expect(stream.clientCount).toBe(0);

    stream.broadcast('file_changed', {
      path: 'b',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:01.000Z',
    });
    expect(client.frames).toHaveLength(1);
  });

  it('evicts a client whose write throws so future broadcasts skip it', () => {
    const stream = new EventStream();
    const bad: ClientWriter = {
      write: vi.fn(() => {
        throw new Error('connection reset');
      }),
    };
    const good = makeWriter();
    stream.subscribe(bad);
    stream.subscribe(good);

    const seq = stream.broadcast('recompiled', {
      durationMs: 1,
      result: { violationCount: 0, warningCount: 0, cached: false },
      timestamp: '2026-04-17T00:00:00.000Z',
    });

    expect(seq).toBe(1);
    expect(good.frames).toHaveLength(1);
    expect(stream.clientCount).toBe(1);

    // Next broadcast reaches only the good client — the bad one was evicted.
    stream.broadcast('recompiled', {
      durationMs: 2,
      result: { violationCount: 0, warningCount: 0, cached: false },
      timestamp: '2026-04-17T00:00:01.000Z',
    });
    expect(good.frames).toHaveLength(2);
    expect(bad.write).toHaveBeenCalledTimes(1);
  });

  it('evicts a client whose write returns false (back-pressure)', () => {
    const stream = new EventStream();
    const saturated: ClientWriter = { write: (): boolean => false };
    stream.subscribe(saturated);

    stream.broadcast('file_changed', {
      path: 'a',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:00.000Z',
    });
    expect(stream.clientCount).toBe(0);
  });

  it('closeAll drops all subscribers', () => {
    const stream = new EventStream();
    stream.subscribe(makeWriter());
    stream.subscribe(makeWriter());
    expect(stream.clientCount).toBe(2);

    stream.closeAll();
    expect(stream.clientCount).toBe(0);
  });
});

describe('concurrent broadcast', () => {
  it('all connected clients receive the same serialized frame for a single broadcast', () => {
    const stream = new EventStream();
    const clients = [makeWriter(), makeWriter(), makeWriter(), makeWriter()];
    for (const c of clients) stream.subscribe(c);

    const seq = stream.broadcast('governance_state_changed', {
      from: 'clean',
      to: 'warning',
      activeViolations: 2,
      timestamp: '2026-04-17T00:00:00.000Z',
    });

    expect(seq).toBe(1);
    const first = clients[0]!.frames[0]!;
    for (const c of clients) {
      expect(c.frames).toHaveLength(1);
      expect(c.frames[0]).toBe(first);
    }
  });
});

describe('broadcastConnected — atomic anchor emission', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('payload.sequence matches the allocated envelope sequence and wire id', () => {
    const stream = new EventStream();
    const client = makeWriter();
    stream.subscribe(client);

    const seq = stream.broadcastConnected('2026-04-17T00:00:00.000Z');

    expect(seq).toBe(1);
    expect(stream.currentSequence).toBe(1);
    expect(client.frames).toHaveLength(1);

    const frame = client.frames[0]!;
    expect(frame).toContain('event: connected\n');
    expect(frame).toContain('id: 1\n');

    const data = frame.split('\n').find((line) => line.startsWith('data: '))!.slice('data: '.length);
    const parsed = JSON.parse(data) as { sequence: number; payload: { sequence: number; timestamp: string } };
    expect(parsed.sequence).toBe(1);
    expect(parsed.payload.sequence).toBe(1);
    expect(parsed.payload.timestamp).toBe('2026-04-17T00:00:00.000Z');
  });

  it('keeps payload.sequence consistent with envelope sequence when another broadcast interleaves', () => {
    // Simulates the race the route used to have: an external broadcaster
    // (e.g., CompilerEventBus -> SSE bridge) fires between computing the
    // anchor sequence and emitting the connected frame. The old code did
    // `payload.sequence = currentSequence + 1` then `broadcast('connected', ...)`,
    // so the anchor's payload could claim a sequence the envelope never carried.
    // With `broadcastConnected`, the allocation and payload mint are atomic.
    const stream = new EventStream();
    const client = makeWriter();
    stream.subscribe(client);

    // Pretend a `recompiled` event fires before the handler anchors.
    stream.broadcast('recompiled', {
      durationMs: 1,
      result: { violationCount: 0, warningCount: 0, cached: false },
      timestamp: '2026-04-17T00:00:00.000Z',
    });

    const connectedSeq = stream.broadcastConnected('2026-04-17T00:00:01.000Z');

    // A subsequent event must still be strictly greater.
    const nextSeq = stream.broadcast('file_changed', {
      path: 'SOUL.md',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:02.000Z',
    });

    expect(connectedSeq).toBe(2);
    expect(nextSeq).toBe(3);
    expect(client.frames).toHaveLength(3);

    const connectedFrame = client.frames[1]!;
    const parsed = JSON.parse(
      connectedFrame.split('\n').find((l) => l.startsWith('data: '))!.slice('data: '.length),
    ) as { sequence: number; payload: { sequence: number } };
    expect(parsed.sequence).toBe(2);
    expect(parsed.payload.sequence).toBe(2);
    expect(connectedFrame).toContain('id: 2\n');
  });
});

describe('workspace-version source (pulse 69)', () => {
  it('setVersionSource attaches a reader whose value is stamped on every broadcast envelope', () => {
    const stream = new EventStream();
    const client = makeWriter();
    stream.subscribe(client);

    let version = 7;
    stream.setVersionSource(() => version);

    stream.broadcast('file_changed', {
      path: 'SOUL.md',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:00.000Z',
    });

    const data = client.frames[0]!
      .split('\n')
      .find((l) => l.startsWith('data: '))!
      .slice('data: '.length);
    const parsed = JSON.parse(data) as { sequence: number; workspaceVersion?: number };
    expect(parsed.workspaceVersion).toBe(7);

    // Reader is called per broadcast — new version is picked up live.
    version = 12;
    stream.broadcast('file_changed', {
      path: 'SOUL.md',
      changedBy: 'user',
      timestamp: '2026-04-17T00:00:01.000Z',
    });
    const data2 = client.frames[1]!
      .split('\n')
      .find((l) => l.startsWith('data: '))!
      .slice('data: '.length);
    const parsed2 = JSON.parse(data2) as { workspaceVersion?: number };
    expect(parsed2.workspaceVersion).toBe(12);
  });

  it('setVersionSource also stamps broadcastConnected envelopes', () => {
    const stream = new EventStream();
    const client = makeWriter();
    stream.subscribe(client);
    stream.setVersionSource(() => 42);

    stream.broadcastConnected('2026-04-17T00:00:00.000Z');

    const data = client.frames[0]!
      .split('\n')
      .find((l) => l.startsWith('data: '))!
      .slice('data: '.length);
    const parsed = JSON.parse(data) as {
      workspaceVersion?: number;
      payload: { sequence: number };
    };
    expect(parsed.workspaceVersion).toBe(42);
    expect(parsed.payload.sequence).toBe(1);
  });

  it('setVersionSource(undefined) clears the reader so envelopes omit workspaceVersion again', () => {
    const stream = new EventStream();
    const client = makeWriter();
    stream.subscribe(client);
    stream.setVersionSource(() => 3);
    stream.setVersionSource(undefined);

    stream.broadcast('recompiled', {
      durationMs: 1,
      result: { violationCount: 0, warningCount: 0, cached: false },
      timestamp: '2026-04-17T00:00:00.000Z',
    });
    stream.broadcastConnected('2026-04-17T00:00:01.000Z');

    for (const frame of client.frames) {
      const data = frame.split('\n').find((l) => l.startsWith('data: '))!.slice('data: '.length);
      const parsed = JSON.parse(data) as { workspaceVersion?: number };
      expect(parsed.workspaceVersion).toBeUndefined();
    }
  });
});

describe('idle heartbeat', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports a 15-second default cadence safe under aggressive proxy idle timeouts', () => {
    expect(DEFAULT_HEARTBEAT_INTERVAL_MS).toBe(15_000);
  });

  it('emits a comment-only :heartbeat frame to every subscriber on each tick', () => {
    vi.useFakeTimers();
    const stream = new EventStream();
    const a = makeWriter();
    const b = makeWriter();
    stream.subscribe(a);
    stream.subscribe(b);
    expect(stream.heartbeatActive).toBe(true);

    vi.advanceTimersByTime(DEFAULT_HEARTBEAT_INTERVAL_MS);

    expect(a.frames).toHaveLength(1);
    expect(b.frames).toHaveLength(1);
    expect(a.frames[0]).toBe(HEARTBEAT_FRAME);
    expect(b.frames[0]).toBe(HEARTBEAT_FRAME);
    expect(a.frames[0]!.startsWith(':')).toBe(true);
    expect(stream.currentSequence).toBe(0);

    vi.advanceTimersByTime(DEFAULT_HEARTBEAT_INTERVAL_MS);
    expect(a.frames).toHaveLength(2);
    expect(b.frames).toHaveLength(2);
    expect(stream.currentSequence).toBe(0);
  });

  it('starts on first subscribe and stops when the last subscriber unsubscribes', () => {
    vi.useFakeTimers();
    const stream = new EventStream();
    expect(stream.heartbeatActive).toBe(false);

    const unsubA = stream.subscribe(makeWriter());
    expect(stream.heartbeatActive).toBe(true);

    const unsubB = stream.subscribe(makeWriter());
    expect(stream.heartbeatActive).toBe(true);

    unsubA();
    expect(stream.heartbeatActive).toBe(true);

    unsubB();
    expect(stream.heartbeatActive).toBe(false);
  });

  it('startHeartbeat accepts a custom cadence and is idempotent (resets the timer)', () => {
    vi.useFakeTimers();
    const stream = new EventStream();
    const client = makeWriter();
    stream.subscribe(client);
    // Reset to a tighter cadence for this test.
    stream.startHeartbeat(1_000);
    // Clear the frames the default-cadence timer would have queued — the
    // restart from startHeartbeat should re-arm against the new cadence.
    client.frames.length = 0;

    vi.advanceTimersByTime(500);
    expect(client.frames).toHaveLength(0);
    vi.advanceTimersByTime(500);
    expect(client.frames).toHaveLength(1);
    expect(client.frames[0]).toBe(HEARTBEAT_FRAME);

    stream.stopHeartbeat();
    expect(stream.heartbeatActive).toBe(false);
    vi.advanceTimersByTime(5_000);
    expect(client.frames).toHaveLength(1);
  });

  it('evicts a client whose write fails during a heartbeat tick', () => {
    vi.useFakeTimers();
    const stream = new EventStream();
    const bad: ClientWriter = { write: (): boolean => false };
    const good = makeWriter();
    stream.subscribe(bad);
    stream.subscribe(good);

    vi.advanceTimersByTime(DEFAULT_HEARTBEAT_INTERVAL_MS);

    expect(stream.clientCount).toBe(1);
    expect(good.frames).toEqual([HEARTBEAT_FRAME]);
  });

  it('closeAll tears down the heartbeat timer', () => {
    vi.useFakeTimers();
    const stream = new EventStream();
    stream.subscribe(makeWriter());
    expect(stream.heartbeatActive).toBe(true);

    stream.closeAll();
    expect(stream.heartbeatActive).toBe(false);
    expect(stream.clientCount).toBe(0);
  });
});
