/**
 * L0 unit tests for fleet broadcast — atomic write, retry, trust compat,
 * confirm gate, reason field.
 *
 * @module claws-sdk/tests/fleet/broadcast.unit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  atomicWritePolicy,
  validatePolicyFile,
  broadcastPolicy,
  recoverOrphanedStaging,
  isTransientError,
  isPermanentError,
  sleep,
} from '#src/fleet/broadcast.js';
import { checkTrustCompat, checkFleetTrustCompat } from '#src/fleet/trust-compat.js';
import type { WorkspaceInfo } from '#src/fleet/types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'broadcast-unit-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper: create a governed workspace fixture in tempDir.
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
 * Helper: create a valid policy YAML file.
 */
function createPolicyFile(name: string, content?: string, trustTier?: number): string {
  const filePath = join(tempDir, name);
  const yamlContent = content ?? [
    'name: soc2-baseline',
    'version: 2',
    ...(trustTier !== undefined ? [`trustTier: ${trustTier}`] : []),
    'rules:',
    '  - deny: shell_exec',
    '  - require: approval_for_deploy',
  ].join('\n');
  writeFileSync(filePath, yamlContent);
  return filePath;
}

// ── atomicWritePolicy ──────────────────────────────────────────────────

describe('atomicWritePolicy', () => {
  it('writes policy via staging dir then renames to target', async () => {
    const wsDir = createGovernedWorkspace('ws1');
    const content = 'name: test-policy\nversion: 1';

    await atomicWritePolicy(wsDir, 'broadcast.yaml', content);

    // Policy should be in .claws/policies/
    const targetPath = join(wsDir, '.claws', 'policies', 'broadcast.yaml');
    expect(existsSync(targetPath)).toBe(true);
    expect(readFileSync(targetPath, 'utf-8')).toBe(content);

    // Staging dir should be cleaned up
    const stagingDir = join(wsDir, '.claws', 'broadcast-staging');
    expect(existsSync(stagingDir)).toBe(false);
  });

  it('creates staging and policies dirs if they do not exist', async () => {
    const wsDir = join(tempDir, 'ws-fresh');
    mkdirSync(join(wsDir, '.claws'), { recursive: true });
    // No policies/ or broadcast-staging/ dirs yet

    await atomicWritePolicy(wsDir, 'fresh.yaml', 'name: fresh\nversion: 1');

    expect(existsSync(join(wsDir, '.claws', 'policies', 'fresh.yaml'))).toBe(true);
  });

  it('overwrites existing policy file', async () => {
    const wsDir = createGovernedWorkspace('ws-overwrite');
    writeFileSync(join(wsDir, '.claws', 'policies', 'old.yaml'), 'name: old');

    await atomicWritePolicy(wsDir, 'old.yaml', 'name: updated\nversion: 2');

    expect(readFileSync(join(wsDir, '.claws', 'policies', 'old.yaml'), 'utf-8')).toContain('updated');
  });
});

// ── validatePolicyFile ──────────────────────────────────────────────────

describe('validatePolicyFile', () => {
  it('rejects non-.yaml/.yml file extension', async () => {
    const badFile = join(tempDir, 'policy.json');
    writeFileSync(badFile, '{}');

    const result = await validatePolicyFile(badFile);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('.yaml or .yml extension');
    }
  });

  it('rejects non-existent file', async () => {
    const result = await validatePolicyFile(join(tempDir, 'no-such-file.yaml'));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Cannot read policy file');
    }
  });

  it('rejects invalid YAML content', async () => {
    const badYaml = join(tempDir, 'bad.yaml');
    writeFileSync(badYaml, '{ invalid: [yaml: nope');

    const result = await validatePolicyFile(badYaml);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Invalid YAML');
    }
  });

  it('accepts valid YAML with .yaml extension', async () => {
    const goodYaml = createPolicyFile('good.yaml');
    const result = await validatePolicyFile(goodYaml);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.content).toContain('soc2-baseline');
    }
  });

  it('accepts valid YAML with .yml extension', async () => {
    const goodYml = join(tempDir, 'good.yml');
    writeFileSync(goodYml, 'name: test\nversion: 1');

    const result = await validatePolicyFile(goodYml);
    expect(result.valid).toBe(true);
  });
});

// ── recoverOrphanedStaging ──────────────────────────────────────────────

