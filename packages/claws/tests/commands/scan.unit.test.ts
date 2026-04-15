/**
 * L0: scan command — fleet scan wiring, JSON/text output, error paths, progress.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockScanFleet = vi.fn();

vi.mock('@bic/claws-sdk/fleet', () => ({
  scanFleet: (...args: unknown[]) => mockScanFleet(...args),
}));

import { runScan } from '../../src/commands/scan.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeScanResult(overrides: Record<string, unknown> = {}) {
  return {
    workspaces: [],
    stats: {
      total: 0,
      governed: 0,
      ungoverned: 0,
      misconfigured: 0,
      directoriesScanned: 5,
      durationMs: 42,
    },
    errors: [],
    ...overrides,
  };
}

const defaultOpts = { json: false, recursive: false, color: false };

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws scan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 0 and prints "No OC workspaces found" when result is empty', async () => {
    mockScanFleet.mockResolvedValue(makeScanResult());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runScan('/tmp/test', defaultOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No OC workspaces found');
      expect(output).toContain('Scan complete');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints workspace details when workspaces are found', async () => {
    mockScanFleet.mockResolvedValue(
      makeScanResult({
        workspaces: [
          {
            path: '/projects/app1',
            classification: 'GOVERNED',
            markers: ['CLAUDE.md', 'TOOLS.md'],
            rationale: 'Has .claws/ with valid config',
          },
          {
            path: '/projects/app2',
            classification: 'UNGOVERNED',
            markers: ['SOUL.md'],
            rationale: 'No .claws/ directory found',
          },
        ],
        stats: {
          total: 2,
          governed: 1,
          ungoverned: 1,
          misconfigured: 0,
          directoriesScanned: 10,
          durationMs: 100,
        },
      }),
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runScan('/tmp/test', defaultOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('GOVERNED');
      expect(output).toContain('/projects/app1');
      expect(output).toContain('CLAUDE.md, TOOLS.md');
      expect(output).toContain('UNGOVERNED');
      expect(output).toContain('/projects/app2');
      expect(output).toContain('governed: 1');
      expect(output).toContain('ungoverned: 1');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints workspace with no markers (empty markers array)', async () => {
    mockScanFleet.mockResolvedValue(
      makeScanResult({
        workspaces: [
          {
            path: '/projects/app3',
            classification: 'MISCONFIGURED',
            markers: [],
            rationale: 'Config invalid',
          },
        ],
        stats: {
          total: 1,
          governed: 0,
          ungoverned: 0,
          misconfigured: 1,
          directoriesScanned: 3,
          durationMs: 20,
        },
      }),
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runScan('/tmp/test', defaultOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('MISCONFIGURED');
      // Should NOT print markers line when array is empty
      expect(output).not.toContain('markers:');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints scan errors when result has errors', async () => {
    mockScanFleet.mockResolvedValue(
      makeScanResult({
        errors: [
          { path: '/projects/broken', message: 'Permission denied' },
        ],
      }),
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runScan('/tmp/test', defaultOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Errors (1)');
      expect(output).toContain('/projects/broken');
      expect(output).toContain('Permission denied');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON when --json flag is set', async () => {
    const result = makeScanResult({
      workspaces: [
        {
          path: '/projects/app1',
          classification: 'GOVERNED',
          markers: ['CLAUDE.md'],
          rationale: 'Valid',
        },
      ],
      stats: {
        total: 1,
        governed: 1,
        ungoverned: 0,
        misconfigured: 0,
        directoriesScanned: 5,
        durationMs: 50,
      },
    });
    mockScanFleet.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runScan('/tmp/test', { ...defaultOpts, json: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.workspaces).toHaveLength(1);
      expect(parsed.workspaces[0].classification).toBe('GOVERNED');
      expect(parsed.stats.total).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 and prints error message when scanFleet throws', async () => {
    mockScanFleet.mockRejectedValue(new Error('Disk read failure'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runScan('/tmp/test', defaultOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Disk read failure');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error to stderr when scanFleet throws with --json', async () => {
    mockScanFleet.mockRejectedValue(new Error('Network error'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runScan('/tmp/test', { ...defaultOpts, json: true });
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Network error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throws by converting to string', async () => {
    mockScanFleet.mockRejectedValue('raw string error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runScan('/tmp/test', defaultOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw string error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('passes maxDepth=1 when recursive=false', async () => {
    mockScanFleet.mockResolvedValue(makeScanResult());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runScan('/tmp/test', { ...defaultOpts, recursive: false });

      expect(mockScanFleet).toHaveBeenCalledWith(
        '/tmp/test',
        { maxDepth: 1 },
        expect.any(Function),
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('passes maxDepth=10 when recursive=true', async () => {
    mockScanFleet.mockResolvedValue(makeScanResult());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runScan('/tmp/test', { ...defaultOpts, recursive: true });

      expect(mockScanFleet).toHaveBeenCalledWith(
        '/tmp/test',
        { maxDepth: 10 },
        expect.any(Function),
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('passes undefined progressHandler when json=true', async () => {
    mockScanFleet.mockResolvedValue(makeScanResult());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runScan('/tmp/test', { ...defaultOpts, json: true });

      expect(mockScanFleet).toHaveBeenCalledWith(
        '/tmp/test',
        { maxDepth: 1 },
        undefined,
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('progress handler writes to stderr for started events', async () => {
    mockScanFleet.mockImplementation(
      async (_dir: string, _opts: unknown, handler?: (e: unknown) => void) => {
        if (handler) {
          handler({ type: 'started', path: '/projects/app1' });
        }
        return makeScanResult();
      },
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      await runScan('/tmp/test', defaultOpts);

      expect(stderrSpy).toHaveBeenCalledWith('  scanning /projects/app1\n');
    } finally {
      logSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});
