/**
 * L3 acceptance test for fleet partial broadcast failure — S04.
 *
 * Validates broadcast resilience:
 * - Transient failure retried (EBUSY/EPERM trigger retry)
 * - Permanent failure skipped (EACCES/ENOENT skipped immediately)
 * - Other workspaces still receive policy
 * - Result reports per-workspace success/failure
 *
 * @module claws-sdk/tests/accept/e2e/fleet-partial-broadcast.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { broadcastPolicy, atomicWritePolicy, isPermanentError, isTransientError } from '#src/fleet/broadcast.js';
import type { WorkspaceInfo } from '#src/fleet/types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'partial-broadcast-accept-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper: create a governed workspace with optional read-only simulation.
 */
function createGovernedWorkspace(name: string, trustTier = 3): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({
    trustTier,
    failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    fleet: { allowBypass: false },
  }));
  writeFileSync(join(wsDir, '.claws', 'policies', 'default.yaml'), 'name: default\nversion: 1');
  return wsDir;
}

/**
 * Helper: create a policy YAML file.
 */
function createPolicyFile(name: string): string {
  const filePath = join(tempDir, name);
  const content = [
    'name: soc2-v2',
    'version: 2',
    'rules:',
    '  - deny: shell_exec',
  ].join('\n');
  writeFileSync(filePath, content);
  return filePath;
}

describe('fleet partial broadcast failure contract (S04)', () => {
  it('transient retried, permanent skipped, other workspaces succeed, per-workspace results', async () => {
    // ── 1. Error classification ───────────────────────────────────────

    // Transient errors: EBUSY, EPERM
    const ebusyErr = Object.assign(new Error('EBUSY'), { code: 'EBUSY' });
    const epermErr = Object.assign(new Error('EPERM'), { code: 'EPERM' });
    expect(isTransientError(ebusyErr)).toBe(true);
    expect(isTransientError(epermErr)).toBe(true);

    // Permanent errors: EACCES, ENOENT
    const eaccesErr = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    const enoentErr = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    expect(isPermanentError(eaccesErr)).toBe(true);
    expect(isPermanentError(enoentErr)).toBe(true);

    // Transient is not permanent, permanent is not transient
    expect(isPermanentError(ebusyErr)).toBe(false);
    expect(isTransientError(eaccesErr)).toBe(false);

    // ── 2. Transient failure retried then succeeds ────────────────────

    const wsRetry = createGovernedWorkspace('ws-retry');
    let retryCount = 0;
    await atomicWritePolicy(wsRetry, 'retry-test.yaml', 'name: retry\nversion: 1', async (src, dest) => {
      retryCount++;
      if (retryCount < 3) {
        throw Object.assign(new Error('EBUSY'), { code: 'EBUSY' });
      }
      const { rename } = await import('node:fs/promises');
      await rename(src, dest);
    });
    // The operation completed after retries
    expect(existsSync(join(wsRetry, '.claws', 'policies', 'retry-test.yaml'))).toBe(true);
    expect(retryCount).toBe(3); // failed twice, succeeded on third

    // ── 3. Permanent failure causes immediate throw ───────────────────

    const wsPerm = createGovernedWorkspace('ws-perm');
    let permAttempts = 0;
    try {
      await atomicWritePolicy(wsPerm, 'perm-test.yaml', 'name: perm\nversion: 1', async () => {
        permAttempts++;
        throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      });
      expect.unreachable('should have thrown on permanent error');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as NodeJS.ErrnoException).code).toBe('EACCES');
    }
    // Permanent errors are thrown immediately, no retry
    expect(permAttempts).toBe(1);

    // ── 4. Partial broadcast: some succeed, some fail ─────────────────

    // 8 workspaces that succeed, 2 that fail (via ENOENT paths)
    const goodWorkspaces: string[] = [];
    for (let i = 0; i < 8; i++) {
      goodWorkspaces.push(createGovernedWorkspace(`ws-good-${i}`));
    }

    // Create 2 "bad" workspace paths: use non-existent drive/UNC paths
    // that cannot be created by mkdir. On Windows, paths under a non-existent
    // root will fail with ENOENT or similar when atomicWritePolicy tries
    // to create directories.
    const badWs1 = join(tempDir, 'ws-eta');
    const badWs2 = join(tempDir, 'ws-theta');

    // Create them with governance so they appear valid to trust-compat
    mkdirSync(join(badWs1, '.claws', 'policies'), { recursive: true });
    writeFileSync(join(badWs1, 'CLAUDE.md'), '# Workspace');
    writeFileSync(join(badWs1, 'claws.json'), JSON.stringify({
      trustTier: 3,
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
      fleet: { allowBypass: false },
    }));
    writeFileSync(join(badWs1, '.claws', 'policies', 'default.yaml'), 'name: default\nversion: 1');

    mkdirSync(join(badWs2, '.claws', 'policies'), { recursive: true });
    writeFileSync(join(badWs2, 'CLAUDE.md'), '# Workspace');
    writeFileSync(join(badWs2, 'claws.json'), JSON.stringify({
      trustTier: 3,
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
      fleet: { allowBypass: false },
    }));
    writeFileSync(join(badWs2, '.claws', 'policies', 'default.yaml'), 'name: default\nversion: 1');

    // Make the broadcast-staging dir a file (not a dir) so mkdir fails
    // on atomic write. This simulates an unwritable workspace.
    writeFileSync(join(badWs1, '.claws', 'broadcast-staging'), 'block');
    writeFileSync(join(badWs2, '.claws', 'broadcast-staging'), 'block');

    const allWorkspaces: WorkspaceInfo[] = [
      ...goodWorkspaces.map((p) => ({
        path: p,
        markers: ['CLAUDE.md'] as readonly string[],
        classification: 'GOVERNED' as const,
        rationale: 'Valid',
      })),
      { path: badWs1, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
      { path: badWs2, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
    ];

    const policyPath = createPolicyFile('soc2-v2.yaml');

    const result = await broadcastPolicy(policyPath, allWorkspaces, {
      confirm: true,
      reason: 'SOC2-2026 A2A controls',
      fleetRoot: tempDir,
    });

    // Broadcast executed
    expect(result.executed).toBe(true);
    const manifest = result.manifest!;

    // 8 succeeded, 2 failed
    expect(manifest.succeeded).toBe(8);
    expect(manifest.failed).toBe(2);

    // Per-workspace results
    for (const goodPath of goodWorkspaces) {
      const wsResult = manifest.results.find((r) => r.path === goodPath);
      expect(wsResult).toBeDefined();
      expect(wsResult!.success).toBe(true);
      expect(existsSync(join(goodPath, '.claws', 'policies', 'soc2-v2.yaml'))).toBe(true);
    }

    // Failed workspaces have failure messages
    const eta = manifest.results.find((r) => r.path === badWs1);
    expect(eta).toBeDefined();
    expect(eta!.success).toBe(false);
    expect(eta!.message).toContain('Failed');

    const theta = manifest.results.find((r) => r.path === badWs2);
    expect(theta).toBeDefined();
    expect(theta!.success).toBe(false);
    expect(theta!.message).toContain('Failed');

    // Manifest records the correct totals
    expect(manifest.targeted).toBe(10);
    expect(manifest.policyFile).toBe('soc2-v2.yaml');
    expect(manifest.reason).toBe('SOC2-2026 A2A controls');
    expect(manifest.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