describe('recoverOrphanedStaging', () => {
  it('recovers orphaned files from broadcast-staging to policies', async () => {
    const wsDir = createGovernedWorkspace('ws-orphan');
    const stagingDir = join(wsDir, '.claws', 'broadcast-staging');
    mkdirSync(stagingDir, { recursive: true });
    writeFileSync(join(stagingDir, 'orphan.yaml'), 'name: orphan');

    const recovered = await recoverOrphanedStaging(wsDir);
    expect(recovered).toContain('orphan.yaml');
    expect(existsSync(join(wsDir, '.claws', 'policies', 'orphan.yaml'))).toBe(true);
    expect(existsSync(stagingDir)).toBe(false);
  });

  it('returns empty array when no staging dir exists', async () => {
    const wsDir = createGovernedWorkspace('ws-no-staging');
    const recovered = await recoverOrphanedStaging(wsDir);
    expect(recovered).toHaveLength(0);
  });

  it('returns empty array when staging dir is empty', async () => {
    const wsDir = createGovernedWorkspace('ws-empty-staging');
    mkdirSync(join(wsDir, '.claws', 'broadcast-staging'), { recursive: true });
    const recovered = await recoverOrphanedStaging(wsDir);
    expect(recovered).toHaveLength(0);
  });
});

// ── trust compat ──────────────────────────────────────────────────────

describe('trust compat', () => {
  it('blocks trust floor downgrade (T3 → T2)', async () => {
    const wsDir = createGovernedWorkspace('ws-high-trust', 3);
    const policyPath = createPolicyFile('lower.yaml', undefined, 2);

    const result = await checkTrustCompat(wsDir, policyPath);
    expect(result.compatible).toBe(false);
    expect(result.currentTier).toBe(3);
    expect(result.policyTier).toBe(2);
    expect(result.reason).toContain('monotonic tightening violated');
  });

  it('allows trust floor upgrade (T2 → T4)', async () => {
    const wsDir = createGovernedWorkspace('ws-low-trust', 2);
    const policyPath = createPolicyFile('higher.yaml', undefined, 4);

    const result = await checkTrustCompat(wsDir, policyPath);
    expect(result.compatible).toBe(true);
    expect(result.currentTier).toBe(2);
    expect(result.policyTier).toBe(4);
    expect(result.reason).toContain('T2');
    expect(result.reason).toContain('T4');
  });

  it('allows same trust tier (T3 → T3)', async () => {
    const wsDir = createGovernedWorkspace('ws-same', 3);
    const policyPath = createPolicyFile('same.yaml', undefined, 3);

    const result = await checkTrustCompat(wsDir, policyPath);
    expect(result.compatible).toBe(true);
    expect(result.reason).toContain('T3');
  });

  it('allows broadcast when policy has no trust tier', async () => {
    const wsDir = createGovernedWorkspace('ws-no-tier', 3);
    const policyPath = createPolicyFile('no-tier.yaml'); // no trustTier field

    const result = await checkTrustCompat(wsDir, policyPath);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
    expect(result.reason).toContain('no floor change');
  });

  it('allows broadcast when workspace has no readable trust tier', async () => {
    // Workspace with invalid claws.json
    const wsDir = join(tempDir, 'ws-bad-config');
    mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
    writeFileSync(join(wsDir, 'claws.json'), 'not json');
    const policyPath = createPolicyFile('any.yaml', undefined, 4);

    const result = await checkTrustCompat(wsDir, policyPath);
    expect(result.compatible).toBe(true);
    expect(result.currentTier).toBe(0);
  });

  it('allows broadcast when workspace has no claws.json at all', async () => {
    const wsDir = join(tempDir, 'ws-no-config');
    mkdirSync(wsDir, { recursive: true });
    const policyPath = createPolicyFile('any2.yaml', undefined, 3);

    const result = await checkTrustCompat(wsDir, policyPath);
    expect(result.compatible).toBe(true);
    expect(result.currentTier).toBe(0);
  });

  it('returns currentTier=0 when claws.json has valid JSON but invalid schema', async () => {
    const wsDir = join(tempDir, 'ws-schema-fail');
    mkdirSync(wsDir, { recursive: true });
    // Valid JSON but trustTier is out of range (must be 1-5)
    writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({ trustTier: 99 }));
    const policyPath = createPolicyFile('schema-fail.yaml', undefined, 3);

    const result = await checkTrustCompat(wsDir, policyPath);
    expect(result.compatible).toBe(true);
    expect(result.currentTier).toBe(0);
  });

  it('returns policyTier=0 when policy YAML fails to parse', async () => {
    const wsDir = createGovernedWorkspace('ws-bad-policy', 3);
    const badPolicy = join(tempDir, 'bad-parse.yaml');
    writeFileSync(badPolicy, '{ broken: [yaml: ???');

    // validatePolicyFile would reject this, but checkTrustCompat reads independently
    const result = await checkTrustCompat(wsDir, badPolicy);
    // Policy can't be parsed → policyTier=0 → compatible (no floor change)
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });

  it('returns policyTier=0 when policy has non-numeric trustTier', async () => {
    const wsDir = createGovernedWorkspace('ws-nonnumeric', 3);
    const badPolicy = join(tempDir, 'nonnumeric.yaml');
    writeFileSync(badPolicy, 'name: test\ntrustTier: high\n');

    const result = await checkTrustCompat(wsDir, badPolicy);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });
});

