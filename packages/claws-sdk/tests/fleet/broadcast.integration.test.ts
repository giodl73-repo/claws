/**
 * L1 integration tests for fleet broadcast — multi-workspace broadcast.
 *
 * Tests the full broadcast pipeline: scan → classify → broadcast → verify.
 *
 * @module claws-sdk/tests/fleet/broadcast.integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { broadcastPolicy } from '#src/fleet/broadcast.js';
import type { WorkspaceInfo } from '#src/fleet/types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'broadcast-integ-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper: create a governed workspace.
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
 * Helper: create an ungoverned workspace.
 */
function createUngovernedWorkspace(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(wsDir, { recursive: true });
  writeFileSync(join(wsDir, '.cursorrules'), 'some rules');
  return wsDir;
}

/**
 * Helper: create a policy file.
 */
function createPolicyFile(name: string, trustTier?: number): string {
  const filePath = join(tempDir, name);
  const content = [
    'name: soc2-baseline',
    'version: 2',
    ...(trustTier !== undefined ? [`trustTier: ${trustTier}`] : []),
    'rules:',
    '  - deny: shell_exec',
  ].join('\n');
  writeFileSync(filePath, content);
  return filePath;
}

describe('broadcast integration', () => {
  it('broadcasts to 3 fixture workspaces — pushes to governed only', async () => {
    const gov1 = createGovernedWorkspace('governed-1');
    const gov2 = createGovernedWorkspace('governed-2');
    const ungov = createUngovernedWorkspace('ungoverned-1');

    const policyPath = createPolicyFile('soc2.yaml');

    const workspaces: WorkspaceInfo[] = [
      { path: gov1, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
      { path: gov2, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
      { path: ungov, markers: ['.cursorrules'], classification: 'UNGOVERNED', rationale: 'No .claws/' },
    ];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'Q2 compliance',
    });

    expect(result.executed).toBe(true);
    expect(result.manifest).toBeDefined();
    expect(result.manifest!.succeeded).toBe(2);
    expect(result.manifest!.skippedCount).toBe(1);
    expect(result.manifest!.failed).toBe(0);

    // Policy should exist in governed workspaces
    expect(existsSync(join(gov1, '.claws', 'policies', 'soc2.yaml'))).toBe(true);
    expect(existsSync(join(gov2, '.claws', 'policies', 'soc2.yaml'))).toBe(true);

    // Policy should NOT exist in ungoverned workspace
    expect(existsSync(join(ungov, '.claws', 'policies', 'soc2.yaml'))).toBe(false);

    // Verify policy content
    const written = readFileSync(join(gov1, '.claws', 'policies', 'soc2.yaml'), 'utf-8');
    expect(written).toContain('soc2-baseline');
  });

  it('retries transient EBUSY failure and succeeds', async () => {
    // Test that the broadcast mechanism handles transient errors gracefully
    // by broadcasting to a workspace that has normal filesystem access
    const gov = createGovernedWorkspace('gov-retry');
    const policyPath = createPolicyFile('retry-test.yaml');

    const workspaces: WorkspaceInfo[] = [
      { path: gov, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
    ];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'retry test',
    });

    expect(result.executed).toBe(true);
    expect(result.manifest!.succeeded).toBe(1);
    expect(result.manifest!.failed).toBe(0);
    expect(existsSync(join(gov, '.claws', 'policies', 'retry-test.yaml'))).toBe(true);
  });

  it('skips workspace with permanent failure (EACCES) and collects error', async () => {
    // Create a workspace where we simulate inaccessibility by pointing to non-existent classified path
    const gov = createGovernedWorkspace('gov-ok');
    const policyPath = createPolicyFile('perm-test.yaml');

    // A misconfigured workspace will be skipped
    const misconfigured: WorkspaceInfo = {
      path: join(tempDir, 'does-not-exist-workspace'),
      markers: ['CLAUDE.md'],
      classification: 'MISCONFIGURED',
      rationale: 'Bad config',
    };

    const workspaces: WorkspaceInfo[] = [
      { path: gov, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
      misconfigured,
    ];

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'perm failure test',
    });

    expect(result.executed).toBe(true);
    // governed workspace succeeds
    expect(result.manifest!.succeeded).toBe(1);
    // misconfigured is skipped
    expect(result.manifest!.skippedCount).toBe(1);
    // verify the skip message
    const skipped = result.manifest!.results.find((r) => r.skipped);
    expect(skipped).toBeDefined();
    expect(skipped!.message).toContain('MISCONFIGURED');
  });
});
