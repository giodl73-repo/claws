/**
 * L3 acceptance test for fleet scan — classification accuracy contract.
 *
 * Verifies the fleet scan contract:
 * - GOVERNED/UNGOVERNED/MISCONFIGURED all correctly identified
 * - node_modules excluded
 * - Nested workspaces found
 *
 * @module claws-sdk/tests/accept/e2e/fleet-scan.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanFleet } from '#src/fleet/scan.js';

const FIXTURES_DIR = join(__dirname, '..', '..', 'fixtures', 'fleet');

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'fleet-accept-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('fleet scan classification accuracy contract', () => {
  it('correctly identifies GOVERNED, UNGOVERNED, and MISCONFIGURED workspaces with exclusions and nesting', async () => {
    // 1. Install the 3 fixture workspaces at top level
    cpSync(join(FIXTURES_DIR, 'governed-workspace'), join(tempDir, 'governed'), { recursive: true });
    cpSync(join(FIXTURES_DIR, 'ungoverned-workspace'), join(tempDir, 'ungoverned'), { recursive: true });
    cpSync(join(FIXTURES_DIR, 'misconfigured-workspace'), join(tempDir, 'misconfigured'), { recursive: true });

    // 2. Create a workspace inside node_modules (should be excluded)
    const nmWorkspace = join(tempDir, 'node_modules', 'hidden-pkg');
    mkdirSync(nmWorkspace, { recursive: true });
    writeFileSync(join(nmWorkspace, 'CLAUDE.md'), '# Hidden');

    // 3. Create a nested workspace deep in the tree
    const nested = join(tempDir, 'org', 'team', 'nested-project');
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, 'AGENTS.md'), '# Nested Agent');

    // Run scan
    const result = await scanFleet(tempDir, { maxDepth: 5 });

    // Should find 4 workspaces: 3 fixtures + 1 nested
    // NOT the one in node_modules
    expect(result.workspaces).toHaveLength(4);

    // Classification accuracy
    const classifications = result.workspaces.map((ws) => ws.classification);
    expect(classifications.filter((c) => c === 'GOVERNED')).toHaveLength(1);
    expect(classifications.filter((c) => c === 'UNGOVERNED')).toHaveLength(2); // ungoverned fixture + nested
    expect(classifications.filter((c) => c === 'MISCONFIGURED')).toHaveLength(1);

    // node_modules exclusion — no workspace path should contain node_modules
    for (const ws of result.workspaces) {
      expect(ws.path).not.toContain('node_modules');
    }

    // Nested workspace found
    const nestedWs = result.workspaces.find((ws) => ws.path.includes('nested-project'));
    expect(nestedWs).toBeDefined();
    expect(nestedWs!.markers).toContain('AGENTS.md');
    expect(nestedWs!.classification).toBe('UNGOVERNED');

    // Stats are accurate
    expect(result.stats.total).toBe(4);
    expect(result.stats.governed).toBe(1);
    expect(result.stats.ungoverned).toBe(2);
    expect(result.stats.misconfigured).toBe(1);
  });
});