// ── checkFleetTrustCompat ──────────────────────────────────────────────

describe('checkFleetTrustCompat', () => {
  it('returns allCompatible=true when all workspaces pass', async () => {
    const ws1 = createGovernedWorkspace('fleet-ws1', 2);
    const ws2 = createGovernedWorkspace('fleet-ws2', 3);
    const policyPath = createPolicyFile('fleet-up.yaml', undefined, 4);

    const result = await checkFleetTrustCompat([ws1, ws2], policyPath);
    expect(result.allCompatible).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it('returns allCompatible=false when any workspace fails', async () => {
    const ws1 = createGovernedWorkspace('fleet-pass', 2);
    const ws2 = createGovernedWorkspace('fleet-fail', 5);
    const policyPath = createPolicyFile('fleet-down.yaml', undefined, 3);

    const result = await checkFleetTrustCompat([ws1, ws2], policyPath);
    expect(result.allCompatible).toBe(false);
    expect(result.results.filter((r) => r.compatible)).toHaveLength(1);
    expect(result.results.filter((r) => !r.compatible)).toHaveLength(1);
  });
});

// ── confirm gate ──────────────────────────────────────────────────────

describe('confirm gate', () => {
  it('prevents write without --confirm flag', async () => {
    const wsDir = createGovernedWorkspace('ws-noconfirm');
    const policyPath = createPolicyFile('soc2.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: wsDir,
      markers: ['CLAUDE.md'],
      classification: 'GOVERNED',
      rationale: 'Valid',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: false,
      reason: 'Q2 compliance',
    });

    expect(result.executed).toBe(false);
    expect(result.preview).toBeDefined();
    expect(result.preview!).toHaveLength(1);
    expect(result.preview![0]!.action).toBe('would_broadcast');

    // No policy file should have been written
    const broadcastFile = join(wsDir, '.claws', 'policies', 'soc2.yaml');
    expect(existsSync(broadcastFile)).toBe(false);
  });

  it('includes UNGOVERNED workspaces as would_skip in preview', async () => {
    const ungov = join(tempDir, 'ungov');
    mkdirSync(ungov, { recursive: true });
    writeFileSync(join(ungov, 'CLAUDE.md'), '# Workspace');
    const policyPath = createPolicyFile('preview-test.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: ungov,
      markers: ['CLAUDE.md'],
      classification: 'UNGOVERNED',
      rationale: 'No .claws/',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: false,
      reason: 'test',
    });

    expect(result.preview![0]!.action).toBe('would_skip');
    expect(result.preview![0]!.classification).toBe('UNGOVERNED');
  });
});

// ── broadcastPolicy ──────────────────────────────────────────────────

