/**
 * L3 acceptance test for fleet lifecycle — end-to-end contract.
 *
 * Validates the fleet operations lifecycle against the acceptance harness
 * contract:
 * - Workspace discovery accuracy (scan classification)
 * - Broadcast atomicity (governed-only targeting)
 * - Drift detection sensitivity (trust tier downgrade → CRITICAL)
 * - Kill switch reliability (sentinel blocks invocation)
 * - Audit chain completeness (all events present, signed, chronological)
 *
 * @module claws-sdk/tests/accept/e2e/fleet-lifecycle.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanFleet } from '#src/fleet/scan.js';
import { broadcastPolicy } from '#src/fleet/broadcast.js';
import { detectDrift, computeGovernanceHash } from '#src/fleet/drift.js';
import { establishBaseline } from '#src/fleet/baseline.js';
import { save } from '#src/snapshot/save.js';
import { activateKill, readSentinel, checkSentinelBlock } from '#src/fleet/kill.js';
import { recordKillAuditEvent } from '#src/fleet/kill-audit.js';
import { readAuditChain } from '#src/compliance/audit-chain.js';

import type { WorkspaceInfo } from '#src/fleet/types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'fleet-lifecycle-accept-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Create a governed workspace with full sidecar structure.
 */
function createGovernedWorkspace(name: string, trustTier = 3): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
  mkdirSync(join(wsDir, '.claws', 'audit'), { recursive: true });
  mkdirSync(join(wsDir, '.claws', 'compiled'), { recursive: true });
  mkdirSync(join(wsDir, '.claws', 'cache'), { recursive: true });
  mkdirSync(join(wsDir, '.claws', 'keys'), { recursive: true });
  mkdirSync(join(wsDir, '.claws', 'fleet'), { recursive: true });
  mkdirSync(join(wsDir, '.claws', 'snapshots'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Governed Workspace');
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({
    trustTier,
    suppressions: [],
    policySet: 'default',
    auditLevel: 'full',
    failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    fleet: { allowBypass: false },
  }, null, 2));
  writeFileSync(join(wsDir, '.claws', 'policies', 'default.yaml'), [
    'name: default',
    'version: 1',
    'rules:',
    '  - deny: shell_exec',
  ].join('\n'));
  writeFileSync(join(wsDir, '.claws', 'compiled', 'governance-ir.json'), JSON.stringify({
    capabilities: {},
    analysis: { violations: [] },
    intents: [],
    delegationMap: [],
    conflicts: { conflicts: [], errorCount: 0, warningCount: 0 },
    compiler: { compilerVersion: '2.0.0', compiledAt: new Date().toISOString(), schemaVersion: 1 },
  }, null, 2));
  return wsDir;
}

/**
 * Create an ungoverned workspace (OC markers, no .claws/).
 */
function createUngovernedWorkspace(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(wsDir, { recursive: true });
  writeFileSync(join(wsDir, 'AGENTS.md'), '# Ungoverned Agent');
  return wsDir;
}

/**
 * Create a misconfigured workspace (invalid claws.json).
 */
function createMisconfiguredWorkspace(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Misconfigured');
  writeFileSync(join(wsDir, 'claws.json'), '{ invalid json !');
  return wsDir;
}

/**
 * Create a policy YAML file.
 */
function createPolicyFile(name: string): string {
  const filePath = join(tempDir, name);
  writeFileSync(filePath, [
    'name: fleet-policy',
    'version: 1',
    'framework: soc2',
    'rules:',
    '  - deny: shell_exec',
    '  - deny: send_email',
  ].join('\n'));
  return filePath;
}

