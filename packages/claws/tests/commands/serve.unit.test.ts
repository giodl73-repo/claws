/**
 * L0: serve command — flag wiring, JSON/text output, error paths.
 *
 * All server logic lives in @bic/claws-serve.
 * This test only verifies the CLI adapter (flag parsing + output formatting).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockStartServer = vi.fn();
const mockResolvePort = vi.fn();

vi.mock('@bic/claws-serve', () => ({
  startServer: (...args: unknown[]) => mockStartServer(...args),
  resolvePort: (...args: unknown[]) => mockResolvePort(...args),
}));

import { runServe } from '../../src/commands/serve.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  vi.restoreAllMocks();
  mockStartServer.mockReset();
  mockResolvePort.mockReset();
}

/** Create a fake server EventEmitter that emits 'listening' on next tick. */
function makeFakeServer(opts?: { emitClose?: boolean }) {
  const server = new EventEmitter();
  // Immediately schedule 'listening' then optionally 'close'
  process.nextTick(() => {
    server.emit('listening');
    if (opts?.emitClose !== false) {
      process.nextTick(() => server.emit('close'));
    }
  });
  return server;
}

// ── Tests: text output ─────────────────────────────────────────────────────

describe('claws serve (text output)', () => {
  afterEach(resetMocks);

  it('returns 0 and prints running message on success', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockReturnValue({ server: makeFakeServer() });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runServe({});
      expect(code).toBe(0);
      expect(mockStartServer).toHaveBeenCalledWith({
        port: undefined,
        host: undefined,
        noWs: undefined,
      });

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('claws serve running');
      expect(output).toContain('127.0.0.1');
      expect(output).toContain('3939');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('passes --port flag to startServer', async () => {
    mockResolvePort.mockReturnValue(8080);
    mockStartServer.mockReturnValue({ server: makeFakeServer() });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runServe({ port: 8080 });
      expect(code).toBe(0);
      expect(mockStartServer).toHaveBeenCalledWith(
        expect.objectContaining({ port: 8080 }),
      );

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('8080');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('passes --host flag to startServer', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockReturnValue({ server: makeFakeServer() });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runServe({ host: '0.0.0.0' });
      expect(code).toBe(0);
      expect(mockStartServer).toHaveBeenCalledWith(
        expect.objectContaining({ host: '0.0.0.0' }),
      );

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('0.0.0.0');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('shows WebSocket disabled message when --no-ws is set', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockReturnValue({ server: makeFakeServer() });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runServe({ noWs: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('WebSocket disabled');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('does not show WebSocket disabled when noWs is false', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockReturnValue({ server: makeFakeServer() });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runServe({ noWs: false });

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).not.toContain('WebSocket disabled');
    } finally {
      logSpy.mockRestore();
    }
  });
});

// ── Tests: JSON output ─────────────────────────────────────────────────────

describe('claws serve --json', () => {
  afterEach(resetMocks);

  it('returns 0 and outputs JSON on success', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockReturnValue({ server: makeFakeServer() });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runServe({ json: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('running');
      expect(parsed.port).toBe(3939);
      expect(parsed.host).toBe('127.0.0.1');
      expect(parsed.ws).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('reports ws: false in JSON when --no-ws is set', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockReturnValue({ server: makeFakeServer() });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runServe({ json: true, noWs: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.ws).toBe(false);
    } finally {
      logSpy.mockRestore();
    }
  });
});

// ── Tests: error paths ─────────────────────────────────────────────────────

describe('claws serve error handling', () => {
  afterEach(resetMocks);

  it('returns 1 and prints error message when startServer throws (text)', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockImplementation(() => {
      throw new Error('EADDRINUSE');
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runServe({});
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error starting server');
      expect(output).toContain('EADDRINUSE');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 and outputs JSON error when startServer throws (json)', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockImplementation(() => {
      throw new Error('Port in use');
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runServe({ json: true });
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Port in use');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockImplementation(() => {
      throw 'raw string error';
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runServe({});
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw string error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw in JSON mode', async () => {
    mockResolvePort.mockReturnValue(3939);
    mockStartServer.mockImplementation(() => {
      throw 42;
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runServe({ json: true });
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('42');
    } finally {
      logSpy.mockRestore();
    }
  });
});