describe('broadcastPolicy', () => {
  it('throws on invalid policy file', async () => {
    const badPath = join(tempDir, 'bad.json');
    writeFileSync(badPath, '{}');

    await expect(broadcastPolicy(badPath, [], {
      confirm: true,
      reason: 'test',
    })).rejects.toThrow('.yaml or .yml extension');
  });

  it('skips UNGOVERNED workspaces with skip message', async () => {
    const ungov = join(tempDir, 'ungov-skip');
    mkdirSync(ungov, { recursive: true });
    const policyPath = createPolicyFile('skip-test.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: ungov,
      markers: ['CLAUDE.md'],
      classification: 'UNGOVERNED',
      rationale: 'No .claws/',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'test',
    });

    expect(result.manifest!.skippedCount).toBe(1);
    expect(result.manifest!.results[0]!.skipped).toBe(true);
    expect(result.manifest!.results[0]!.message).toContain('UNGOVERNED');
  });

  it('skips MISCONFIGURED workspaces', async () => {
    const misconf = join(tempDir, 'misconf-skip');
    mkdirSync(misconf, { recursive: true });
    const policyPath = createPolicyFile('misconf-test.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: misconf,
      markers: ['CLAUDE.md'],
      classification: 'MISCONFIGURED',
      rationale: 'Bad config',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'test',
    });

    expect(result.manifest!.skippedCount).toBe(1);
    expect(result.manifest!.results[0]!.message).toContain('MISCONFIGURED');
  });

  it('skips workspace when trust compat blocks broadcast', async () => {
    const wsDir = createGovernedWorkspace('ws-trust-block', 5);
    const policyPath = createPolicyFile('lower-trust.yaml', undefined, 2);

    const workspaces: WorkspaceInfo[] = [{
      path: wsDir,
      markers: ['CLAUDE.md'],
      classification: 'GOVERNED',
      rationale: 'Valid',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'should block',
    });

    expect(result.manifest!.succeeded).toBe(0);
    expect(result.manifest!.skippedCount).toBe(1);
    expect(result.manifest!.results[0]!.message).toContain('Trust compat blocked');
  });

  it('broadcasts successfully to governed workspace', async () => {
    const wsDir = createGovernedWorkspace('ws-success');
    const policyPath = createPolicyFile('success.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: wsDir,
      markers: ['CLAUDE.md'],
      classification: 'GOVERNED',
      rationale: 'Valid',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'success test',
    });

    expect(result.manifest!.succeeded).toBe(1);
    expect(result.manifest!.failed).toBe(0);
    expect(existsSync(join(wsDir, '.claws', 'policies', 'success.yaml'))).toBe(true);
  });
});

// ── reason field ──────────────────────────────────────────────────────

describe('reason field', () => {
  it('stores reason in broadcast manifest', async () => {
    const wsDir = createGovernedWorkspace('ws-reason');
    const policyPath = createPolicyFile('soc2.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: wsDir,
      markers: ['CLAUDE.md'],
      classification: 'GOVERNED',
      rationale: 'Valid',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'Q2 compliance audit',
    });

    expect(result.executed).toBe(true);
    expect(result.manifest).toBeDefined();
    expect(result.manifest!.reason).toBe('Q2 compliance audit');

    // Manifest should also be on disk
    const manifestPath = join(wsDir, '.claws', 'fleet', 'broadcast-manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.reason).toBe('Q2 compliance audit');
  });
});

// ── atomicWritePolicy retry paths ────────────────────────────────────

describe('atomicWritePolicy retry paths', () => {
  it('retries on EBUSY then succeeds', async () => {
    const wsDir = createGovernedWorkspace('ws-ebusy');
    let callCount = 0;

    const flakyRename = async (src: string, dest: string) => {
      callCount++;
      if (callCount <= 2) {
        const err = Object.assign(new Error('resource busy'), { code: 'EBUSY' });
        throw err;
      }
      // Succeed on 3rd call
      const { rename: realRename } = await import('node:fs/promises');
      await realRename(src, dest);
    };

    await atomicWritePolicy(wsDir, 'retried.yaml', 'name: retried', flakyRename);

    expect(callCount).toBe(3);
    expect(existsSync(join(wsDir, '.claws', 'policies', 'retried.yaml'))).toBe(true);
  });

  it('throws permanent error immediately (no retry)', async () => {
    const wsDir = createGovernedWorkspace('ws-eacces');

    const permanentRename = async () => {
      const err = Object.assign(new Error('permission denied'), { code: 'EACCES' });
      throw err;
    };

    await expect(
      atomicWritePolicy(wsDir, 'denied.yaml', 'name: denied', permanentRename),
    ).rejects.toThrow('permission denied');
  });

  it('falls back to copyFile when rename fails with unknown error on last attempt', async () => {
    const wsDir = createGovernedWorkspace('ws-fallback');

    const alwaysFailRename = async () => {
      const err = Object.assign(new Error('unknown'), { code: 'EXDEV' });
      throw err;
    };

    // Should succeed via copyFile fallback
    await atomicWritePolicy(wsDir, 'fallback.yaml', 'name: fallback', alwaysFailRename);
    expect(existsSync(join(wsDir, '.claws', 'policies', 'fallback.yaml'))).toBe(true);
  });

  it('throws lastError when both rename and copyFile fail', async () => {
    const wsDir = createGovernedWorkspace('ws-total-fail');

    const failAndCleanup = async (src: string, _dest: string) => {
      // Delete the staging file so copyFile fallback also fails
      const { unlink } = await import('node:fs/promises');
      try { await unlink(src); } catch { /* ignore */ }
      const err = Object.assign(new Error('cross-device'), { code: 'EXDEV' });
      throw err;
    };

    await expect(
      atomicWritePolicy(wsDir, 'nope.yaml', 'name: nope', failAndCleanup),
    ).rejects.toThrow('cross-device');
  });
});

