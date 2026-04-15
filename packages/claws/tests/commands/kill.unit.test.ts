/**
 * L0: kill command — single workspace + fleet kill wiring, JSON/text output, error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockGuardedKill = vi.fn();
const mockKillFleet = vi.fn();

vi.mock('@bic/claws-sdk/fleet', () => ({
  guardedKill: (...args: unknown[]) => mockGuardedKill(...args),
  killFleet: (...args: unknown[]) => mockKillFleet(...args),
}));

import { runKill } from '../../src/commands/kill.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  vi.restoreAllMocks();
  mockGuardedKill.mockReset();
  mockKillFleet.mockReset();
}

// ── Tests: single workspace ────────────────────────────────────────────────

describe('claws kill (single workspace)', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and prints activated message on successful kill', async () => {
    mockGuardedKill.mockResolvedValue({
      activated: true,
      alreadyKilled: false,
      reactivated: false,
      sentinel: { actor: 'user@corp', timestamp: '2026-01-01T00:00:00Z' },
      message: 'Kill switch activated',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill('/ws', { reason: 'incident', json: false });
      expect(code).toBe(0);
      expect(mockGuardedKill).toHaveBeenCalledWith({
        workspacePath: expect.stringContaining('ws'),
        reason: 'incident',
      });

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Activated kill switch');
      expect(output).toContain('reason: incident');
      expect(output).toContain('actor: user@corp');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and prints re-activated when reactivated=true', async () => {
    mockGuardedKill.mockResolvedValue({
      activated: true,
      alreadyKilled: false,
      reactivated: true,
      sentinel: { actor: 'admin', timestamp: '2026-01-02T00:00:00Z' },
      message: 'Re-activated',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill('/ws', { reason: 'test', json: false });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Re-activated kill switch');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and prints "Already killed" when alreadyKilled=true', async () => {
    mockGuardedKill.mockResolvedValue({
      activated: false,
      alreadyKilled: true,
      reactivated: false,
      sentinel: { actor: 'admin', timestamp: '2026-01-01T00:00:00Z' },
      message: 'Already killed',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill('/ws', { reason: 'check', json: false });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Already killed');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and prints failure message when not activated and not alreadyKilled', async () => {
    mockGuardedKill.mockResolvedValue({
      activated: false,
      alreadyKilled: false,
      reactivated: false,
      sentinel: null,
      message: 'Workspace not found',
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKill('/ws', { reason: 'test', json: false });
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Failed to activate kill switch');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on success with --json', async () => {
    const result = {
      activated: true,
      alreadyKilled: false,
      reactivated: false,
      sentinel: { actor: 'admin', timestamp: '2026-01-01T00:00:00Z' },
      message: 'ok',
    };
    mockGuardedKill.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill('/ws', { reason: 'test', json: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.activated).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 for JSON when activated=false and alreadyKilled=false', async () => {
    mockGuardedKill.mockResolvedValue({
      activated: false,
      alreadyKilled: false,
      reactivated: false,
      sentinel: null,
      message: 'noop',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill('/ws', { reason: 'test', json: true });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 and prints error when guardedKill throws', async () => {
    mockGuardedKill.mockRejectedValue(new Error('Permission denied'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKill('/ws', { reason: 'test', json: false });
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Permission denied');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error when guardedKill throws with --json', async () => {
    mockGuardedKill.mockRejectedValue(new Error('Disk error'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill('/ws', { reason: 'test', json: true });
      expect(code).toBe(3);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Disk error');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockGuardedKill.mockRejectedValue('raw error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKill('/ws', { reason: 'test', json: false });
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('raw error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('defaults workspace to "." when undefined', async () => {
    mockGuardedKill.mockResolvedValue({
      activated: true,
      alreadyKilled: false,
      reactivated: false,
      sentinel: { actor: 'admin', timestamp: '2026-01-01T00:00:00Z' },
      message: 'ok',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runKill(undefined, { reason: 'test', json: false });
      expect(mockGuardedKill).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'test' }),
      );
    } finally {
      logSpy.mockRestore();
    }
  });
});

// ── Tests: fleet kill ──────────────────────────────────────────────────────

describe('claws kill --fleet', () => {
  afterEach(() => {
    resetMocks();
  });

  it('returns 0 and prints fleet summary on success', async () => {
    mockKillFleet.mockResolvedValue({
      totalDiscovered: 3,
      activated: 2,
      alreadyKilled: 1,
      reactivated: 0,
      failed: 0,
      results: [
        { workspacePath: '/ws/a', activated: true, reactivated: false, alreadyKilled: false, message: 'killed' },
        { workspacePath: '/ws/b', activated: true, reactivated: false, alreadyKilled: false, message: 'killed' },
        { workspacePath: '/ws/c', activated: false, reactivated: false, alreadyKilled: true, message: 'already killed' },
      ],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill(undefined, { fleet: '/fleet', reason: 'incident', json: false });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Fleet kill complete');
      expect(output).toContain('discovered: 3');
      expect(output).toContain('activated: 2');
      expect(output).toContain('already killed: 1');
      expect(output).toContain('failed: 0');
      expect(output).toContain('KILL');
      expect(output).toContain('SKIP');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints REACT tag for reactivated workspaces', async () => {
    mockKillFleet.mockResolvedValue({
      totalDiscovered: 1,
      activated: 1,
      alreadyKilled: 0,
      reactivated: 1,
      failed: 0,
      results: [
        { workspacePath: '/ws/a', activated: true, reactivated: true, alreadyKilled: false, message: 're-activated' },
      ],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill(undefined, { fleet: '/fleet', reason: 'test', json: false });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('REACT');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints FAIL tag for failed workspaces', async () => {
    mockKillFleet.mockResolvedValue({
      totalDiscovered: 1,
      activated: 0,
      alreadyKilled: 0,
      reactivated: 0,
      failed: 1,
      results: [
        { workspacePath: '/ws/a', activated: false, reactivated: false, alreadyKilled: false, message: 'no permission' },
      ],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill(undefined, { fleet: '/fleet', reason: 'test', json: false });
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('FAIL');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on fleet success with --json', async () => {
    const result = {
      totalDiscovered: 1,
      activated: 1,
      alreadyKilled: 0,
      reactivated: 0,
      failed: 0,
      results: [],
    };
    mockKillFleet.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill(undefined, { fleet: '/fleet', reason: 'test', json: true });
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.totalDiscovered).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 for JSON when fleet has failures', async () => {
    mockKillFleet.mockResolvedValue({
      totalDiscovered: 2,
      activated: 1,
      alreadyKilled: 0,
      reactivated: 0,
      failed: 1,
      results: [],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill(undefined, { fleet: '/fleet', reason: 'test', json: true });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 3 when killFleet throws', async () => {
    mockKillFleet.mockRejectedValue(new Error('Fleet scan failed'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKill(undefined, { fleet: '/fleet', reason: 'test', json: false });
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Fleet scan failed');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 and outputs JSON error when killFleet throws with --json', async () => {
    mockKillFleet.mockRejectedValue(new Error('Network error'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runKill(undefined, { fleet: '/fleet', reason: 'test', json: true });
      expect(code).toBe(3);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Network error');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles non-Error throw from killFleet by converting to string', async () => {
    mockKillFleet.mockRejectedValue(42);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runKill(undefined, { fleet: '/fleet', reason: 'test', json: false });
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('42');
    } finally {
      errorSpy.mockRestore();
    }
  });
});
