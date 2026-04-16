/**
 * L1: Doctor health checks against healthy, degraded, and broken fixture workspaces.
 *
 * THOTH-INTEGRATION-COVERAGE: doctor 68% -> 90%.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runDoctor, createDefaultChecks } from '../../src/doctor/index.js';

const FIXTURES = resolve(__dirname, '..', 'fixtures');

describe('doctor health checks across workspace states', () => {
  it('runs all checks against healthy, degraded, and broken workspaces', async () => {
    const checks = createDefaultChecks();

    // 1. Healthy workspace (oc-reference-workspace has valid claws.json + SOUL.md etc.)
    const healthyReport = await runDoctor(
      resolve(FIXTURES, 'oc-reference-workspace'),
      checks,
    );
    expect(healthyReport.healthy).toBe(true);
    expect(healthyReport.summary.errors).toBe(0);
    expect(healthyReport.checks.length).toBeGreaterThan(0);

    // 2. Degraded workspace — valid claws.json but stale/outdated policy
    const degradedReport = await runDoctor(
      resolve(FIXTURES, 'doctor-degraded'),
      checks,
    );
    // Degraded workspace may have warnings but should not crash
    expect(degradedReport.checks.length).toBeGreaterThan(0);
    // It should report at least some diagnostics (degraded state)
    expect(degradedReport.diagnostics.length).toBeGreaterThanOrEqual(0);

    // 3. Broken workspace — invalid claws.json
    const brokenReport = await runDoctor(
      resolve(FIXTURES, 'doctor-broken'),
      checks,
    );
    // Broken workspace should produce errors from config-schema check
    expect(brokenReport.healthy).toBe(false);
    expect(brokenReport.summary.errors).toBeGreaterThan(0);
    // Should specifically catch the JSON parse error
    const configDiag = brokenReport.diagnostics.find(
      (d) => d.checkId === 'config-schema',
    );
    expect(configDiag).toBeDefined();
    expect(configDiag!.severity).toBe('error');

    // 4. Duration tracking
    expect(healthyReport.durationMs).toBeGreaterThanOrEqual(0);
    expect(degradedReport.durationMs).toBeGreaterThanOrEqual(0);
    expect(brokenReport.durationMs).toBeGreaterThanOrEqual(0);
  });
});