// ── isTransientError / isPermanentError ─────────────────────────────

describe('isTransientError', () => {
  it('returns true for EBUSY', () => {
    const err = Object.assign(new Error('EBUSY'), { code: 'EBUSY' });
    expect(isTransientError(err)).toBe(true);
  });

  it('returns true for EPERM', () => {
    const err = Object.assign(new Error('EPERM'), { code: 'EPERM' });
    expect(isTransientError(err)).toBe(true);
  });

  it('returns false for EACCES', () => {
    const err = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    expect(isTransientError(err)).toBe(false);
  });

  it('returns false for non-object errors', () => {
    expect(isTransientError('string error')).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });

  it('returns false for objects without code', () => {
    expect(isTransientError({ message: 'no code' })).toBe(false);
  });
});

describe('isPermanentError', () => {
  it('returns true for EACCES', () => {
    const err = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    expect(isPermanentError(err)).toBe(true);
  });

  it('returns true for ENOENT', () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    expect(isPermanentError(err)).toBe(true);
  });

  it('returns false for EBUSY', () => {
    const err = Object.assign(new Error('EBUSY'), { code: 'EBUSY' });
    expect(isPermanentError(err)).toBe(false);
  });

  it('returns false for non-object errors', () => {
    expect(isPermanentError('string')).toBe(false);
    expect(isPermanentError(null)).toBe(false);
  });
});

// ── sleep ──────────────────────────────────────────────────────────────

describe('sleep', () => {
  it('resolves after the specified delay', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // allow some jitter
  });
});

// ── broadcastPolicy error paths ─────────────────────────────────────

describe('broadcastPolicy error paths', () => {
  it('collects write failure when atomicWritePolicy fails for a governed workspace', async () => {
    // Create a workspace where the .claws directory is read-only by
    // not creating the policies dir — atomicWritePolicy will still
    // work since it creates dirs. Instead, use a non-existent base path
    // that will cause writeFile to fail.
    const policyPath = createPolicyFile('error-test.yaml');

    const wsPath = join(tempDir, 'ws-write-fail', 'deep', 'nest');
    // Don't create .claws at all — atomicWritePolicy creates it with mkdir -p
    // but we need atomicWritePolicy to fail. Use a file where a dir is expected.
    const fakeWs = join(tempDir, 'ws-file-conflict');
    mkdirSync(fakeWs, { recursive: true });
    writeFileSync(join(fakeWs, '.claws'), 'I am a file not a dir');

    const workspaces: WorkspaceInfo[] = [{
      path: fakeWs,
      markers: ['CLAUDE.md'],
      classification: 'GOVERNED',
      rationale: 'Valid',
    }];

    // The workspace has no claws.json so trust tier is 0 (compatible)
    // But atomicWritePolicy will fail because .claws is a file
    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'error test',
    });

    expect(result.manifest!.failed).toBe(1);
    expect(result.manifest!.succeeded).toBe(0);
    const failedResult = result.manifest!.results.find((r) => !r.success && !r.skipped);
    expect(failedResult).toBeDefined();
    expect(failedResult!.message).toContain('Failed:');
  });

  it('manifest counts are correct for mixed success/skip/fail', async () => {
    const gov = createGovernedWorkspace('ws-mix-gov');
    const policyPath = createPolicyFile('mix-test.yaml');

    const fakeWs = join(tempDir, 'ws-mix-fail');
    mkdirSync(fakeWs, { recursive: true });
    writeFileSync(join(fakeWs, '.claws'), 'file-not-dir');

    const workspaces: WorkspaceInfo[] = [
      { path: gov, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
      { path: fakeWs, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
      { path: join(tempDir, 'ungov'), markers: ['.cursorrules'], classification: 'UNGOVERNED', rationale: 'No .claws/' },
    ];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'mix test',
    });

    expect(result.manifest!.succeeded).toBe(1);
    expect(result.manifest!.skippedCount).toBe(1);
    expect(result.manifest!.failed).toBe(1);
    expect(result.manifest!.targeted).toBe(3);
  });
});

