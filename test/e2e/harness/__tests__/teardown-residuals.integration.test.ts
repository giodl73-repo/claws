import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import {
  writeTeardownReport,
  type TeardownReport,
} from '#harness/teardown-report.ts';
import {
  listTracked,
  trackPid,
  untrackPid,
  checkLeaks,
  _resetRegistryForTests,
} from '#harness/lifecycle.ts';

const createdDirs: string[] = [];

afterEach(() => {
  _resetRegistryForTests();
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
});

function makeBaseDir(): string {
  const d = mkdtempSync(join(tmpdir(), 'teardown-residuals-int-'));
  createdDirs.push(d);
  return d;
}

describe('teardown-residuals integration (harness observability)', () => {
  it('clean exit: no tracked PIDs → empty residuals + leaks', async () => {
    const baseDir = makeBaseDir();
    const report: TeardownReport = {
      snapExit: { pid: 5555, exitCode: 0, signal: null, reapedAt: Date.now() },
      tmpCleanup: { tmpDir: baseDir, removed: true },
      residuals: listTracked(),
      leaks: checkLeaks(),
      auditChainOk: { ok: true },
    };
    const filePath = writeTeardownReport(report, {
      suite: 'clean-exit',
      timestamp: Date.now(),
      baseDir,
    });
    expect(filePath).not.toBeNull();
    const parsed = JSON.parse(readFileSync(filePath!, 'utf8')) as TeardownReport;
    expect(parsed.residuals).toEqual([]);
    expect(parsed.leaks.residuals).toEqual([]);
  });

  it('crashed snap reaped: residual pid captured before untrack', async () => {
    const baseDir = makeBaseDir();
    // Spawn a short-lived child, track it, then let it exit.
    const child = spawn(process.execPath, ['-e', 'process.exit(0);']);
    const pid = child.pid!;
    trackPid(pid, { label: 'snap-runner' });
    // Before untracking, residuals include our PID.
    expect(listTracked().some((r) => r.pid === pid)).toBe(true);

    await new Promise<void>((resolve) => child.once('exit', () => resolve()));

    // Snapshot residuals BEFORE untrack — simulates a crashed-reap path.
    const residualsBeforeUntrack = listTracked();
    expect(residualsBeforeUntrack.some((r) => r.pid === pid)).toBe(true);
    untrackPid(pid);

    const report: TeardownReport = {
      snapExit: {
        pid,
        exitCode: child.exitCode,
        signal: child.signalCode,
        reapedAt: Date.now(),
      },
      tmpCleanup: { tmpDir: baseDir, removed: true },
      residuals: residualsBeforeUntrack,
      leaks: checkLeaks(),
      auditChainOk: { ok: true },
    };
    const filePath = writeTeardownReport(report, {
      suite: 'crashed-snap-reap',
      timestamp: Date.now(),
      baseDir,
    });
    const parsed = JSON.parse(readFileSync(filePath!, 'utf8')) as TeardownReport;
    expect(parsed.residuals.some((r) => r.pid === pid)).toBe(true);
  });

  it('locked tmp file retried: cleanup reports removed=false on failure', () => {
    const baseDir = makeBaseDir();
    // Synthesize a locked-tmp outcome — the writer records removed=false.
    const locked: TeardownReport = {
      snapExit: { pid: 7777, exitCode: 0, signal: null, reapedAt: Date.now() },
      tmpCleanup: {
        tmpDir: '/tmp/locked-by-av',
        removed: false,
        error: 'EBUSY: resource busy',
      },
      residuals: [],
      leaks: { residuals: [] },
      auditChainOk: { ok: true },
    };
    const filePath = writeTeardownReport(locked, {
      suite: 'locked-tmp',
      timestamp: Date.now(),
      baseDir,
    });
    const parsed = JSON.parse(readFileSync(filePath!, 'utf8')) as TeardownReport;
    expect(parsed.tmpCleanup.removed).toBe(false);
    expect(parsed.tmpCleanup.error).toContain('EBUSY');
  });

  it('leak-check at suite end: checkLeaks() returns [] for a cleaned registry', () => {
    const baseDir = makeBaseDir();
    _resetRegistryForTests();
    const report: TeardownReport = {
      snapExit: { pid: 8888, exitCode: 0, signal: null, reapedAt: Date.now() },
      tmpCleanup: { tmpDir: baseDir, removed: true },
      residuals: listTracked(),
      leaks: checkLeaks(),
      auditChainOk: { ok: true },
    };
    const filePath = writeTeardownReport(report, {
      suite: 'leak-check-end',
      timestamp: Date.now(),
      baseDir,
    });
    expect(filePath).not.toBeNull();
    expect(existsSync(filePath!)).toBe(true);
    const parsed = JSON.parse(readFileSync(filePath!, 'utf8')) as TeardownReport;
    expect(parsed.leaks.residuals).toEqual([]);
  });
});
