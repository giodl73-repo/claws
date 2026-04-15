/**
 * L0: doctor command — health checks, migration, JSON/text output, error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockRunDoctor = vi.fn();
const mockCreateDefaultChecks = vi.fn().mockReturnValue([]);
const mockRunMigrations = vi.fn();

vi.mock('@bic/claws-sdk/doctor', () => ({
  runDoctor: (...args: unknown[]) => mockRunDoctor(...args),
  createDefaultChecks: (...args: unknown[]) => mockCreateDefaultChecks(...args),
  runMigrations: (...args: unknown[]) => mockRunMigrations(...args),
}));

import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runDoctorCmd } from '../../src/commands/doctor.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    workspaceRoot: '/tmp/fake-ws',
    hasConfig: true,
    config: { trustTier: 2 },
    bypass: false,
    suppressedRules: [],
    ...overrides,
  };
}

function healthyReport() {
  return {
    checks: [
      {
        checkId: 'config-schema',
        name: 'Config schema validation',
        passed: true,
        diagnostics: [],
        durationMs: 3,
      },
    ],
    diagnostics: [],
    durationMs: 10,
    healthy: true,
    summary: { errors: 0, warnings: 0, infos: 0 },
  };
}

function unhealthyReport() {
  return {
    checks: [
      {
        checkId: 'config-schema',
        name: 'Config schema validation',
        passed: false,
        diagnostics: [
          {
            checkId: 'config-schema',
            severity: 'error' as const,
            message: 'Missing trustTier field',
            fixable: true,
          },
          {
            checkId: 'config-schema',
            severity: 'warning' as const,
            message: 'Deprecated field found',
            fixable: false,
          },
          {
            checkId: 'config-schema',
            severity: 'info' as const,
            message: 'Schema version is 1',
            fixable: false,
          },
        ],
        durationMs: 5,
      },
    ],
    diagnostics: [],
    durationMs: 15,
    healthy: false,
    summary: { errors: 1, warnings: 1, infos: 1 },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws doctor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── No workspace ────────────────────────────────────────────────────────

  it('returns exit 3 when no workspace is detected (text)', async () => {
    const ctx = makeCtx({ hasConfig: false });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: false, fix: false });
      expect(code).toBe(3);
      expect(spy.mock.calls.flat().join(' ')).toContain('CLAWS-E010');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns exit 3 when no workspace is detected (json)', async () => {
    const ctx = makeCtx({ hasConfig: false });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: true, color: false, postUpgrade: false, fix: false });
      expect(code).toBe(3);
      const parsed = JSON.parse(spy.mock.calls.flat().join(''));
      expect(parsed.error.code).toBe('CLAWS-E010');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Healthy workspace ───────────────────────────────────────────────────

  it('returns 0 when workspace is healthy (text)', async () => {
    mockRunDoctor.mockResolvedValue(healthyReport());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: false, fix: false });
      expect(code).toBe(0);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('claws doctor');
      expect(output).toContain('PASS');
      expect(output).toContain('Workspace is healthy');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns 0 when workspace is healthy (json)', async () => {
    const report = healthyReport();
    mockRunDoctor.mockResolvedValue(report);
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: true, color: false, postUpgrade: false, fix: false });
      expect(code).toBe(0);
      const parsed = JSON.parse(spy.mock.calls.flat().join(''));
      expect(parsed.healthy).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  // ── Unhealthy workspace ─────────────────────────────────────────────────

  it('returns 1 when workspace has issues (text)', async () => {
    mockRunDoctor.mockResolvedValue(unhealthyReport());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: false, fix: false });
      expect(code).toBe(1);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('FAIL');
      expect(output).toContain('Workspace has issues');
      expect(output).toContain('ERROR');
      expect(output).toContain('WARN');
      expect(output).toContain('INFO');
      expect(output).toContain('(fixable)');
      expect(output).toContain('1 error(s)');
      expect(output).toContain('1 warning(s)');
      expect(output).toContain('1 info(s)');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns 1 when workspace has issues (json)', async () => {
    const report = unhealthyReport();
    mockRunDoctor.mockResolvedValue(report);
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: true, color: false, postUpgrade: false, fix: false });
      expect(code).toBe(1);
      const parsed = JSON.parse(spy.mock.calls.flat().join(''));
      expect(parsed.healthy).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  // ── postUpgrade flag ────────────────────────────────────────────────────

  it('passes postUpgrade option to createDefaultChecks', async () => {
    mockRunDoctor.mockResolvedValue(healthyReport());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: true, fix: false });
      expect(mockCreateDefaultChecks).toHaveBeenCalledWith({ postUpgrade: true });
    } finally {
      spy.mockRestore();
    }
  });

  // ── --fix: successful migration ─────────────────────────────────────────

  it('runs migration and doctor when --fix is set (text)', async () => {
    mockRunMigrations.mockResolvedValue({
      migrated: true,
      fromVersion: 1,
      toVersion: 2,
      applied: [{ fromVersion: 1, toVersion: 2, description: 'Rename trustLevel to trustTier' }],
      backupPath: '/tmp/fake-ws/.claws/backup/claws.json.bak',
      error: null,
    });
    mockRunDoctor.mockResolvedValue(healthyReport());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: false, fix: true });
      expect(code).toBe(0);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('Migrated config from v1');
      expect(output).toContain('v2');
      expect(output).toContain('Rename trustLevel to trustTier');
      expect(output).toContain('Backup saved to');
    } finally {
      spy.mockRestore();
    }
  });

  it('runs migration and doctor when --fix is set (json)', async () => {
    const migrationResult = {
      migrated: true,
      fromVersion: 1,
      toVersion: 2,
      applied: [{ fromVersion: 1, toVersion: 2, description: 'Rename trustLevel to trustTier' }],
      backupPath: null,
      error: null,
    };
    mockRunMigrations.mockResolvedValue(migrationResult);
    mockRunDoctor.mockResolvedValue(healthyReport());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: true, color: false, postUpgrade: false, fix: true });
      expect(code).toBe(0);
      // First JSON output is migration, second is doctor report
      const calls = spy.mock.calls.flat();
      const migration = JSON.parse(calls[0] as string);
      expect(migration.migrated).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  // ── --fix: no migration needed ──────────────────────────────────────────

  it('shows "already current" when no migration needed (text)', async () => {
    mockRunMigrations.mockResolvedValue({
      migrated: false,
      fromVersion: 2,
      toVersion: 2,
      applied: [],
      backupPath: null,
      error: null,
    });
    mockRunDoctor.mockResolvedValue(healthyReport());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: false, fix: true });
      expect(code).toBe(0);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('already current');
    } finally {
      spy.mockRestore();
    }
  });

  // ── --fix: migration error ──────────────────────────────────────────────

  it('returns 1 when migration fails (text)', async () => {
    mockRunMigrations.mockResolvedValue({
      migrated: false,
      fromVersion: 1,
      toVersion: 1,
      applied: [],
      backupPath: null,
      error: 'Permission denied writing claws.json',
    });
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: false, fix: true });
      expect(code).toBe(1);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('Migration failed');
      expect(output).toContain('Permission denied');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns 1 when migration fails (json)', async () => {
    mockRunMigrations.mockResolvedValue({
      migrated: false,
      fromVersion: 1,
      toVersion: 1,
      applied: [],
      backupPath: null,
      error: 'Permission denied writing claws.json',
    });
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runDoctorCmd(ctx, { json: true, color: false, postUpgrade: false, fix: true });
      expect(code).toBe(1);
      const parsed = JSON.parse(spy.mock.calls.flat().join(''));
      expect(parsed.error).toContain('Permission denied');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Summary rendering edge cases ────────────────────────────────────────

  it('renders summary with only errors', async () => {
    mockRunDoctor.mockResolvedValue({
      ...unhealthyReport(),
      summary: { errors: 3, warnings: 0, infos: 0 },
    });
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: false, fix: false });
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('3 error(s)');
      expect(output).not.toContain('warning(s)');
      expect(output).not.toContain('info(s)');
    } finally {
      spy.mockRestore();
    }
  });

  it('renders summary with only warnings', async () => {
    mockRunDoctor.mockResolvedValue({
      ...healthyReport(),
      summary: { errors: 0, warnings: 2, infos: 0 },
    });
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: false, fix: false });
      const output = spy.mock.calls.flat().join(' ');
      expect(output).not.toContain('error(s)');
      expect(output).toContain('2 warning(s)');
      expect(output).not.toContain('info(s)');
    } finally {
      spy.mockRestore();
    }
  });

  it('renders summary with only infos', async () => {
    mockRunDoctor.mockResolvedValue({
      ...healthyReport(),
      summary: { errors: 0, warnings: 0, infos: 4 },
    });
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runDoctorCmd(ctx, { json: false, color: false, postUpgrade: false, fix: false });
      const output = spy.mock.calls.flat().join(' ');
      expect(output).not.toContain('error(s)');
      expect(output).not.toContain('warning(s)');
      expect(output).toContain('4 info(s)');
    } finally {
      spy.mockRestore();
    }
  });
});
