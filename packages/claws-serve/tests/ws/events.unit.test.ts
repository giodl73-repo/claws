import { describe, it, expect, vi } from 'vitest';
import {
  serializeEvent,
  createEvent,
  validateOrigin,
  ClientManager,
  attachWsHandler,
} from '../../src/ws/events.js';
import type { WsEvent } from '../../src/ws/events.js';

describe('event serialization', () => {
  it('serializes WsEvent to JSON with type, timestamp, and payload', () => {
    const event: WsEvent = {
      type: 'compile:start',
      timestamp: '2026-04-15T00:00:00.000Z',
      payload: { workspaceRoot: '/test' },
    };

    const json = serializeEvent(event);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed['type']).toBe('compile:start');
    expect(parsed['timestamp']).toBe('2026-04-15T00:00:00.000Z');
    expect(parsed['payload']).toEqual({ workspaceRoot: '/test' });
  });

  it('createEvent produces valid WsEvent with current timestamp', () => {
    const before = new Date().toISOString();
    const event = createEvent('diagnostic:update', { count: 5 });
    const after = new Date().toISOString();

    expect(event.type).toBe('diagnostic:update');
    expect(event.timestamp >= before).toBe(true);
    expect(event.timestamp <= after).toBe(true);
    expect(event.payload).toEqual({ count: 5 });
  });

  it('createEvent defaults to empty payload', () => {
    const event = createEvent('ir:invalidated');
    expect(event.payload).toEqual({});
  });

  it('round-trips all 7 event types through serialize/parse', () => {
    const types = [
      'compile:start',
      'compile:complete',
      'diagnostic:update',
      'tension:detected',
      'tension:resolved',
      'snapshot:saved',
      'ir:invalidated',
    ] as const;

    for (const type of types) {
      const event = createEvent(type, { key: 'value' });
      const json = serializeEvent(event);
      const parsed = JSON.parse(json) as WsEvent;
      expect(parsed.type).toBe(type);
      expect(parsed.payload).toEqual({ key: 'value' });
    }
  });
});

function mockWebSocket(readyState: number = 1): { send: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; readyState: number } {
  return {
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    readyState,
  };
}

