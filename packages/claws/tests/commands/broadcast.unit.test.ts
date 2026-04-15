/**
 * L0: broadcast command — fleet policy broadcast wiring, JSON/text output, dry-run/execute, error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockScanFleet = vi.fn();
const mockBroadcastPolicy = vi.fn();

vi.mock('@bic/claws-sdk/fleet', () => ({
  scanFleet: (...args: unknown[]) => mockScanFleet(...args),
  broadcastPolicy: (...args: unknown[]) => mockBroadcastPolicy(...args),
}));

import { runBroadcast } from '../../src/commands/broadcast.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  vi.restoreAllMocks();
  mockScanFleet.mockReset();
  mockBroadcastPolicy.mockReset();
}

const defaultOpts = { fleet: '/fleet', confirm: false, reason: 'policy update', json: false };

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws broadcast', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and prints dry-run preview when confirm=false', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [
        { path: '/ws/a', classification: 'GOVERNED' },
        { path: '/ws/b', classification: 'GOVERNED' },
      ],
    });
    mockBroadcastPolicy.mockResolvedValue({
      executed: false,
      preview: [
        { action: 'would_broadcast', path: '/ws/a', reason: 'policy applies' },
        { action: 'skip', path: '/ws/b', reason: 'already compliant' },
      ],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', defaultOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Dry run');
      expect(output).toContain('BROADCAST');
      expect(output).toContain('SKIP');
      expect(output).toContain('/ws/a');
      expect(output).toContain('/ws/b');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and prints executed summary when confirm=true and no failures', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockBroadcastPolicy.mockResolvedValue({
      executed: true,
      manifest: {
        policyFile: 'policy.yaml',
        reason: 'policy update',
        succeeded: 1,
        skippedCount: 0,
        failed: 0,
        results: [
          { path: '/ws/a', success: true, skipped: false, message: 'Applied' },
        ],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', { ...defaultOpts, confirm: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Broadcast complete');
      expect(output).toContain('succeeded: 1');
      expect(output).toContain('failed: 0');
      expect(output).toContain('OK');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 when executed with failures', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockBroadcastPolicy.mockResolvedValue({
      executed: true,
      manifest: {
        policyFile: 'policy.yaml',
        reason: 'update',
        succeeded: 0,
        skippedCount: 0,
        failed: 1,
        results: [
          { path: '/ws/a', success: false, skipped: false, message: 'Write failed' },
        ],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', { ...defaultOpts, confirm: true });
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('FAIL');
      expect(output).toContain('Write failed');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints SKIP tag for skipped results', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockBroadcastPolicy.mockResolvedValue({
      executed: true,
      manifest: {
        policyFile: 'policy.yaml',
        reason: 'update',
        succeeded: 0,
        skippedCount: 1,
        failed: 0,
        results: [
          { path: '/ws/a', success: false, skipped: true, message: 'Already up to date' },
        ],
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', { ...defaultOpts, confirm: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('SKIP');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on dry-run with --json', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    const result = {
      executed: false,
      preview: [{ action: 'would_broadcast', path: '/ws/a', reason: 'applies' }],
    };
    mockBroadcastPolicy.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', { ...defaultOpts, json: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.executed).toBe(false);
      expect(parsed.preview).toHaveLength(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on executed result with --json', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    const result = {
      executed: true,
      manifest: {
        policyFile: 'policy.yaml',
        reason: 'update',
        succeeded: 1,
        skippedCount: 0,
        failed: 0,
        results: [],
      },
    };
    mockBroadcastPolicy.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', { ...defaultOpts, json: true, confirm: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.executed).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 when no workspaces found (text mode)', async () => {
    mockScanFleet.mockResolvedValue({ workspaces: [] });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', defaultOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No workspaces found');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 when no workspaces found (json mode)', async () => {
    mockScanFleet.mockResolvedValue({ workspaces: [] });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', { ...defaultOpts, json: true });
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('No workspaces found');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 and prints error when scanFleet throws', async () => {
    mockScanFleet.mockRejectedValue(new Error('Permission denied'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', defaultOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Permission denied');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error when throws with --json', async () => {
    mockScanFleet.mockRejectedValue(new Error('Disk failure'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', { ...defaultOpts, json: true });
      expect(code).toBe(3);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Disk failure');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockScanFleet.mockRejectedValue('raw error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', defaultOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 when broadcastPolicy throws', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockBroadcastPolicy.mockRejectedValue(new Error('Invalid policy YAML'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runBroadcast('policy.yaml', defaultOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Invalid policy YAML');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('passes confirm and reason to broadcastPolicy', async () => {
    mockScanFleet.mockResolvedValue({
      workspaces: [{ path: '/ws/a', classification: 'GOVERNED' }],
    });
    mockBroadcastPolicy.mockResolvedValue({ executed: false, preview: [] });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runBroadcast('my-policy.yaml', {
        fleet: '/fleet',
        confirm: true,
        reason: 'hotfix',
        json: false,
      });

      expect(mockBroadcastPolicy).toHaveBeenCalledWith(
        expect.stringContaining('my-policy.yaml'),
        expect.any(Array),
        { confirm: true, reason: 'hotfix' },
      );
    } finally {
      logSpy.mockRestore();
    }
  });
});
