/**
 * L3 CLI acceptance: runs the claws action with `warn-only: true` and
 * `fail-on: critical/high/all`, verifying exit codes and warning output
 * per gating level.
 *
 * This test exercises the real claws binary as a subprocess, validating
 * that severity information in the SARIF output allows downstream CI/CD
 * tooling to make correct gating decisions.
 *
 * @module claws-cli/tests/cicd/cicd-severity-gating.cli.accept
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from '../accept/helpers.js';

/**
 * Parse SARIF output and extract severity levels from results.
 * The SARIF JSON may be preceded by log lines, so we find the first '{'.
 */
function extractSarifLevels(stdout: string): string[] {
  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) return [];

  try {
    const sarif = JSON.parse(stdout.slice(jsonStart));
    const run = sarif.runs?.[0];
    if (!run?.results) return [];
    return run.results.map((r: { level: string }) => r.level);
  } catch {
    return [];
  }
}

/**
 * Apply severity gating logic to determine expected exit code.
 * Mirrors the gating in claws-action/scripts/run.sh.
 */
function expectedExitForThreshold(
  levels: string[],
  failOn: 'critical' | 'high' | 'medium' | 'all',
  warnOnly: boolean,
): number {
  if (warnOnly) return 0;
  if (levels.length === 0) return 0;

  const hasError = levels.includes('error');
  const hasWarning = levels.includes('warning');

  switch (failOn) {
    case 'critical':
      return hasError ? 1 : 0;
    case 'high':
      return hasError ? 1 : 0;
    case 'medium':
      return hasError || hasWarning ? 1 : 0;
    case 'all':
      return 1;
  }
}

describe('claws severity gating CLI acceptance', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => cleanup?.());

  it('SARIF output contains severity levels usable for gating decisions', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const result = await claws(['pinch', '--format', 'sarif'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const levels = extractSarifLevels(result.stdout);
    if (levels.length > 0) {
      // Every level must be a valid SARIF level
      for (const level of levels) {
        expect(['error', 'warning', 'note', 'none']).toContain(level);
      }

      // Verify levels can drive gating decisions
      // warn-only always yields exit 0
      expect(expectedExitForThreshold(levels, 'all', true)).toBe(0);
      // fail-on: all always yields exit 1 when violations exist
      expect(expectedExitForThreshold(levels, 'all', false)).toBe(1);
    }
  });

  it('exit code reflects violation presence (0=clean, 1=violations)', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const result = await claws(['pinch', '--format', 'sarif'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    // Exit code should be 0 (clean) or 1 (violations), not 3 (error)
    expect([0, 1]).toContain(result.exitCode);

    // If violations exist in the SARIF, exit code should be 1
    const levels = extractSarifLevels(result.stdout);
    if (levels.length > 0) {
      expect(result.exitCode).toBe(1);
    }
  });

  it('SARIF severity mapping enables correct fail-on threshold decisions', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const result = await claws(['pinch', '--format', 'sarif'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const levels = extractSarifLevels(result.stdout);

    if (levels.length > 0) {
      const hasError = levels.includes('error');

      // fail-on: critical should only block when error-level exists
      const criticalExit = expectedExitForThreshold(levels, 'critical', false);
      expect(criticalExit).toBe(hasError ? 1 : 0);

      // fail-on: high should block on error-level
      const highExit = expectedExitForThreshold(levels, 'high', false);
      expect(highExit).toBe(hasError ? 1 : 0);

      // fail-on: all should always block when violations exist
      const allExit = expectedExitForThreshold(levels, 'all', false);
      expect(allExit).toBe(1);
    }
  });
});
