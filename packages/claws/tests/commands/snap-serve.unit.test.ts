/**
 * L0: snap-serve command — flag wiring, JSON/text envelope, error paths.
 *
 * All server lifecycle lives in @bic/openclaw-snap.
 * This test only verifies the CLI adapter (flag defaults + output formatting).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockStartServer = vi.fn();
const mockInMemoryStore = vi.fn();
const mockClose = vi.fn();

vi.mock('@bic/openclaw-snap', () => ({
  startServer: (...args: unknown[]) => mockStartServer(...args),
  inMemoryStore: (...args: unknown[]) => mockInMemoryStore(...args),
}));

import { runSnapServe } from '../../src/commands/snap-serve.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  vi.restoreAllMocks();
  mockStartServer.mockReset();
  mockInMemoryStore.mockReset();
  mockInMemoryStore.mockReturnValue({ __store: true });
  mockClose.mockReset();
}

// Ensure inMemoryStore has a default return before any test runs.
mockInMemoryStore.mockReturnValue({ __store: true });

function makeHandle(overrides: { port?: number; url?: string } = {}) {
  mockClose.mockResolvedValue(undefined);
  return {
    port: overrides.port ?? 45678,
    url: overrides.url ?? `http://127.0.0.1:${overrides.port ?? 45678}`,
    close: mockClose,
  };
}

/**
 * Trigger runSnapServe's setup, then send SIGTERM to unpark and wait for the
 * stubbed process.exit to be called. The source parks on `new Promise(() => {})`
 * forever; the signal handler calls `handle.close().then(() => process.exit(0))`.
 * We stub process.exit as a no-op and wait for it to be invoked.
 */
async function runUntilShutdown(
  fn: () => Promise<number>,
): Promise<{ exitCode: number | undefined }> {
  let exitCalledWith: number | undefined;
  let resolveExit: () => void;
  const exitCalled = new Promise<void>((r) => {
    resolveExit = r;
  });
  const exitSpy = vi
    .spyOn(process, 'exit')
    .mockImplementation(((code?: number | string | null) => {
      exitCalledWith = typeof code === 'number' ? code : undefined;
      resolveExit();
      return undefined as never;
    }) as never);
  try {
    // Start the runner (it parks after printing). We don't await it.
    void fn();
    await new Promise((r) => setImmediate(r));
    process.emit('SIGTERM');
    await exitCalled;
    return { exitCode: exitCalledWith };
  } finally {
    exitSpy.mockRestore();
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  }
}

// ── Tests: happy path ──────────────────────────────────────────────────────

describe('claws snap serve (text output)', () => {
  afterEach(resetMocks);

  it('defaults port to 0 and host to 127.0.0.1; prints listening message', async () => {
    const handle = makeHandle({ port: 45678, url: 'http://127.0.0.1:45678' });
    mockStartServer.mockResolvedValue(handle);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const { exitCode } = await runUntilShutdown(() => runSnapServe({}));

      expect(mockStartServer).toHaveBeenCalledTimes(1);
      const call = mockStartServer.mock.calls[0]?.[0];
      expect(call).toEqual(
        expect.objectContaining({ port: 0, host: '127.0.0.1' }),
      );
      expect(call.store).toBeDefined();
      expect(mockInMemoryStore).toHaveBeenCalledTimes(1);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('snap serve listening on');
      expect(output).toContain('http://127.0.0.1:45678');

      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(exitCode).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('forwards explicit --port and --host flags', async () => {
    const handle = makeHandle({ port: 9000, url: 'http://0.0.0.0:9000' });
    mockStartServer.mockResolvedValue(handle);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runUntilShutdown(() =>
        runSnapServe({ port: 9000, host: '0.0.0.0' }),
      );

      expect(mockStartServer).toHaveBeenCalledWith(
        expect.objectContaining({ port: 9000, host: '0.0.0.0' }),
      );
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe('claws snap serve --json', () => {
  afterEach(resetMocks);

  it('prints listening JSON envelope with bound port, host, and url', async () => {
    const handle = makeHandle({ port: 51234, url: 'http://127.0.0.1:51234' });
    mockStartServer.mockResolvedValue(handle);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runUntilShutdown(() => runSnapServe({ json: true }));

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('listening');
      expect(parsed.port).toBe(51234);
      expect(parsed.host).toBe('127.0.0.1');
      expect(parsed.url).toBe('http://127.0.0.1:51234');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('reports explicit host in JSON envelope', async () => {
    const handle = makeHandle({ port: 9000, url: 'http://0.0.0.0:9000' });
    mockStartServer.mockResolvedValue(handle);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runUntilShutdown(() =>
        runSnapServe({ json: true, host: '0.0.0.0', port: 9000 }),
      );

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.host).toBe('0.0.0.0');
    } finally {
      logSpy.mockRestore();
    }
  });
});

// ── Tests: error paths ─────────────────────────────────────────────────────

describe('claws snap serve error handling', () => {
  afterEach(resetMocks);

  it('returns 1 and prints text error when startServer throws', async () => {
    mockStartServer.mockRejectedValue(new Error('EADDRINUSE'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapServe({});
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('snap serve: failed to start');
      expect(output).toContain('EADDRINUSE');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 and emits JSON error envelope when startServer throws with --json', async () => {
    mockStartServer.mockRejectedValue(new Error('Port in use'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapServe({ json: true });
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Port in use');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('converts non-Error throws to string in text mode', async () => {
    mockStartServer.mockRejectedValue('bare string');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapServe({});
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('bare string');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('converts non-Error throws to string in JSON mode', async () => {
    mockStartServer.mockRejectedValue(42);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSnapServe({ json: true });
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('42');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

// ── Tests: signal handling ─────────────────────────────────────────────────

describe('claws snap serve shutdown', () => {
  afterEach(resetMocks);

  it('calls handle.close() and exits 0 on SIGINT', async () => {
    const handle = makeHandle();
    mockStartServer.mockResolvedValue(handle);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    let exitCalledWith: number | undefined;
    let resolveExit: () => void;
    const exitCalled = new Promise<void>((r) => {
      resolveExit = r;
    });
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number | string | null) => {
        exitCalledWith = typeof code === 'number' ? code : undefined;
        resolveExit();
        return undefined as never;
      }) as never);
    try {
      void runSnapServe({});
      await new Promise((r) => setImmediate(r));
      process.emit('SIGINT');
      await exitCalled;

      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(exitCalledWith).toBe(0);
    } finally {
      logSpy.mockRestore();
      exitSpy.mockRestore();
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
    }
  });
});
