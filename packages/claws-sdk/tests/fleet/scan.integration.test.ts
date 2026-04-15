/**
 * L1 integration tests for fleet scan — multi-workspace discovery.
 *
 * Uses the fixture directories to test the full scan pipeline:
 * discovery + classification + parallel execution.
 *
 * @module claws-sdk/tests/fleet/scan.integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanFleet, discoverWorkspacePaths } from '#src/fleet/scan.js';
import type { ProgressEvent, FleetConfig } from '#src/fleet/types.js';
import { defaultFleetConfig } from '#src/fleet/types.js';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'fleet');

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'fleet-integ-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Copy fixture workspace into a subdirectory of tempDir.
 */
function installFixture(fixtureName: string, targetName?: string): string {
  const src = join(FIXTURES_DIR, fixtureName);
  const dest = join(tempDir, targetName ?? fixtureName);
  cpSync(src, dest, { recursive: true });
  return dest;
}

describe('scanFleet integration', () => {
  it('discovers all 3 fixture workspaces with correct classifications', async () => {
    installFixture('governed-workspace');
    installFixture('ungoverned-workspace');
    installFixture('misconfigured-workspace');

    const result = await scanFleet(tempDir, { maxDepth: 2 });

    expect(result.workspaces).toHaveLength(3);

    const governed = result.workspaces.find((ws) => ws.classification === 'GOVERNED');
    const ungoverned = result.workspaces.find((ws) => ws.classification === 'UNGOVERNED');
    const misconfigured = result.workspaces.find((ws) => ws.classification === 'MISCONFIGURED');

    expect(governed).toBeDefined();
    expect(ungoverned).toBeDefined();
    expect(misconfigured).toBeDefined();

    expect(governed!.markers).toContain('CLAUDE.md');
    expect(ungoverned!.markers).toContain('.cursorrules');
    expect(misconfigured!.markers).toContain('CLAUDE.md');

    expect(result.stats.governed).toBe(1);
    expect(result.stats.ungoverned).toBe(1);
    expect(result.stats.misconfigured).toBe(1);
  });

  it('excludes node_modules directories', async () => {
    const nmDir = join(tempDir, 'node_modules', 'some-package');
    mkdirSync(nmDir, { recursive: true });
    writeFileSync(join(nmDir, 'CLAUDE.md'), '# Should not be found');

    installFixture('ungoverned-workspace', 'real-workspace');

    const result = await scanFleet(tempDir, { maxDepth: 3 });

    expect(result.workspaces).toHaveLength(1);
    expect(result.workspaces[0]!.path).toContain('real-workspace');
  });

  it('finds nested workspaces recursively', async () => {
    const nestedDir = join(tempDir, 'org', 'team', 'project');
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(join(nestedDir, 'CLAUDE.md'), '# Nested workspace');

    const result = await scanFleet(tempDir, { maxDepth: 5 });

    expect(result.workspaces).toHaveLength(1);
    expect(result.workspaces[0]!.path).toContain('project');
    expect(result.workspaces[0]!.classification).toBe('UNGOVERNED');
  });

  it('returns error for non-existent root directory', async () => {
    const result = await scanFleet(join(tempDir, 'no-such-dir'), { maxDepth: 2 });

    expect(result.workspaces).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain('does not exist');
    expect(result.stats.total).toBe(0);
    expect(result.stats.directoriesScanned).toBe(0);
  });

  it('returns error when root path is a file not a directory', async () => {
    const filePath = join(tempDir, 'a-file.txt');
    writeFileSync(filePath, 'I am a file');

    const result = await scanFleet(filePath, { maxDepth: 2 });

    expect(result.workspaces).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain('not a directory');
  });

  it('fires progress events during scan', async () => {
    installFixture('governed-workspace');

    const events: ProgressEvent[] = [];
    const result = await scanFleet(tempDir, { maxDepth: 2 }, (event) => {
      events.push(event);
    });

    const started = events.filter((e) => e.type === 'started');
    const completed = events.filter((e) => e.type === 'completed');
    expect(started.length).toBeGreaterThan(0);
    expect(completed.length).toBeGreaterThan(0);
    expect(result.workspaces.length).toBeGreaterThan(0);
  });

  it('discoverWorkspacePaths handles unreadable directory gracefully', async () => {
    const config: FleetConfig = { ...defaultFleetConfig(), maxDepth: 2 };
    // Use a non-existent path to trigger readdir failure
    const result = await discoverWorkspacePaths(join(tempDir, 'nonexistent-sub'), config);
    // Should still return valid structure, just with 1 dir counted
    expect(result.candidates).toHaveLength(0);
    expect(result.dirCount).toBe(1);
  });

  it('respects maxDepth to stop recursion', async () => {
    // Create deeply nested workspace
    const deep = join(tempDir, 'a', 'b', 'c', 'd');
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(deep, 'CLAUDE.md'), '# Deep');

    // maxDepth=1 should not find it (only checks root + 1 level)
    const shallow = await scanFleet(tempDir, { maxDepth: 1 });
    expect(shallow.workspaces).toHaveLength(0);

    // maxDepth=5 should find it
    const deepScan = await scanFleet(tempDir, { maxDepth: 5 });
    expect(deepScan.workspaces).toHaveLength(1);
  });
});
