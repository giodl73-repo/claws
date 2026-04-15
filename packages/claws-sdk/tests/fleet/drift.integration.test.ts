/**
 * L1 integration tests for fleet drift detection.
 *
 * 2 tests:
 * 1. Drift detection across 3 fixture workspaces with one drifted workspace detected correctly
 * 2. Exception registry suppresses alert for approved deviation
 *
 * @module claws-sdk/tests/fleet/drift.integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { computeGovernanceHash, detectDrift } from '#src/fleet/drift.js';
import { establishBaseline } from '#src/fleet/baseline.js';
import type { FleetBaseline, FleetException } from '#src/fleet/drift-types.js';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'fleet');

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'drift-integ-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/** Create a governed workspace from scratch with specified config. */
function createGoverned(
  basePath: string,
  config: Record<string, unknown>,
  policyContent = 'name: default\nversion: 1\nrules:\n  - deny: shell_exec\n',
): void {
  mkdirSync(join(basePath, '.claws', 'policies'), { recursive: true });
  writeFileSync(join(basePath, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(basePath, 'claws.json'), JSON.stringify(config, null, 2));
  writeFileSync(join(basePath, '.claws', 'policies', 'default.yaml'), policyContent);
}

const BASE_CONFIG = {
  trustTier: 3,
  suppressions: [],
  format: 'terminal',
  policySet: 'default',
  auditLevel: 'full',
  failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
  fleet: { allowBypass: false },
};

describe('drift integration', () => {
  it('detects drift across 3 workspaces with one drifted', async () => {
    // Create 3 governed workspaces: 2 matching baseline, 1 drifted
    const ws1 = join(tempDir, 'ws1');
    const ws2 = join(tempDir, 'ws2');
    const ws3Drifted = join(tempDir, 'ws3-drifted');

    createGoverned(ws1, BASE_CONFIG);
    createGoverned(ws2, BASE_CONFIG);
    // ws3 has lowered trust tier → should be CRITICAL drift
    createGoverned(ws3Drifted, { ...BASE_CONFIG, trustTier: 1 });

    // Establish baseline from ws1
    const baseline = await establishBaseline(ws1, 'test', tempDir);

    // Run drift detection
    const results = await detectDrift([ws1, ws2, ws3Drifted], baseline);

    expect(results).toHaveLength(3);

    // ws1 and ws2 should be clean (same config + policy)
    const clean = results.filter((r) => r.status === 'clean');
    expect(clean).toHaveLength(2);

    // ws3 should be drifted with CRITICAL severity
    const drifted = results.filter((r) => r.status === 'drifted');
    expect(drifted).toHaveLength(1);
    expect(drifted[0]!.workspacePath).toBe(ws3Drifted);
    expect(drifted[0]!.severity).toBe('CRITICAL');
    expect(drifted[0]!.driftDetected).toBe(true);
  });

  it('exception registry suppresses alert for approved deviation', async () => {
    const refWs = join(tempDir, 'reference');
    const approvedWs = join(tempDir, 'approved-deviation');

    createGoverned(refWs, BASE_CONFIG);
    // Different config but exception will suppress it
    createGoverned(approvedWs, { ...BASE_CONFIG, format: 'json' });

    const baseline = await establishBaseline(refWs, 'prod', tempDir);

    const exceptions: FleetException[] = [{
      workspacePattern: 'approved-deviation',
      reason: 'Approved for JSON format testing',
      approver: 'platform-eng@example.com',
      expiresAt: null,
    }];

    const results = await detectDrift([approvedWs], baseline, exceptions);

    expect(results).toHaveLength(1);
    expect(results[0]!.driftDetected).toBe(true);
    expect(results[0]!.suppressed).toBe(true);
    expect(results[0]!.status).toBe('suppressed');
    expect(results[0]!.suppressionReason).toBe('Approved for JSON format testing');
  });
});
