/**
 * L2: Fleet operations lifecycle E2E — full scan → broadcast → drift →
 * snapshot → kill → audit verification.
 *
 * Creates 3 temporary workspaces from fixtures (governed, ungoverned,
 * misconfigured), runs the full fleet command sequence, and verifies
 * that each operation produces the expected state transitions and audit
 * records.
 *
 * @module claws-sdk/tests/e2e/fleet-operations
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { scanFleet } from '../../src/fleet/scan.js';
import { broadcastPolicy } from '../../src/fleet/broadcast.js';
import { detectDrift, computeGovernanceHash } from '../../src/fleet/drift.js';
import { establishBaseline } from '../../src/fleet/baseline.js';
import { save } from '../../src/snapshot/save.js';
import { killFleet } from '../../src/fleet/kill-fleet.js';
import { readSentinel } from '../../src/fleet/kill.js';
import { readAuditChain } from '../../src/compliance/audit-chain.js';

import type { WorkspaceInfo } from '../../src/fleet/types.js';

// ── Fixtures ────────────────────────────────────────────────────────────

const FIXTURES_DIR = join(__dirname, '../fixtures/fleet');

// ── Cleanup tracking ────────────────────────────────────────────────────

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
  tempDirs.length = 0;
});

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `claws-e2e-fleet-${prefix}-`));
  tempDirs.push(dir);
  return dir;
}

// ── Workspace setup helpers ─────────────────────────────────────────────

/**
 * Create a governed workspace with valid claws.json, .claws/ sidecar,
 * and policy files.
 */
function createGovernedWorkspace(rootDir: string, name: string, trustTier = 3): string {
  const wsDir = join(rootDir, name);
  cpSync(join(FIXTURES_DIR, 'governed-workspace'), wsDir, { recursive: true });

  // Ensure the trust tier matches what we want
  const config = JSON.parse(readFileSync(join(wsDir, 'claws.json'), 'utf-8'));
  config.trustTier = trustTier;
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify(config, null, 2));

  // Ensure all sidecar directories exist
  for (const subdir of ['audit', 'compiled', 'cache', 'keys', 'fleet', 'snapshots']) {
    mkdirSync(join(wsDir, '.claws', subdir), { recursive: true });
  }

  // Write a compiled governance IR for snapshot to capture
  writeFileSync(
    join(wsDir, '.claws', 'compiled', 'governance-ir.json'),
    JSON.stringify({
      capabilities: {},
      analysis: { violations: [] },
      intents: [],
      delegationMap: [],
      conflicts: { conflicts: [], errorCount: 0, warningCount: 0 },
      compiler: { compilerVersion: '2.0.0', compiledAt: new Date().toISOString(), schemaVersion: 1 },
    }, null, 2),
  );

  return wsDir;
}

/**
 * Create an ungoverned workspace — OC markers present, no .claws/ directory.
 */
function createUngovernedWorkspace(rootDir: string, name: string): string {
  const wsDir = join(rootDir, name);
  cpSync(join(FIXTURES_DIR, 'ungoverned-workspace'), wsDir, { recursive: true });
  return wsDir;
}

/**
 * Create a misconfigured workspace — .claws/ exists but invalid config.
 */
