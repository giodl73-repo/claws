/**
 * test/e2e/harness/teardown-report — harness-level teardown shape + writer.
 *
 * A `TeardownReport` captures the five invariants a scenario suite MUST verify
 * at teardown time:
 *
 *   - `snapExit`         → snap-runner exit status (PID reaped, exit code)
 *   - `tmpCleanup`       → fixture-copier's tmp copy removed
 *   - `residuals`        → lifecycle.listTracked() residual PIDs at shutdown
 *   - `leaks`            → lifecycle.checkLeaks() delta report
 *   - `auditChainOk`     → `verifyChain(AuditChainReader.all())` oracle result
 *
 * Reports are persisted to `test/e2e/.teardown-reports/{suite}-{timestamp}.json`
 * so post-run triage can review the full invariant set without re-running the
 * suite. `writeTeardownReport` creates the directory on first write and is
 * safe to call from inside a finally block (silent no-op if filePath parent
 * is unwritable, to prevent teardown-from-failing-masking the original fail).
 *
 * @module test/e2e/harness/teardown-report
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { LeakReport, Residual } from './lifecycle.ts';
import type { VerifyChainResult } from './audit-chain.ts';

export interface SnapExit {
  readonly pid: number | null;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly reapedAt: number;
}

export interface TmpCleanup {
  readonly tmpDir: string | null;
  readonly removed: boolean;
  readonly error?: string;
}

export interface TeardownReport {
  readonly snapExit: SnapExit;
  readonly tmpCleanup: TmpCleanup;
  readonly residuals: readonly Residual[];
  readonly leaks: LeakReport;
  readonly auditChainOk: VerifyChainResult;
}

export interface WriteTeardownReportOptions {
  readonly suite: string;
  readonly timestamp: number;
  readonly baseDir?: string;
}

/**
 * Default output directory — resolved from cwd unless the caller overrides
 * via `baseDir`. The directory is created on first write.
 */
export const DEFAULT_TEARDOWN_BASE_DIR = 'test/e2e/.teardown-reports';

export function teardownReportPath(
  opts: WriteTeardownReportOptions,
): string {
  const baseDir = resolve(opts.baseDir ?? DEFAULT_TEARDOWN_BASE_DIR);
  return join(baseDir, `${opts.suite}-${String(opts.timestamp)}.json`);
}

/**
 * Persist a `TeardownReport` to disk. Returns the absolute file path written,
 * or `null` if the write failed (silent — teardown writers MUST NOT mask the
 * primary failure; callers can log the return value themselves).
 */
export function writeTeardownReport(
  report: TeardownReport,
  opts: WriteTeardownReportOptions,
): string | null {
  const filePath = teardownReportPath(opts);
  try {
    const parent = dirname(filePath);
    if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
    writeFileSync(filePath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    return filePath;
  } catch {
    return null;
  }
}
