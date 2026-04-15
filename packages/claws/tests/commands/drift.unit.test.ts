/**
 * L0: drift command — fleet drift detection wiring, JSON/text output, error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockScanFleet = vi.fn();
const mockDetectDrift = vi.fn();
const mockLoadBaseline = vi.fn();
const mockLoadExceptions = vi.fn();

vi.mock('@bic/claws-sdk/fleet', () => ({
  scanFleet: (...args: unknown[]) => mockScanFleet(...args),
  detectDrift: (...args: unknown[]) => mockDetectDrift(...args),
  loadBaseline: (...args: unknown[]) => mockLoadBaseline(...args),
  loadExceptions: (...args: unknown[]) => mockLoadExceptions(...args),
}));

import { runDrift } from '../../src/commands/drift.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  vi.restoreAllMocks();
  mockScanFleet.mockReset();
  mockDetectDrift.mockReset();
  mockLoadBaseline.mockReset();
  mockLoadExceptions.mockReset();
}

const defaultOpts = { json: false, baseline: 'latest' };

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws drift', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and prints "No governed workspaces found" when scan finds none', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [
        { path: '/ws/a', classification: 'UNGOVERNED' },
      ],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', defaultOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No governed workspaces found');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON when no governed workspaces found with --json', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({ workspaces: [] });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', { json: true, baseline: 'latest' });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.results).toHaveLength(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 when all workspaces are clean', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockDetectDrift.mockResolvedValue([
      { workspacePath: '/ws/a', status: 'clean', driftDetected: false, suppressed: false },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', defaultOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('CLEAN');
      expect(output).toContain('clean: 1');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 when drift is detected (unsuppressed)', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockDetectDrift.mockResolvedValue([
      {
        workspacePath: '/ws/a',
        status: 'drifted',
        driftDetected: true,
        suppressed: false,
        severity: 'high',
      },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', defaultOpts);
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('DRIFTED');
      expect(output).toContain('severity: high');
      expect(output).toContain('drifted: 1');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 when drift is suppressed', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockDetectDrift.mockResolvedValue([
      {
        workspacePath: '/ws/a',
        status: 'suppressed',
        driftDetected: true,
        suppressed: true,
        suppressionReason: 'Approved exception EX-001',
      },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', defaultOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('SUPPRESSED');
      expect(output).toContain('suppressed: Approved exception EX-001');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders no-baseline status with hint text', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockDetectDrift.mockResolvedValue([
      {
        workspacePath: '/ws/a',
        status: 'no-baseline',
        driftDetected: false,
        suppressed: false,
      },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', defaultOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('NO-BASELINE');
      expect(output).toContain('no baseline configured');
      expect(output).toContain('no-baseline: 1');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and outputs JSON when drift detected with --json', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    const results = [
      { workspacePath: '/ws/a', status: 'drifted', driftDetected: true, suppressed: false },
    ];
    mockDetectDrift.mockResolvedValue(results);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', { json: true, baseline: 'latest' });
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].status).toBe('drifted');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 JSON when all clean', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockDetectDrift.mockResolvedValue([
      { workspacePath: '/ws/a', status: 'clean', driftDetected: false, suppressed: false },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', { json: true, baseline: 'latest' });
      expect(code).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 and prints error when scanFleet throws', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockRejectedValue(new Error('Disk read failure'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', defaultOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Disk read failure');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error when scanFleet throws with --json', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockRejectedValue(new Error('Network error'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', { json: true, baseline: 'latest' });
      expect(code).toBe(3);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Network error');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockRejectedValue('raw string error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', defaultOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw string error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 when detectDrift throws (text mode)', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockDetectDrift.mockRejectedValue(new Error('Drift engine failure'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', defaultOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Drift engine failure');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error when detectDrift throws with --json', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockDetectDrift.mockRejectedValue(new Error('Hash computation failed'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', { json: true, baseline: 'latest' });
      expect(code).toBe(3);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Hash computation failed');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles non-Error throw from detectDrift', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockDetectDrift.mockRejectedValue('raw drift error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runDrift('/fleet', defaultOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw drift error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('only passes GOVERNED workspaces to detectDrift', async () => {
    mockLoadBaseline.mockResolvedValue({});
    mockLoadExceptions.mockResolvedValue([]);
    mockScanFleet.mockResolvedValue({
      workspaces: [
        { path: '/ws/a', classification: 'GOVERNED' },
        { path: '/ws/b', classification: 'UNGOVERNED' },
        { path: '/ws/c', classification: 'GOVERNED' },
      ],
    });
    mockDetectDrift.mockResolvedValue([
      { workspacePath: '/ws/a', status: 'clean', driftDetected: false, suppressed: false },
      { workspacePath: '/ws/c', status: 'clean', driftDetected: false, suppressed: false },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runDrift('/fleet', defaultOpts);

      expect(mockDetectDrift).toHaveBeenCalledWith(
        ['/ws/a', '/ws/c'],
        expect.anything(),
        expect.anything(),
      );
    } finally {
      logSpy.mockRestore();
    }
  });
});