describe('client broadcast', () => {

  it('broadcasts event to all connected clients', () => {
    const manager = new ClientManager();
    const ws1 = mockWebSocket();
    const ws2 = mockWebSocket();
    const ws3 = mockWebSocket();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(ws1 as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(ws2 as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(ws3 as any);

    expect(manager.size).toBe(3);

    const event = createEvent('compile:complete', { durationMs: 42 });
    manager.broadcast(event);

    const expectedData = serializeEvent(event);
    expect(ws1.send).toHaveBeenCalledWith(expectedData);
    expect(ws2.send).toHaveBeenCalledWith(expectedData);
    expect(ws3.send).toHaveBeenCalledWith(expectedData);
  });

  it('skips clients that are not in OPEN state', () => {
    const manager = new ClientManager();
    const openWs = mockWebSocket(1);   // OPEN
    const closedWs = mockWebSocket(3); // CLOSED

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(openWs as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(closedWs as any);

    const event = createEvent('tension:detected', {});
    manager.broadcast(event);

    expect(openWs.send).toHaveBeenCalled();
    expect(closedWs.send).not.toHaveBeenCalled();
  });

  it('continues broadcasting to remaining clients when one send() throws', () => {
    const manager = new ClientManager();
    const badWs = mockWebSocket(1);
    badWs.send.mockImplementation(() => { throw new Error('connection reset'); });
    const goodWs1 = mockWebSocket(1);
    const goodWs2 = mockWebSocket(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(badWs as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(goodWs1 as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(goodWs2 as any);

    const event = createEvent('compile:complete', { durationMs: 10 });
    manager.broadcast(event);

    // Good clients still received the event
    const expectedData = serializeEvent(event);
    expect(goodWs1.send).toHaveBeenCalledWith(expectedData);
    expect(goodWs2.send).toHaveBeenCalledWith(expectedData);

    // Bad client was removed from the set
    expect(manager.size).toBe(2);
  });

  it('removes client on close event', () => {
    const manager = new ClientManager();
    let closeHandler: (() => void) | undefined;

    const ws = {
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn((event: string, handler: () => void) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      }),
      readyState: 1,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(ws as any);
    expect(manager.size).toBe(1);

    // Simulate close
    closeHandler!();
    expect(manager.size).toBe(0);
  });

  it('closeAll disconnects all clients and clears the set', () => {
    const manager = new ClientManager();
    const ws1 = mockWebSocket();
    const ws2 = mockWebSocket();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(ws1 as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(ws2 as any);

    expect(manager.size).toBe(2);

    manager.closeAll();

    expect(ws1.close).toHaveBeenCalled();
    expect(ws2.close).toHaveBeenCalled();
    expect(manager.size).toBe(0);
  });

  it('remove explicitly removes a client without waiting for close event', () => {
    const manager = new ClientManager();
    const ws = mockWebSocket();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.add(ws as any);
    expect(manager.size).toBe(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager.remove(ws as any);
    expect(manager.size).toBe(0);
  });
});

describe('attachWsHandler', () => {
  it('adds client to manager on valid localhost origin', () => {
    const manager = new ClientManager();
    let connectionHandler: ((ws: unknown, req: unknown) => void) | undefined;

    const mockWss = {
      on: vi.fn((event: string, handler: (ws: unknown, req: unknown) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachWsHandler(mockWss as any, manager, '127.0.0.1');

    expect(connectionHandler).toBeDefined();

    // Simulate connection with localhost origin
    const mockWs = mockWebSocket();
    const mockReq = { headers: { origin: 'http://localhost:3000' } };

    connectionHandler!(mockWs, mockReq);

    expect(manager.size).toBe(1);
  });

  it('rejects client with non-localhost origin when bound to localhost', () => {
    const manager = new ClientManager();
    let connectionHandler: ((ws: unknown, req: unknown) => void) | undefined;

    const mockWss = {
      on: vi.fn((event: string, handler: (ws: unknown, req: unknown) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachWsHandler(mockWss as any, manager, '127.0.0.1');

    const mockWs = mockWebSocket();
    const mockReq = { headers: { origin: 'http://evil.com' } };

    connectionHandler!(mockWs, mockReq);

    // Client should be closed, not added
    expect(mockWs.close).toHaveBeenCalledWith(1008, 'Origin not allowed');
    expect(manager.size).toBe(0);
  });

  it('uses allowedOrigins allowlist when provided', () => {
    const manager = new ClientManager();
    let connectionHandler: ((ws: unknown, req: unknown) => void) | undefined;

    const mockWss = {
      on: vi.fn((event: string, handler: (ws: unknown, req: unknown) => void) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
    };

    const allowlist = ['http://editor.example.com'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachWsHandler(mockWss as any, manager, '0.0.0.0', allowlist);

    // Allowed origin
    const goodWs = mockWebSocket();
    connectionHandler!(goodWs, { headers: { origin: 'http://editor.example.com' } });
    expect(manager.size).toBe(1);

    // Disallowed origin
    const badWs = mockWebSocket();
    connectionHandler!(badWs, { headers: { origin: 'http://evil.com' } });
    expect(badWs.close).toHaveBeenCalledWith(1008, 'Origin not allowed');
    expect(manager.size).toBe(1);
  });
});

describe('origin validation', () => {
  it('rejects non-localhost origin when server bound to 127.0.0.1', () => {
    expect(validateOrigin('http://evil.com', '127.0.0.1')).toBe(false);
  });

  it('rejects non-localhost origin when server bound to localhost', () => {
    expect(validateOrigin('http://evil.com', 'localhost')).toBe(false);
  });

  it('rejects non-localhost origin when server bound to ::1', () => {
    expect(validateOrigin('http://evil.com', '::1')).toBe(false);
  });

  it('allows localhost origin when server bound to 127.0.0.1', () => {
    expect(validateOrigin('http://localhost:3000', '127.0.0.1')).toBe(true);
  });

  it('allows 127.0.0.1 origin when server bound to localhost', () => {
    expect(validateOrigin('http://127.0.0.1:3000', 'localhost')).toBe(true);
  });

  it('allows undefined origin (same-origin / CLI) when bound to localhost', () => {
    expect(validateOrigin(undefined, '127.0.0.1')).toBe(true);
  });

  it('allows empty origin when bound to localhost', () => {
    expect(validateOrigin('', '127.0.0.1')).toBe(true);
  });

  it('allows any origin when server not bound to localhost', () => {
    expect(validateOrigin('http://evil.com', '0.0.0.0')).toBe(true);
  });

  it('rejects malformed origin URL when bound to localhost', () => {
    expect(validateOrigin('not-a-url', '127.0.0.1')).toBe(false);
  });

  describe('with allowedOrigins allowlist', () => {
    const allowlist = ['http://localhost:3000', 'http://editor.example.com'];

    it('allows origin in allowlist on 0.0.0.0', () => {
      expect(validateOrigin('http://localhost:3000', '0.0.0.0', allowlist)).toBe(true);
    });

    it('allows origin in allowlist on localhost', () => {
      expect(validateOrigin('http://editor.example.com', '127.0.0.1', allowlist)).toBe(true);
    });

    it('rejects origin not in allowlist', () => {
      expect(validateOrigin('http://evil.com', '0.0.0.0', allowlist)).toBe(false);
    });

    it('rejects undefined origin when allowlist is active', () => {
      expect(validateOrigin(undefined, '0.0.0.0', allowlist)).toBe(false);
    });

    it('rejects empty origin when allowlist is active', () => {
      expect(validateOrigin('', '127.0.0.1', allowlist)).toBe(false);
    });
  });
});
