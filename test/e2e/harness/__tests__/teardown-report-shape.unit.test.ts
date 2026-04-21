import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  writeTeardownReport,
  teardownReportPath,
  DEFAULT_TEARDOWN_BASE_DIR,
  type TeardownReport,
} from '#harness/teardown-report.ts';

function makeBaseDir(): string {
  return mkdtempSync(join(tmpdir(), 'teardown-report-'));
}

describe('TeardownReport shape + writer', () => {
  it('well-formed on clean exit: writes a valid 5-field report with empty residuals', () => {
    const baseDir = makeBaseDir();
    const clean: TeardownReport = {
      snapExit: {
        pid: 4321,
        exitCode: 0,
        signal: null,
        reapedAt: 1_700_000_000_000,
      },
      tmpCleanup: { tmpDir: '/tmp/scenario-a', removed: true },
      residuals: [],
      leaks: { residuals: [] },
      auditChainOk: { ok: true },
    };
    const filePath = writeTeardownReport(clean, {
      suite: 'scenario-a',
      timestamp: 1_700_000_000_000,
      baseDir,
    });
    expect(filePath).not.toBeNull();
    expect(filePath!).toBe(join(baseDir, 'scenario-a-1700000000000.json'));
    expect(existsSync(filePath!)).toBe(true);

    const parsed = JSON.parse(readFileSync(filePath!, 'utf8')) as TeardownReport;
    expect(parsed.residuals).toEqual([]);
    expect(parsed.leaks.residuals).toEqual([]);
    expect(parsed.auditChainOk.ok).toBe(true);
    expect(parsed.snapExit.exitCode).toBe(0);
    expect(parsed.tmpCleanup.removed).toBe(true);
  });

  it('residuals listed on zombie: report carries pid + label per tracked residual', () => {
    const baseDir = makeBaseDir();
    const zombie: TeardownReport = {
      snapExit: {
        pid: 9999,
        exitCode: null,
        signal: 'SIGKILL',
        reapedAt: 1_700_000_001_000,
      },
      tmpCleanup: {
        tmpDir: '/tmp/scenario-b',
        removed: false,
        error: 'EBUSY: resource busy',
      },
      residuals: [
        { pid: 9999, label: 'snap-runner' },
        { pid: 10000, label: 'snap-child' },
      ],
      leaks: {
        residuals: [{ pid: 9999, label: 'snap-runner' }],
      },
      auditChainOk: { ok: false, reason: 'orphan-approval', atSeq: 3 },
    };
    const filePath = writeTeardownReport(zombie, {
      suite: 'scenario-b',
      timestamp: 1_700_000_001_000,
      baseDir,
    });
    expect(filePath).not.toBeNull();

    const parsed = JSON.parse(readFileSync(filePath!, 'utf8')) as TeardownReport;
    expect(parsed.residuals).toHaveLength(2);
    expect(parsed.residuals[0]!.label).toBe('snap-runner');
    expect(parsed.residuals[1]!.pid).toBe(10000);
    expect(parsed.leaks.residuals).toHaveLength(1);
    expect(parsed.auditChainOk.ok).toBe(false);
    if (!parsed.auditChainOk.ok) {
      expect(parsed.auditChainOk.reason).toBe('orphan-approval');
    }
    expect(parsed.tmpCleanup.error).toBe('EBUSY: resource busy');
  });

  it('write failure returns null instead of throwing', () => {
    // Force mkdirSync to fail by pointing at an invalid path (null byte
    // triggers ENOENT on Windows and Linux without creating anything).
    const bad: TeardownReport = {
      snapExit: { pid: 1, exitCode: 0, signal: null, reapedAt: 0 },
      tmpCleanup: { tmpDir: null, removed: true },
      residuals: [],
      leaks: { residuals: [] },
      auditChainOk: { ok: true },
    };
    const filePath = writeTeardownReport(bad, {
      suite: 'fail',
      timestamp: 0,
      baseDir: '\0invalid-parent-path',
    });
    expect(filePath).toBeNull();
  });

  it('teardownReportPath + DEFAULT_TEARDOWN_BASE_DIR expose pure path construction', () => {
    const withBase = teardownReportPath({
      suite: 'x',
      timestamp: 7,
      baseDir: '/tmp/dir',
    });
    expect(withBase.endsWith('x-7.json')).toBe(true);
    // Default base dir path assembly — exercises the fallback branch.
    const withDefault = teardownReportPath({ suite: 'y', timestamp: 8 });
    expect(withDefault.endsWith('y-8.json')).toBe(true);
    expect(DEFAULT_TEARDOWN_BASE_DIR).toBe('test/e2e/.teardown-reports');
  });
});
