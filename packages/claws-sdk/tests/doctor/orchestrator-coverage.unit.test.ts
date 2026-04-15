/**
 * L0: Doctor orchestrator unit tests for CI unit-project coverage.
 *
 * Tests runDoctor with synthetic check functions.
 */

import { describe, it, expect } from 'vitest';
import {
  runDoctor,
  createDefaultChecks,
  type DoctorCheck,
  type CheckResult,
  type Diagnostic,
} from '../../src/doctor/orchestrator.js';

function makeCheck(overrides: Partial<CheckResult> = {}): DoctorCheck {
  const base: CheckResult = {
    checkId: 'test-check',
    name: 'Test Check',
    passed: true,
    diagnostics: [],
    durationMs: 1,
    ...overrides,
  };
  return async () => base;
}

function makeDiag(severity: 'error' | 'warning' | 'info', msg: string): Diagnostic {
  return { checkId: 'test', severity, message: msg, fixable: false };
}

describe('runDoctor', () => {
  it('returns healthy report with zero checks', async () => {
    const report = await runDoctor('/tmp/test', []);
    expect(report.healthy).toBe(true);
    expect(report.checks).toHaveLength(0);
    expect(report.diagnostics).toHaveLength(0);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.warnings).toBe(0);
    expect(report.summary.infos).toBe(0);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('aggregates passing checks', async () => {
    const checks = [
      makeCheck({ checkId: 'a', name: 'A' }),
      makeCheck({ checkId: 'b', name: 'B' }),
    ];
    const report = await runDoctor('/tmp/test', checks);
    expect(report.healthy).toBe(true);
    expect(report.checks).toHaveLength(2);
  });

  it('aggregates diagnostics and sorts by severity', async () => {
    const checks = [
      makeCheck({
        checkId: 'a',
        passed: false,
        diagnostics: [
          makeDiag('warning', 'w1'),
          makeDiag('info', 'i1'),
        ],
      }),
      makeCheck({
        checkId: 'b',
        passed: false,
        diagnostics: [
          makeDiag('error', 'e1'),
          makeDiag('warning', 'w2'),
        ],
      }),
    ];
    const report = await runDoctor('/tmp/test', checks);
    expect(report.healthy).toBe(false);
    expect(report.diagnostics).toHaveLength(4);
    // Error should come first
    expect(report.diagnostics[0]!.severity).toBe('error');
    // Then warnings
    expect(report.diagnostics[1]!.severity).toBe('warning');
    expect(report.diagnostics[2]!.severity).toBe('warning');
    // Then info
    expect(report.diagnostics[3]!.severity).toBe('info');
    expect(report.summary.errors).toBe(1);
    expect(report.summary.warnings).toBe(2);
    expect(report.summary.infos).toBe(1);
  });

  it('is healthy when only warnings and info exist', async () => {
    const checks = [
      makeCheck({
        checkId: 'a',
        passed: true,
        diagnostics: [
          makeDiag('warning', 'w1'),
          makeDiag('info', 'i1'),
        ],
      }),
    ];
    const report = await runDoctor('/tmp/test', checks);
    expect(report.healthy).toBe(true);
    expect(report.summary.warnings).toBe(1);
    expect(report.summary.infos).toBe(1);
  });

  it('passes options through (post-upgrade mode)', async () => {
    // Just verifying the function signature accepts options
    const report = await runDoctor('/tmp/test', [], { postUpgrade: true });
    expect(report.healthy).toBe(true);
  });
});

describe('createDefaultChecks', () => {
  it('returns all checks by default', () => {
    const checks = createDefaultChecks();
    expect(checks.length).toBeGreaterThan(0);
  });

  it('returns fewer checks in post-upgrade mode', () => {
    const all = createDefaultChecks();
    const postUpgrade = createDefaultChecks({ postUpgrade: true });
    expect(postUpgrade.length).toBeLessThanOrEqual(all.length);
    expect(postUpgrade.length).toBeGreaterThan(0);
  });
});
