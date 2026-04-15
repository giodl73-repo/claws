/**
 * L0 unit tests for fleet drift detection.
 *
 * 6 core test groups:
 * 1. Governance hash computation is deterministic
 * 2. Baseline comparison detects drift
 * 3. CRITICAL severity for trust tier downgrade
 * 4. HIGH severity for policy removal
 * 5. LOW severity for minor config change
 * 6. Exception matching suppresses known deviations
 *
 * Additional coverage tests for branches in drift, baseline, severity,
 * and exception modules.
 *
 * @module claws-sdk/tests/fleet/drift.unit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { computeGovernanceHash, detectDrift } from '#src/fleet/drift.js';
import { classifySeverity } from '#src/fleet/severity.js';
import { matchException, loadExceptions, saveExceptions, addException } from '#src/fleet/exception.js';
import { establishBaseline, loadBaseline, loadAllBaselines } from '#src/fleet/baseline.js';
import type { FleetBaseline, FleetException } from '#src/fleet/drift-types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'drift-unit-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/** Scaffold a minimal governed workspace with the given config and policy. */
function scaffoldGoverned(
  basePath: string,
  config: Record<string, unknown>,
  policyContent = 'name: default\nversion: 1\nrules:\n  - deny: shell_exec\n',
): void {
  mkdirSync(join(basePath, '.claws', 'policies'), { recursive: true });
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

// ─── 1. Governance hash computation ─────────────────────────────────────

describe('computeGovernanceHash', () => {
  it('produces deterministic hash for the same workspace', async () => {
    const wsPath = join(tempDir, 'ws');
    mkdirSync(wsPath);
    scaffoldGoverned(wsPath, BASE_CONFIG);

    const hash1 = await computeGovernanceHash(wsPath);
    const hash2 = await computeGovernanceHash(wsPath);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  it('produces different hash when config changes', async () => {
    const ws1 = join(tempDir, 'ws1');
    const ws2 = join(tempDir, 'ws2');
    mkdirSync(ws1);
    mkdirSync(ws2);

    scaffoldGoverned(ws1, BASE_CONFIG);
    scaffoldGoverned(ws2, { ...BASE_CONFIG, trustTier: 1 });

    const hash1 = await computeGovernanceHash(ws1);
    const hash2 = await computeGovernanceHash(ws2);
    expect(hash1).not.toBe(hash2);
  });

  it('includes governance-ir.json in hash when present', async () => {
    const ws1 = join(tempDir, 'ws-no-ir');
    const ws2 = join(tempDir, 'ws-with-ir');
    mkdirSync(ws1);
    mkdirSync(ws2);

    scaffoldGoverned(ws1, BASE_CONFIG);
    scaffoldGoverned(ws2, BASE_CONFIG);
    // Add governance-ir.json to ws2
    mkdirSync(join(ws2, '.claws', 'compiled'), { recursive: true });
    writeFileSync(join(ws2, '.claws', 'compiled', 'governance-ir.json'), '{"version":1}');

    const hash1 = await computeGovernanceHash(ws1);
    const hash2 = await computeGovernanceHash(ws2);
    expect(hash1).not.toBe(hash2);
  });

  it('handles workspace with no claws.json gracefully', async () => {
    const wsPath = join(tempDir, 'empty-ws');
    mkdirSync(wsPath);

    const hash = await computeGovernanceHash(wsPath);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('normalizes CRLF to LF for cross-platform determinism', async () => {
    const ws1 = join(tempDir, 'ws-lf');
    const ws2 = join(tempDir, 'ws-crlf');
    mkdirSync(ws1);
    mkdirSync(ws2);

    scaffoldGoverned(ws1, BASE_CONFIG, 'name: default\nversion: 1\n');
    // Write with CRLF
    mkdirSync(join(ws2, '.claws', 'policies'), { recursive: true });
    writeFileSync(join(ws2, 'claws.json'), JSON.stringify(BASE_CONFIG, null, 2));
    writeFileSync(join(ws2, '.claws', 'policies', 'default.yaml'), 'name: default\r\nversion: 1\r\n');

    const hash1 = await computeGovernanceHash(ws1);
    const hash2 = await computeGovernanceHash(ws2);
    expect(hash1).toBe(hash2);
  });

  it('sorts policy files lexicographically', async () => {
    const ws1 = join(tempDir, 'ws-sorted');
    mkdirSync(ws1);
    scaffoldGoverned(ws1, BASE_CONFIG);
    writeFileSync(join(ws1, '.claws', 'policies', 'aaa.yaml'), 'name: aaa');
    writeFileSync(join(ws1, '.claws', 'policies', 'zzz.yaml'), 'name: zzz');

    // Same files in ws2 — hash should match since sort is deterministic
    const ws2 = join(tempDir, 'ws-sorted2');
    mkdirSync(ws2);
    scaffoldGoverned(ws2, BASE_CONFIG);
    writeFileSync(join(ws2, '.claws', 'policies', 'zzz.yaml'), 'name: zzz');
    writeFileSync(join(ws2, '.claws', 'policies', 'aaa.yaml'), 'name: aaa');

    const hash1 = await computeGovernanceHash(ws1);
    const hash2 = await computeGovernanceHash(ws2);
    expect(hash1).toBe(hash2);
  });
});

// ─── 2. Baseline comparison detects drift ───────────────────────────────

describe('detectDrift — baseline comparison', () => {
  it('detects drift when workspace hash differs from baseline', async () => {
    const refPath = join(tempDir, 'reference');
    const driftedPath = join(tempDir, 'drifted');
    mkdirSync(refPath);
    mkdirSync(driftedPath);

    scaffoldGoverned(refPath, BASE_CONFIG);
    scaffoldGoverned(driftedPath, { ...BASE_CONFIG, format: 'json' });

    const refHash = await computeGovernanceHash(refPath);
    const baseline: FleetBaseline = {
      name: 'test',
      hash: refHash,
      referenceWorkspacePath: refPath,
      createdAt: new Date().toISOString(),
    };

    const results = await detectDrift([driftedPath], baseline);
    expect(results).toHaveLength(1);
    expect(results[0]!.driftDetected).toBe(true);
    expect(results[0]!.status).toBe('drifted');
    expect(results[0]!.expectedHash).toBe(refHash);
    expect(results[0]!.actualHash).not.toBe(refHash);
  });

  it('reports clean when hash matches baseline', async () => {
    const refPath = join(tempDir, 'ref-clean');
    const wsPath = join(tempDir, 'ws-clean');
    mkdirSync(refPath);
    mkdirSync(wsPath);

    scaffoldGoverned(refPath, BASE_CONFIG);
    scaffoldGoverned(wsPath, BASE_CONFIG);

    const refHash = await computeGovernanceHash(refPath);
    const baseline: FleetBaseline = {
      name: 'test',
      hash: refHash,
      referenceWorkspacePath: refPath,
      createdAt: new Date().toISOString(),
    };

    const results = await detectDrift([wsPath], baseline);
    expect(results).toHaveLength(1);
    expect(results[0]!.driftDetected).toBe(false);
    expect(results[0]!.status).toBe('clean');
  });

  it('reports no-baseline when baseline is null', async () => {
    const wsPath = join(tempDir, 'ws-no-base');
    mkdirSync(wsPath);
    scaffoldGoverned(wsPath, BASE_CONFIG);

    const results = await detectDrift([wsPath], null);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe('no-baseline');
    expect(results[0]!.expectedHash).toBeNull();
    expect(results[0]!.driftDetected).toBe(false);
    expect(results[0]!.severity).toBeNull();
  });

  it('reports suppressed when drift matches an exception', async () => {
    const refPath = join(tempDir, 'ref-sup');
    const driftedPath = join(tempDir, 'drifted-sup');
    mkdirSync(refPath);
    mkdirSync(driftedPath);

    scaffoldGoverned(refPath, BASE_CONFIG);
    scaffoldGoverned(driftedPath, { ...BASE_CONFIG, format: 'json' });

    const refHash = await computeGovernanceHash(refPath);
    const baseline: FleetBaseline = {
      name: 'test',
      hash: refHash,
      referenceWorkspacePath: refPath,
      createdAt: new Date().toISOString(),
    };

    const exceptions: FleetException[] = [{
      workspacePattern: 'drifted-sup',
      reason: 'Approved deviation',
      approver: 'admin',
      expiresAt: null,
    }];

    const results = await detectDrift([driftedPath], baseline, exceptions);
    expect(results).toHaveLength(1);
    expect(results[0]!.driftDetected).toBe(true);
    expect(results[0]!.suppressed).toBe(true);
    expect(results[0]!.status).toBe('suppressed');
    expect(results[0]!.suppressionReason).toBe('Approved deviation');
  });
});

// ─── 3-5. Severity classification ──────────────────────────────────────

describe('classifySeverity', () => {
  it('returns CRITICAL for trust tier downgrade', async () => {
    const refPath = join(tempDir, 'ref-crit');
    const wsPath = join(tempDir, 'ws-crit');
    mkdirSync(refPath);
    mkdirSync(wsPath);

    scaffoldGoverned(refPath, { ...BASE_CONFIG, trustTier: 3 });
    scaffoldGoverned(wsPath, { ...BASE_CONFIG, trustTier: 1 });

    const severity = await classifySeverity(wsPath, refPath);
    expect(severity).toBe('CRITICAL');
  });

  it('returns HIGH for policy removal', async () => {
    const refPath = join(tempDir, 'ref-high');
    const wsPath = join(tempDir, 'ws-high');
    mkdirSync(refPath);
    mkdirSync(wsPath);

    scaffoldGoverned(refPath, BASE_CONFIG);
    writeFileSync(join(refPath, '.claws', 'policies', 'extra.yaml'), 'name: extra\nrules:\n  - deny: network');
    scaffoldGoverned(wsPath, BASE_CONFIG);

    const severity = await classifySeverity(wsPath, refPath);
    expect(severity).toBe('HIGH');
  });

  it('returns HIGH for deny constraint removal', async () => {
    const refPath = join(tempDir, 'ref-deny');
    const wsPath = join(tempDir, 'ws-deny');
    mkdirSync(refPath);
    mkdirSync(wsPath);

    // Reference has deny: shell_exec + deny: network
    scaffoldGoverned(refPath, BASE_CONFIG, 'name: default\nrules:\n  - deny: shell_exec\n  - deny: network\n');
    // Workspace only has deny: shell_exec (network deny removed)
    scaffoldGoverned(wsPath, BASE_CONFIG, 'name: default\nrules:\n  - deny: shell_exec\n');

    const severity = await classifySeverity(wsPath, refPath);
    expect(severity).toBe('HIGH');
  });

  it('returns LOW for minor config change', async () => {
    const refPath = join(tempDir, 'ref-low');
    const wsPath = join(tempDir, 'ws-low');
    mkdirSync(refPath);
    mkdirSync(wsPath);

    scaffoldGoverned(refPath, BASE_CONFIG);
    scaffoldGoverned(wsPath, { ...BASE_CONFIG, format: 'json' });

    const severity = await classifySeverity(wsPath, refPath);
    expect(severity).toBe('LOW');
  });

  it('returns LOW when trust tier is upgraded (not downgraded)', async () => {
    const refPath = join(tempDir, 'ref-upgrade');
    const wsPath = join(tempDir, 'ws-upgrade');
    mkdirSync(refPath);
    mkdirSync(wsPath);

    scaffoldGoverned(refPath, { ...BASE_CONFIG, trustTier: 2 });
    scaffoldGoverned(wsPath, { ...BASE_CONFIG, trustTier: 4 });

    const severity = await classifySeverity(wsPath, refPath);
    expect(severity).toBe('LOW');
  });

  it('returns CRITICAL when neither workspace has claws.json (fail-closed)', async () => {
    const refPath = join(tempDir, 'ref-noconf');
    const wsPath = join(tempDir, 'ws-noconf');
    mkdirSync(refPath);
    mkdirSync(wsPath);

    // No claws.json, no policies — trust tier read returns null → fail-closed CRITICAL
    const severity = await classifySeverity(wsPath, refPath);
    expect(severity).toBe('CRITICAL');
  });

  it('returns CRITICAL when trust tier field is not a number (fail-closed)', async () => {
    const refPath = join(tempDir, 'ref-badtier');
    const wsPath = join(tempDir, 'ws-badtier');
    mkdirSync(refPath);
    mkdirSync(wsPath);

    // trustTier is a string — readTrustTier returns null → fail-closed CRITICAL
    scaffoldGoverned(refPath, { ...BASE_CONFIG, trustTier: 'invalid' });
    scaffoldGoverned(wsPath, { ...BASE_CONFIG, trustTier: 'also-invalid' });

    const severity = await classifySeverity(wsPath, refPath);
    expect(severity).toBe('CRITICAL');
  });
});

// ─── 6. Exception matching ──────────────────────────────────────────────

describe('matchException', () => {
  it('suppresses drift alert for matching exception', () => {
    const exception: FleetException = {
      workspacePattern: 'special-ws',
      reason: 'Approved by security team for testing',
      approver: 'ciso@example.com',
      expiresAt: null,
    };

    const result = matchException('/fleet/org/special-ws', [exception]);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('Approved by security team for testing');
  });

  it('does not match expired exceptions', () => {
    const expiredException: FleetException = {
      workspacePattern: 'special-ws',
      reason: 'Expired exception',
      approver: 'admin@example.com',
      expiresAt: '2020-01-01T00:00:00.000Z',
    };

    const result = matchException('/fleet/org/special-ws', [expiredException]);
    expect(result).toBeNull();
  });

  it('returns null when no exceptions match', () => {
    const exception: FleetException = {
      workspacePattern: 'other-ws',
      reason: 'Not relevant',
      approver: 'admin@example.com',
      expiresAt: null,
    };

    const result = matchException('/fleet/org/my-ws', [exception]);
    expect(result).toBeNull();
  });

  it('matches exception with backslash-normalized Windows path', () => {
    const exception: FleetException = {
      workspacePattern: 'special-ws',
      reason: 'Windows path test',
      approver: 'admin',
      expiresAt: null,
    };

    const result = matchException('C:\\fleet\\org\\special-ws', [exception]);
    expect(result).not.toBeNull();
  });

  it('matches future non-expired exception', () => {
    const futureDate = new Date(Date.now() + 86400000 * 365).toISOString();
    const exception: FleetException = {
      workspacePattern: 'future-ws',
      reason: 'Still valid',
      approver: 'admin',
      expiresAt: futureDate,
    };

    const result = matchException('/fleet/future-ws', [exception]);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('Still valid');
  });

  it('returns empty array for non-existent exceptions file', async () => {
    const exceptions = await loadExceptions(join(tempDir, 'does-not-exist'));
    expect(exceptions).toHaveLength(0);
  });
});

// ─── Exception I/O ─────────────────────────────────────────────────────

describe('exception I/O', () => {
  it('saveExceptions writes and loadExceptions reads back', async () => {
    const exceptions: FleetException[] = [{
      workspacePattern: 'test-ws',
      reason: 'Testing round-trip',
      approver: 'tester@example.com',
      expiresAt: null,
    }];

    await saveExceptions(tempDir, exceptions);
    const loaded = await loadExceptions(tempDir);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.workspacePattern).toBe('test-ws');
    expect(loaded[0]!.reason).toBe('Testing round-trip');
  });

  it('addException appends to existing exceptions', async () => {
    const first: FleetException = {
      workspacePattern: 'first-ws',
      reason: 'First exception',
      approver: 'admin',
      expiresAt: null,
    };
    const second: FleetException = {
      workspacePattern: 'second-ws',
      reason: 'Second exception',
      approver: 'admin',
      expiresAt: null,
    };

    await addException(tempDir, first);
    await addException(tempDir, second);

    const loaded = await loadExceptions(tempDir);
    expect(loaded).toHaveLength(2);
  });

  it('loadExceptions returns empty for missing file', async () => {
    const loaded = await loadExceptions(join(tempDir, 'nonexistent'));
    expect(loaded).toEqual([]);
  });
});

// ─── Baseline I/O ──────────────────────────────────────────────────────

describe('baseline I/O', () => {
  it('establishBaseline creates and loadBaseline retrieves', async () => {
    const wsPath = join(tempDir, 'ws-base');
    mkdirSync(wsPath);
    scaffoldGoverned(wsPath, BASE_CONFIG);

    const baseline = await establishBaseline(wsPath, 'prod', tempDir);
    expect(baseline.name).toBe('prod');
    expect(baseline.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(baseline.referenceWorkspacePath).toBe(wsPath);

    const loaded = await loadBaseline('prod', tempDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.hash).toBe(baseline.hash);
    expect(loaded!.name).toBe('prod');
  });

  it('loadBaseline returns null for non-existent baseline', async () => {
    const wsPath = join(tempDir, 'ws-base2');
    mkdirSync(wsPath);
    scaffoldGoverned(wsPath, BASE_CONFIG);

    await establishBaseline(wsPath, 'existing', tempDir);

    const loaded = await loadBaseline('non-existent', tempDir);
    expect(loaded).toBeNull();
  });

  it('loadBaseline returns null when manifest does not exist', async () => {
    const loaded = await loadBaseline('any', join(tempDir, 'no-manifest'));
    expect(loaded).toBeNull();
  });

  it('loadAllBaselines returns all stored baselines', async () => {
    const ws1 = join(tempDir, 'ws-all1');
    const ws2 = join(tempDir, 'ws-all2');
    mkdirSync(ws1);
    mkdirSync(ws2);

    scaffoldGoverned(ws1, BASE_CONFIG);
    scaffoldGoverned(ws2, { ...BASE_CONFIG, trustTier: 4 });

    await establishBaseline(ws1, 'alpha', tempDir);
    await establishBaseline(ws2, 'beta', tempDir);

    const all = await loadAllBaselines(tempDir);
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['alpha']).toBeDefined();
    expect(all['beta']).toBeDefined();
  });

  it('loadAllBaselines returns empty for missing manifest', async () => {
    const all = await loadAllBaselines(join(tempDir, 'no-manifest'));
    expect(Object.keys(all)).toHaveLength(0);
  });

  it('loadBaseline reads manifest with no baselines key', async () => {
    // Write a manifest file with no "baselines" key
    mkdirSync(join(tempDir, '.claws'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claws', 'fleet-manifest.json'),
      JSON.stringify({ version: 1 }),
    );

    const loaded = await loadBaseline('anything', tempDir);
    expect(loaded).toBeNull();

    const all = await loadAllBaselines(tempDir);
    expect(Object.keys(all)).toHaveLength(0);
  });

  it('establishBaseline overwrites existing baseline with same name', async () => {
    const ws1 = join(tempDir, 'ws-ow1');
    const ws2 = join(tempDir, 'ws-ow2');
    mkdirSync(ws1);
    mkdirSync(ws2);

    scaffoldGoverned(ws1, BASE_CONFIG);
    scaffoldGoverned(ws2, { ...BASE_CONFIG, trustTier: 5 });

    const first = await establishBaseline(ws1, 'overwrite', tempDir);
    const second = await establishBaseline(ws2, 'overwrite', tempDir);

    expect(first.hash).not.toBe(second.hash);

    const loaded = await loadBaseline('overwrite', tempDir);
    expect(loaded!.hash).toBe(second.hash);
  });
});
