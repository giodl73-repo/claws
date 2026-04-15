/**
 * L2 e2e test for fleet drift detection.
 *
 * Scan 3 fixture workspaces → establish baseline from governed →
 * modify one workspace (lower trust tier) → drift detect → verify
 * CRITICAL severity on modified workspace, clean on others.
 *
 * @module claws-sdk/tests/fleet/drift.e2e
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanFleet } from '#src/fleet/scan.js';
import { computeGovernanceHash, detectDrift } from '#src/fleet/drift.js';
import { establishBaseline } from '#src/fleet/baseline.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'drift-e2e-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

const BASE_CONFIG = {
  trustTier: 3,
  suppressions: [],
  format: 'terminal',
  policySet: 'default',
  auditLevel: 'full',
  failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
  fleet: { allowBypass: false },
};

const POLICY_CONTENT = 'name: default\nversion: 1\nrules:\n  - deny: shell_exec\n  - require: approval_for_deploy\n';

/** Scaffold a full governed workspace with OC markers. */
function createGovernedWorkspace(basePath: string, config: Record<string, unknown>): void {
  mkdirSync(join(basePath, '.claws', 'policies'), { recursive: true });
  writeFileSync(join(basePath, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(basePath, 'claws.json'), JSON.stringify(config, null, 2));
  writeFileSync(join(basePath, '.claws', 'policies', 'default.yaml'), POLICY_CONTENT);
}

describe('fleet drift e2e', () => {
  it('scan 3 workspaces → establish baseline → modify one → drift detect → CRITICAL on modified, clean on others', async () => {
    // Phase 1: Create 3 governed workspaces (all identical)
    const ws1 = join(tempDir, 'ws-alpha');
    const ws2 = join(tempDir, 'ws-beta');
    const ws3 = join(tempDir, 'ws-gamma');

    createGovernedWorkspace(ws1, BASE_CONFIG);
    createGovernedWorkspace(ws2, BASE_CONFIG);
    createGovernedWorkspace(ws3, BASE_CONFIG);

    // Phase 2: Scan to discover all 3
    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const governed = scanResult.workspaces.filter((ws) => ws.classification === 'GOVERNED');
    expect(governed).toHaveLength(3);

    // Phase 3: Establish baseline from ws1
    const baseline = await establishBaseline(ws1, 'production', tempDir);
    expect(baseline.hash).toMatch(/^[a-f0-9]{64}$/);

    // Verify all 3 are clean before modification
    const preResults = await detectDrift(
      governed.map((ws) => ws.path),
      baseline,
    );
    const preClean = preResults.filter((r) => r.status === 'clean');
    expect(preClean).toHaveLength(3);

    // Phase 4: Modify ws-gamma — lower trust tier from 3 to 1
    const modifiedConfig = { ...BASE_CONFIG, trustTier: 1 };
    writeFileSync(join(ws3, 'claws.json'), JSON.stringify(modifiedConfig, null, 2));

    // Phase 5: Run drift detection
    const results = await detectDrift(
      governed.map((ws) => ws.path),
      baseline,
    );

    expect(results).toHaveLength(3);

    // ws1 and ws2 should be clean
    const clean = results.filter((r) => r.status === 'clean');
    expect(clean).toHaveLength(2);

    // ws3 (ws-gamma) should be CRITICAL drift
    const drifted = results.filter((r) => r.status === 'drifted');
    expect(drifted).toHaveLength(1);

    const critical = drifted[0]!;
    expect(critical.workspacePath).toContain('ws-gamma');
    expect(critical.driftDetected).toBe(true);
    expect(critical.severity).toBe('CRITICAL');
    expect(critical.expectedHash).toBe(baseline.hash);
    expect(critical.actualHash).not.toBe(baseline.hash);
    expect(critical.suppressed).toBe(false);
  });
});