describe('fleet lifecycle acceptance contract', () => {
  it('workspace discovery accuracy + broadcast atomicity + drift sensitivity + kill reliability + audit completeness', async () => {
    // ── 1. Workspace discovery accuracy ─────────────────────────────────

    const ws1 = createGovernedWorkspace('alpha', 3);
    const ws2 = createUngovernedWorkspace('beta');
    const ws3 = createMisconfiguredWorkspace('gamma');

    const scanResult = await scanFleet(tempDir, { maxDepth: 3 });

    // Exactly 3 workspaces discovered
    expect(scanResult.workspaces).toHaveLength(3);

    // Correct classification distribution
    const classifications = scanResult.workspaces.map((ws) => ws.classification).sort();
    expect(classifications).toEqual(['GOVERNED', 'MISCONFIGURED', 'UNGOVERNED']);

    // Each workspace has a rationale and markers
    for (const ws of scanResult.workspaces) {
      expect(ws.rationale).toBeTruthy();
      expect(ws.markers.length).toBeGreaterThan(0);
    }

    // Stats match
    expect(scanResult.stats.governed).toBe(1);
    expect(scanResult.stats.ungoverned).toBe(1);
    expect(scanResult.stats.misconfigured).toBe(1);

    // ── 2. Broadcast atomicity — governed-only targeting ────────────────

    const policyPath = createPolicyFile('compliance.yaml');

    const broadcastResult = await broadcastPolicy(
      policyPath,
      scanResult.workspaces as WorkspaceInfo[],
      { confirm: true, reason: 'Acceptance test broadcast' },
    );

    expect(broadcastResult.executed).toBe(true);
    const bManifest = broadcastResult.manifest!;

    // Only 1 workspace updated (governed)
    expect(bManifest.succeeded).toBe(1);
    // 2 skipped (ungoverned + misconfigured)
    expect(bManifest.skippedCount).toBe(2);
    // No failures
    expect(bManifest.failed).toBe(0);

    // Policy present in governed workspace
    expect(existsSync(join(ws1, '.claws', 'policies', 'compliance.yaml'))).toBe(true);
    const writtenPolicy = readFileSync(join(ws1, '.claws', 'policies', 'compliance.yaml'), 'utf-8');
    expect(writtenPolicy).toContain('fleet-policy');

    // Policy NOT present in ungoverned/misconfigured
    expect(existsSync(join(ws2, '.claws', 'policies', 'compliance.yaml'))).toBe(false);
    expect(existsSync(join(ws3, '.claws', 'policies', 'compliance.yaml'))).toBe(false);

    // Staging directory cleaned up (atomic write complete)
    expect(existsSync(join(ws1, '.claws', 'broadcast-staging'))).toBe(false);

    // ── 3. Drift detection sensitivity — trust tier downgrade ───────────

    // Create a separate reference workspace (stays pristine for severity comparison)
    const refWs = createGovernedWorkspace('reference', 3);
    // Sync policy + compiled IR so governance hashes match
    writeFileSync(
      join(refWs, '.claws', 'policies', 'compliance.yaml'),
      readFileSync(join(ws1, '.claws', 'policies', 'compliance.yaml'), 'utf-8'),
    );
    writeFileSync(join(refWs, 'claws.json'), readFileSync(join(ws1, 'claws.json'), 'utf-8'));
    writeFileSync(
      join(refWs, '.claws', 'compiled', 'governance-ir.json'),
      readFileSync(join(ws1, '.claws', 'compiled', 'governance-ir.json'), 'utf-8'),
    );

    // Establish baseline from the reference workspace
    const baseline = await establishBaseline(refWs, 'accept-baseline', tempDir);
    expect(baseline.hash).toBeTruthy();

    // No drift initially
    const cleanResult = await detectDrift([ws1], baseline);
    expect(cleanResult[0]!.driftDetected).toBe(false);
    expect(cleanResult[0]!.status).toBe('clean');

    // Downgrade trust tier: T3 → T1
    const config = JSON.parse(readFileSync(join(ws1, 'claws.json'), 'utf-8'));
    config.trustTier = 1;
    writeFileSync(join(ws1, 'claws.json'), JSON.stringify(config, null, 2));

    // Drift detected as CRITICAL
    const driftResult = await detectDrift([ws1], baseline);
    expect(driftResult[0]!.driftDetected).toBe(true);
    expect(driftResult[0]!.severity).toBe('CRITICAL');
    expect(driftResult[0]!.status).toBe('drifted');
    expect(driftResult[0]!.actualHash).not.toBe(driftResult[0]!.expectedHash);

    // Hash changed
    const newHash = await computeGovernanceHash(ws1);
    expect(newHash).not.toBe(baseline.hash);

    // Restore for subsequent steps
    config.trustTier = 3;
    writeFileSync(join(ws1, 'claws.json'), JSON.stringify(config, null, 2));

    // ── 4. Snapshot integrity — manifests with SHA-256 ──────────────────

    const snapResult = await save(ws1, 'accept-snap');

    expect(snapResult.fileCount).toBeGreaterThan(0);
    expect(snapResult.manifest.workspaceHash).toBeTruthy();

    for (const entry of snapResult.manifest.files) {
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.size).toBeGreaterThan(0);
    }

    // ── 5. Kill switch reliability — sentinel blocks invocation ─────────

    // No sentinel initially
    const preKill = await checkSentinelBlock(ws1);
    expect(preKill).toBeNull();

    // Activate kill
    await activateKill(ws1, 'Accept test lockdown', 'accept-runner');

    // Record audit event
    await recordKillAuditEvent(ws1, 'sentinel', 'Accept test lockdown', 'accept-runner');

    // Sentinel present and blocks
    const sentinel = await readSentinel(ws1);
    expect(sentinel).not.toBeNull();
    expect(sentinel!.reason).toBe('Accept test lockdown');
    expect(sentinel!.actor).toBe('accept-runner');
    expect(sentinel!.killPath).toBe('sentinel');

    const block = await checkSentinelBlock(ws1);
    expect(block).not.toBeNull();
    expect(block!.reason).toBe('Accept test lockdown');

    // ── 6. Audit chain completeness ─────────────────────────────────────

    const chain = await readAuditChain(ws1);
    expect(chain.length).toBeGreaterThanOrEqual(1);

    // KILL_ACTIVATED event present
    const killEvent = chain.find((e) => e.eventType === 'KILL_ACTIVATED');
    expect(killEvent).toBeDefined();

    // All required fields present
    expect(typeof killEvent!.seq).toBe('number');
    expect(killEvent!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(killEvent!.eventType).toBe('KILL_ACTIVATED');
    expect(killEvent!.actor).toBe('accept-runner');
    expect(killEvent!.target).toBe(ws1);
    expect(killEvent!.action).toBe('kill:sentinel');
    expect(killEvent!.outcome).toBe('deny');
    expect(killEvent!.ruleId).toBe('FLEET-KILL');
    expect(killEvent!.severity).toBe(5);
    expect(killEvent!.policyVersion).toBeTruthy();
    expect(killEvent!.hmacSignature).toMatch(/^[0-9a-f]+$/);
    expect(killEvent!.keyId).toBeTruthy();
    expect(killEvent!.algorithm).toBeTruthy();

    // Chronological ordering
    for (let i = 1; i < chain.length; i++) {
      const prev = new Date(chain[i - 1]!.timestamp).getTime();
      const curr = new Date(chain[i]!.timestamp).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }

    // Sequential numbering
    for (let i = 0; i < chain.length; i++) {
      expect(chain[i]!.seq).toBe(i);
    }
  });
});