// ── SM5: fleet-level central broadcast log ────────────────────────

describe('fleet-level central broadcast log', () => {
  it('writes broadcast-log.jsonl to fleetRoot when option is provided', async () => {
    const wsDir = createGovernedWorkspace('ws-fleet-log');
    const fleetRoot = join(tempDir, 'fleet-root');
    mkdirSync(fleetRoot, { recursive: true });
    const policyPath = createPolicyFile('fleet-log.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: wsDir,
      markers: ['CLAUDE.md'],
      classification: 'GOVERNED',
      rationale: 'Valid',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'fleet log test',
      fleetRoot,
    });

    expect(result.executed).toBe(true);
    expect(result.manifest!.succeeded).toBe(1);

    // Verify central broadcast log was written
    const logPath = join(fleetRoot, '.claws', 'broadcast-log.jsonl');
    expect(existsSync(logPath)).toBe(true);
    const logContent = readFileSync(logPath, 'utf-8').trim();
    const logEntry = JSON.parse(logContent);
    expect(logEntry.policyFile).toBe('fleet-log.yaml');
    expect(logEntry.reason).toBe('fleet log test');
    expect(logEntry.succeeded).toBe(1);
  });

  it('does not write log when fleetRoot is not provided', async () => {
    const wsDir = createGovernedWorkspace('ws-no-fleet-log');
    const policyPath = createPolicyFile('no-fleet-log.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: wsDir,
      markers: ['CLAUDE.md'],
      classification: 'GOVERNED',
      rationale: 'Valid',
    }];

    await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'no fleet root',
    });

    // No .claws/broadcast-log.jsonl should exist anywhere in tempDir root
    expect(existsSync(join(tempDir, '.claws', 'broadcast-log.jsonl'))).toBe(false);
  });
});

// ── S-05: Symlink broadcast rejection ──────────────────────────────────

describe('symlink broadcast rejection (S-05)', () => {
  it('skips symlinked workspace path to prevent write redirection', async () => {
    const realWs = createGovernedWorkspace('ws-real-target');
    const symlinkPath = join(tempDir, 'ws-symlink');

    // Create symlink pointing to the real workspace
    try {
      symlinkSync(realWs, symlinkPath, 'junction');
    } catch {
      // Symlink creation may fail on Windows without admin privileges — skip test
      return;
    }

    const policyPath = createPolicyFile('symlink-test.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: symlinkPath,
      markers: ['CLAUDE.md'],
      classification: 'GOVERNED',
      rationale: 'Valid',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'symlink test',
    });

    expect(result.manifest!.succeeded).toBe(0);
    expect(result.manifest!.skippedCount).toBe(1);
    const skipped = result.manifest!.results[0]!;
    expect(skipped.skipped).toBe(true);
    expect(skipped.message).toContain('symlink');

    // Verify no policy was written to the real workspace via the symlink
    expect(existsSync(join(realWs, '.claws', 'policies', 'symlink-test.yaml'))).toBe(false);
  });

  it('allows non-symlinked workspace path', async () => {
    const wsDir = createGovernedWorkspace('ws-real');
    const policyPath = createPolicyFile('real-ws-test.yaml');

    const workspaces: WorkspaceInfo[] = [{
      path: wsDir,
      markers: ['CLAUDE.md'],
      classification: 'GOVERNED',
      rationale: 'Valid',
    }];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'non-symlink test',
    });

    expect(result.manifest!.succeeded).toBe(1);
    expect(existsSync(join(wsDir, '.claws', 'policies', 'real-ws-test.yaml'))).toBe(true);
  });
});
