/**
 * L0: report command — fleet report wiring, format selection, JSON/text/table output, error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockScanFleet = vi.fn();
const mockGenerateFleetReport = vi.fn();
const mockFormatReport = vi.fn();

vi.mock('@bic/claws-sdk/fleet', () => ({
  scanFleet: (...args: unknown[]) => mockScanFleet(...args),
  generateFleetReport: (...args: unknown[]) => mockGenerateFleetReport(...args),
  formatReport: (...args: unknown[]) => mockFormatReport(...args),
}));

import { runReport } from '../../src/commands/report.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  vi.restoreAllMocks();
  mockScanFleet.mockReset();
  mockGenerateFleetReport.mockReset();
  mockFormatReport.mockReset();
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws report', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and writes formatted output on success', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockGenerateFleetReport.mockResolvedValue({ summary: 'all good' });
    mockFormatReport.mockReturnValue('Report output text\n');

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'table',
        json: false,
      });
      expect(code).toBe(0);

      expect(mockScanFleet).toHaveBeenCalledWith(expect.stringContaining('fleet'), { maxDepth: 5 });
      expect(mockGenerateFleetReport).toHaveBeenCalled();
      expect(mockFormatReport).toHaveBeenCalledWith({ summary: 'all good' }, 'table');
      expect(writeSpy).toHaveBeenCalledWith('Report output text\n');
    } finally {
      writeSpy.mockRestore();
    }
  });

  it('uses json format when --json flag is set, overriding format option', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockGenerateFleetReport.mockResolvedValue({ summary: 'data' });
    mockFormatReport.mockReturnValue('{"report": true}');

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'table',
        json: true,
      });
      expect(code).toBe(0);
      expect(mockFormatReport).toHaveBeenCalledWith(expect.anything(), 'json');
    } finally {
      writeSpy.mockRestore();
    }
  });

  it('uses explicit format when not json and format is not auto', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockGenerateFleetReport.mockResolvedValue({});
    mockFormatReport.mockReturnValue('csv,data');

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'csv' as any,
        json: false,
      });
      expect(code).toBe(0);
      expect(mockFormatReport).toHaveBeenCalledWith(expect.anything(), 'csv');
    } finally {
      writeSpy.mockRestore();
    }
  });

  it('selects json format when auto and stdout is not TTY', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockGenerateFleetReport.mockResolvedValue({});
    mockFormatReport.mockReturnValue('{}');

    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'auto',
        json: false,
      });
      expect(code).toBe(0);
      expect(mockFormatReport).toHaveBeenCalledWith(expect.anything(), 'json');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
      writeSpy.mockRestore();
    }
  });

  it('selects table format when auto and stdout is TTY', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockGenerateFleetReport.mockResolvedValue({});
    mockFormatReport.mockReturnValue('table output');

    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'auto',
        json: false,
      });
      expect(code).toBe(0);
      expect(mockFormatReport).toHaveBeenCalledWith(expect.anything(), 'table');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
      writeSpy.mockRestore();
    }
  });

  it('returns 1 when no workspaces found (text mode)', async () => {
    mockScanFleet.mockResolvedValue({ workspaces: [] });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'table',
        json: false,
      });
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No workspaces found');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 when no workspaces found (json mode)', async () => {
    mockScanFleet.mockResolvedValue({ workspaces: [] });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'auto',
        json: true,
      });
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('No workspaces found');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and prints error when scanFleet throws (text mode)', async () => {
    mockScanFleet.mockRejectedValue(new Error('Permission denied'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'table',
        json: false,
      });
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Permission denied');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error when throws with --json', async () => {
    mockScanFleet.mockRejectedValue(new Error('Disk failure'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'auto',
        json: true,
      });
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Disk failure');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockScanFleet.mockRejectedValue('raw string');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runReport({
        fleet: '/fleet',
        format: 'table',
        json: false,
      });
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw string');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('passes baseline option to generateFleetReport', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockGenerateFleetReport.mockResolvedValue({});
    mockFormatReport.mockReturnValue('output');

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      await runReport({
        fleet: '/fleet',
        format: 'table',
        json: false,
        baseline: 'v2.0',
      });

      expect(mockGenerateFleetReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('fleet'),
        { baseline: 'v2.0' },
      );
    } finally {
      writeSpy.mockRestore();
    }
  });
});
