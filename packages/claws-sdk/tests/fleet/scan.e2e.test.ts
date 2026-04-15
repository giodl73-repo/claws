/**
 * L2 e2e test for fleet scan — full pipeline from fixture → scan → verify.
 *
 * Creates 3 temp workspace dirs from fixtures, scans them, and verifies
 * all 3 are discovered with correct classification, stats, and progress
 * callbacks fired.
 *
 * @module claws-sdk/tests/fleet/scan.e2e
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanFleet } from '#src/fleet/scan.js';
import type { ProgressEvent } from '#src/fleet/types.js';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'fleet');

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'fleet-e2e-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('fleet scan e2e', () => {
  it('creates 3 temp workspace dirs from fixtures → scan → verify classification + stats + progress', async () => {
    // Copy all 3 fixture workspaces
    cpSync(join(FIXTURES_DIR, 'governed-workspace'), join(tempDir, 'governed-workspace'), { recursive: true });
    cpSync(join(FIXTURES_DIR, 'ungoverned-workspace'), join(tempDir, 'ungoverned-workspace'), { recursive: true });
    cpSync(join(FIXTURES_DIR, 'misconfigured-workspace'), join(tempDir, 'misconfigured-workspace'), { recursive: true });

    // Track progress events
    const events: ProgressEvent[] = [];
    const onProgress = (event: ProgressEvent) => events.push(event);

    // Run the full scan
    const result = await scanFleet(tempDir, { maxDepth: 2 }, onProgress);

    // Verify all 3 workspaces discovered
    expect(result.workspaces).toHaveLength(3);

    // Verify correct classification
    const byClass = new Map(
      result.workspaces.map((ws) => [ws.classification, ws]),
    );
    expect(byClass.get('GOVERNED')).toBeDefined();
    expect(byClass.get('UNGOVERNED')).toBeDefined();
    expect(byClass.get('MISCONFIGURED')).toBeDefined();

    // Verify governed workspace details
    const governed = byClass.get('GOVERNED')!;
    expect(governed.markers).toContain('CLAUDE.md');
    expect(governed.rationale).toContain('Valid');

    // Verify ungoverned workspace
    const ungoverned = byClass.get('UNGOVERNED')!;
    expect(ungoverned.markers).toContain('.cursorrules');

    // Verify misconfigured workspace
    const misconfigured = byClass.get('MISCONFIGURED')!;
    expect(misconfigured.markers).toContain('CLAUDE.md');
    expect(misconfigured.rationale).toContain('.claws/');

    // Verify stats
    expect(result.stats.total).toBe(3);
    expect(result.stats.governed).toBe(1);
    expect(result.stats.ungoverned).toBe(1);
    expect(result.stats.misconfigured).toBe(1);
    expect(result.stats.directoriesScanned).toBeGreaterThan(0);
    expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);

    // Verify progress callbacks fired
    const started = events.filter((e) => e.type === 'started');
    const completed = events.filter((e) => e.type === 'completed');
    expect(started).toHaveLength(3);
    expect(completed).toHaveLength(3);

    // No errors
    expect(result.errors).toHaveLength(0);
  });
});