function createMisconfiguredWorkspace(rootDir: string, name: string): string {
  const wsDir = join(rootDir, name);
  cpSync(join(FIXTURES_DIR, 'misconfigured-workspace'), wsDir, { recursive: true });
  return wsDir;
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('fleet operations lifecycle E2E', () => {
  it('scan → broadcast → drift → snapshot → kill → audit verification across 3 workspaces', async () => {
    // ── Setup: create 3 temp workspaces ─────────────────────────────────

    const fleetRoot = createTempDir('fleet');
    const governed = createGovernedWorkspace(fleetRoot, 'workspace-governed');
    const ungoverned = createUngovernedWorkspace(fleetRoot, 'workspace-ungoverned');
    const misconfigured = createMisconfiguredWorkspace(fleetRoot, 'workspace-misconfigured');

    // ── Step 1: Scan — discover all 3, classify correctly ───────────────

    const scanResult = await scanFleet(fleetRoot, { maxDepth: 3 });

    expect(scanResult.workspaces).toHaveLength(3);
    expect(scanResult.stats.total).toBe(3);
    expect(scanResult.stats.governed).toBe(1);
    expect(scanResult.stats.ungoverned).toBe(1);
    expect(scanResult.stats.misconfigured).toBe(1);

    const governedWs = scanResult.workspaces.find(
      (ws) => ws.classification === 'GOVERNED',
    );
    const ungovernedWs = scanResult.workspaces.find(
      (ws) => ws.classification === 'UNGOVERNED',
    );
    const misconfiguredWs = scanResult.workspaces.find(
      (ws) => ws.classification === 'MISCONFIGURED',
    );

    expect(governedWs).toBeDefined();
    expect(ungovernedWs).toBeDefined();
    expect(misconfiguredWs).toBeDefined();

    // Verify paths are correct
    expect(governedWs!.path).toContain('workspace-governed');
    expect(ungovernedWs!.path).toContain('workspace-ungoverned');
    expect(misconfiguredWs!.path).toContain('workspace-misconfigured');

    // ── Step 2: Broadcast — push policy to governed only ────────────────

    // Create a SOC2 policy file
    const policyPath = join(fleetRoot, 'soc2.yaml');
    writeFileSync(policyPath, [
      'name: soc2-enforcement',
      'version: 1',
      'framework: soc2',
      'rules:',
      '  - deny: shell_exec',
      '  - deny: send_email',
      '  - require: approval_for_deploy',
    ].join('\n'));

    const broadcastResult = await broadcastPolicy(
      policyPath,
      scanResult.workspaces as WorkspaceInfo[],
      { confirm: true, reason: 'Fleet-wide SOC2 enforcement' },
    );

    expect(broadcastResult.executed).toBe(true);
    const manifest = broadcastResult.manifest!;
    expect(manifest.succeeded).toBe(1); // only the governed workspace
    expect(manifest.skippedCount).toBe(2); // ungoverned + misconfigured

    // Verify policy was written to governed workspace
    const broadcastedPolicy = join(governed, '.claws', 'policies', 'soc2.yaml');
    expect(existsSync(broadcastedPolicy)).toBe(true);
    expect(readFileSync(broadcastedPolicy, 'utf-8')).toContain('soc2-enforcement');

    // Verify policy was NOT written to ungoverned/misconfigured
    expect(existsSync(join(ungoverned, '.claws', 'policies', 'soc2.yaml'))).toBe(false);
    expect(existsSync(join(misconfigured, '.claws', 'policies', 'soc2.yaml'))).toBe(false);

    // Verify broadcast manifest was written to governed workspace
    const broadcastManifestPath = join(governed, '.claws', 'fleet', 'broadcast-manifest.json');
    expect(existsSync(broadcastManifestPath)).toBe(true);
    const broadcastManifestContent = JSON.parse(readFileSync(broadcastManifestPath, 'utf-8'));
    expect(broadcastManifestContent.policyFile).toBe('soc2.yaml');
    expect(broadcastManifestContent.reason).toBe('Fleet-wide SOC2 enforcement');

    // ── Step 3: Establish baseline, then introduce drift ────────────────

    // Create a separate reference workspace for baseline (stays pristine)
    const reference = createGovernedWorkspace(fleetRoot, 'workspace-reference');
    // Copy the same broadcast policy so hashes match
    mkdirSync(join(reference, '.claws', 'policies'), { recursive: true });
    writeFileSync(
      join(reference, '.claws', 'policies', 'soc2.yaml'),
      readFileSync(join(governed, '.claws', 'policies', 'soc2.yaml'), 'utf-8'),
    );
    // Sync claws.json content so governance hashes match
    writeFileSync(
      join(reference, 'claws.json'),
      readFileSync(join(governed, 'claws.json'), 'utf-8'),
    );
    // Sync compiled IR so hashes match
    writeFileSync(
      join(reference, '.claws', 'compiled', 'governance-ir.json'),
      readFileSync(join(governed, '.claws', 'compiled', 'governance-ir.json'), 'utf-8'),
    );

    // Establish baseline from the reference workspace
    const baseline = await establishBaseline(reference, 'production', fleetRoot);
    expect(baseline.hash).toBeTruthy();
    expect(baseline.name).toBe('production');

    // Verify no drift before modification
    const preDriftResults = await detectDrift([governed], baseline);
    expect(preDriftResults).toHaveLength(1);
    expect(preDriftResults[0]!.driftDetected).toBe(false);
    expect(preDriftResults[0]!.status).toBe('clean');

    // Introduce drift: lower trust tier (T3 → T1) — this should be CRITICAL
    const driftedConfig = JSON.parse(readFileSync(join(governed, 'claws.json'), 'utf-8'));
    driftedConfig.trustTier = 1;
    writeFileSync(join(governed, 'claws.json'), JSON.stringify(driftedConfig, null, 2));

    // ── Step 4: Drift detection — identifies CRITICAL drift ─────────────

    const driftResults = await detectDrift([governed], baseline);
    expect(driftResults).toHaveLength(1);
    expect(driftResults[0]!.driftDetected).toBe(true);
    expect(driftResults[0]!.severity).toBe('CRITICAL');
    expect(driftResults[0]!.status).toBe('drifted');
    expect(driftResults[0]!.actualHash).not.toBe(driftResults[0]!.expectedHash);

    // Restore trust tier for remaining steps
    driftedConfig.trustTier = 3;
    writeFileSync(join(governed, 'claws.json'), JSON.stringify(driftedConfig, null, 2));

    // ── Step 5: Snapshot — save governed workspaces ─────────────────────

    const saveResult = await save(governed, 'pre-kill');

    // Verify snapshot manifest
    expect(saveResult.fileCount).toBeGreaterThan(0);
    expect(saveResult.manifest.schemaVersion).toBe(1);
    expect(saveResult.manifest.clawsVersion).toBeTruthy();
    expect(saveResult.manifest.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(saveResult.manifest.workspaceHash).toBeTruthy();

    // Verify manifest has correct hashes (SHA-256)
    for (const entry of saveResult.manifest.files) {
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.size).toBeGreaterThan(0);
      expect(entry.relativePath).toBeTruthy();
    }

    // Verify snapshot captured governance files
    const capturedPaths = saveResult.manifest.files.map((f) => f.relativePath);
    expect(capturedPaths).toContain('claws.json');

    // ── Step 6: Kill — fleet-wide kill switch ───────────────────────────

    const killResult = await killFleet({
      fleetDir: fleetRoot,
      reason: 'Security incident — fleet lockdown',
      actor: 'e2e-test-runner',
      ttlMs: 60_000,
    });

    // Kill activates on all discovered workspaces (governed + reference + ungoverned + misconfigured)
    expect(killResult.totalDiscovered).toBeGreaterThanOrEqual(3);
    expect(killResult.activated).toBeGreaterThanOrEqual(1);
    expect(killResult.failed).toBe(0);

    // Verify sentinel in governed workspace
    const governedSentinel = await readSentinel(governed);
    expect(governedSentinel).not.toBeNull();
    expect(governedSentinel!.reason).toBe('Security incident — fleet lockdown');
    expect(governedSentinel!.actor).toBe('e2e-test-runner');
    expect(governedSentinel!.killPath).toBe('sentinel');
    expect(governedSentinel!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // ── Step 7: Audit verification ──────────────────────────────────────

    // Read audit chain from the governed workspace
    const auditChain = await readAuditChain(governed);
    expect(auditChain.length).toBeGreaterThanOrEqual(1);

    // Verify KILL_ACTIVATED event is present
    const killEvent = auditChain.find((e) => e.eventType === 'KILL_ACTIVATED');
    expect(killEvent).toBeDefined();
    expect(killEvent!.actor).toBe('e2e-test-runner');
    expect(killEvent!.target).toBe(governed);
    expect(killEvent!.action).toBe('kill:sentinel');
    expect(killEvent!.outcome).toBe('deny');
    expect(killEvent!.ruleId).toBe('FLEET-KILL');
    expect(killEvent!.severity).toBe(5);
    expect(killEvent!.hmacSignature).toMatch(/^[0-9a-f]+$/);
    expect(killEvent!.keyId).toBeTruthy();
    expect(killEvent!.algorithm).toBeTruthy();
    expect(killEvent!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof killEvent!.seq).toBe('number');

    // Verify chronological ordering — events should have increasing timestamps
    for (let i = 1; i < auditChain.length; i++) {
      const prev = new Date(auditChain[i - 1]!.timestamp).getTime();
      const curr = new Date(auditChain[i]!.timestamp).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }

    // Verify sequential numbering of audit events
    for (let i = 0; i < auditChain.length; i++) {
      expect(auditChain[i]!.seq).toBe(i);
    }
  }, 60_000);
});
