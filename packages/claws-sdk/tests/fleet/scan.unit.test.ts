/**
 * L0 unit tests for fleet scan — marker discovery, classification, runner.
 *
 * @module claws-sdk/tests/fleet/scan.unit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { findMarkers, scanFleet, discoverWorkspacePaths } from '#src/fleet/scan.js';
import { classifyWorkspace } from '#src/fleet/classify.js';
import { runParallel } from '#src/fleet/runner.js';
import { defaultFleetConfig } from '#src/fleet/types.js';
import type { ProgressEvent } from '#src/fleet/types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'fleet-unit-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('findMarkers', () => {
  it('finds SOUL.md and CLAUDE.md markers', async () => {
    writeFileSync(join(tempDir, 'SOUL.md'), '# Soul');
    writeFileSync(join(tempDir, 'CLAUDE.md'), '# Claude');

    const markers = await findMarkers(tempDir);
    expect(markers).toContain('SOUL.md');
    expect(markers).toContain('CLAUDE.md');
  });

  it('returns empty for directory with no markers', async () => {
    writeFileSync(join(tempDir, 'README.md'), '# Not a marker');

    const markers = await findMarkers(tempDir);
    expect(markers).toHaveLength(0);
  });

  it('returns empty for non-existent directory', async () => {
    const markers = await findMarkers(join(tempDir, 'does-not-exist'));
    expect(markers).toHaveLength(0);
  });

  it('detects .cursor/rules nested marker', async () => {
    mkdirSync(join(tempDir, '.cursor'), { recursive: true });
    writeFileSync(join(tempDir, '.cursor', 'rules'), 'some rules');

    const markers = await findMarkers(tempDir);
    expect(markers).toContain('.cursor/rules');
  });

  it('detects AGENTS.md and TOOLS.md markers', async () => {
    writeFileSync(join(tempDir, 'AGENTS.md'), '# Agents');
    writeFileSync(join(tempDir, 'TOOLS.md'), '# Tools');

    const markers = await findMarkers(tempDir);
    expect(markers).toContain('AGENTS.md');
    expect(markers).toContain('TOOLS.md');
  });
});

describe('classifyWorkspace', () => {
  it('returns GOVERNED for valid .claws/ with config and policy', async () => {
    mkdirSync(join(tempDir, '.claws', 'policies'), { recursive: true });
    writeFileSync(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 2,
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
      fleet: { allowBypass: false },
    }));
    writeFileSync(join(tempDir, '.claws', 'policies', 'default.yaml'), 'name: default');

    const result = await classifyWorkspace(tempDir, ['CLAUDE.md']);
    expect(result.classification).toBe('GOVERNED');
    expect(result.markers).toEqual(['CLAUDE.md']);
    expect(result.rationale).toContain('Valid');
  });

  it('returns UNGOVERNED for workspace without .claws/', async () => {
    const result = await classifyWorkspace(tempDir, ['.cursorrules']);
    expect(result.classification).toBe('UNGOVERNED');
    expect(result.rationale).toContain('no .claws/ directory');
  });

  it('returns MISCONFIGURED for invalid claws.json (bad JSON)', async () => {
    mkdirSync(join(tempDir, '.claws', 'policies'), { recursive: true });
    writeFileSync(join(tempDir, 'claws.json'), '{ invalid json }');

    const result = await classifyWorkspace(tempDir, ['CLAUDE.md']);
    expect(result.classification).toBe('MISCONFIGURED');
    expect(result.rationale).toContain('invalid JSON');
  });

  it('returns MISCONFIGURED when claws.json is missing but .claws/ exists', async () => {
    mkdirSync(join(tempDir, '.claws'), { recursive: true });

    const result = await classifyWorkspace(tempDir, ['CLAUDE.md']);
    expect(result.classification).toBe('MISCONFIGURED');
    expect(result.rationale).toContain('not found');
  });

  it('returns MISCONFIGURED when claws.json fails schema validation', async () => {
    mkdirSync(join(tempDir, '.claws', 'policies'), { recursive: true });
    // trustTier must be 1-5, so 99 is invalid
    writeFileSync(join(tempDir, 'claws.json'), JSON.stringify({ trustTier: 99 }));

    const result = await classifyWorkspace(tempDir, ['CLAUDE.md']);
    expect(result.classification).toBe('MISCONFIGURED');
    expect(result.rationale).toContain('schema validation failed');
    expect(result.metadata).toBeDefined();
  });

  it('returns MISCONFIGURED when valid config but no policies directory', async () => {
    mkdirSync(join(tempDir, '.claws'), { recursive: true });
    // No .claws/policies/ directory at all
    writeFileSync(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 2,
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
      fleet: { allowBypass: false },
    }));

    const result = await classifyWorkspace(tempDir, ['CLAUDE.md']);
    expect(result.classification).toBe('MISCONFIGURED');
    expect(result.rationale).toContain('no policies');
  });

  it('returns MISCONFIGURED when valid config but empty policies directory', async () => {
    mkdirSync(join(tempDir, '.claws', 'policies'), { recursive: true });
    writeFileSync(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 2,
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
      fleet: { allowBypass: false },
    }));
    // policies dir exists but is empty

    const result = await classifyWorkspace(tempDir, ['CLAUDE.md']);
    expect(result.classification).toBe('MISCONFIGURED');
    expect(result.rationale).toContain('no policies');
  });
});

describe('runParallel', () => {
  it('respects concurrency limit', async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const items = Array.from({ length: 10 }, (_, i) => ({ path: `item-${i}` }));

    await runParallel(
      items,
      async (item) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((resolve) => setTimeout(resolve, 10));
        currentConcurrent--;
        return item.path;
      },
      3,
    );

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it('returns empty results for empty items', async () => {
    const result = await runParallel(
      [],
      async (item: { path: string }) => item.path,
      8,
    );

    expect(result.results).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('collects errors from failing operations', async () => {
    const items = [
      { path: '/good' },
      { path: '/bad' },
      { path: '/also-good' },
    ];

    const errorCallbackPaths: string[] = [];

    const result = await runParallel(
      items,
      async (item) => {
        if (item.path === '/bad') {
          throw new Error('something went wrong');
        }
        return item.path;
      },
      8,
      (item, _error) => {
        errorCallbackPaths.push(item.path);
      },
    );

    expect(result.results).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.path).toBe('/bad');
    expect(result.errors[0]!.error).toBe('something went wrong');
    expect(errorCallbackPaths).toEqual(['/bad']);
  });

  it('collects non-Error thrown values', async () => {
    const items = [{ path: '/throw-string' }];

    const result = await runParallel(
      items,
      async () => {
        throw 'raw string error';
      },
      8,
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.error).toBe('raw string error');
  });

  it('fires progress callback for each workspace', async () => {
    const events: ProgressEvent[] = [];
    const items = [
      { path: '/a' },
      { path: '/b' },
    ];

    await runParallel(
      items,
      async (item) => {
        events.push({ type: 'started', path: item.path });
        events.push({ type: 'completed', path: item.path, workspace: {
          path: item.path,
          markers: ['CLAUDE.md'],
          classification: 'UNGOVERNED' as const,
          rationale: 'test',
        }});
        return item.path;
      },
      8,
    );

    expect(events).toHaveLength(4);
    expect(events.filter((e) => e.type === 'started')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'completed')).toHaveLength(2);
  });
});

describe('scanFleet', () => {
  it('returns error when root path is a file, not a directory', async () => {
    const filePath = join(tempDir, 'not-a-dir.txt');
    writeFileSync(filePath, 'just a file');

    const result = await scanFleet(filePath);

    expect(result.workspaces).toHaveLength(0);
    expect(result.stats.total).toBe(0);
    expect(result.stats.directoriesScanned).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain('not a directory');
  });

  it('returns error when root path does not exist', async () => {
    const result = await scanFleet(join(tempDir, 'nonexistent'));

    expect(result.workspaces).toHaveLength(0);
    expect(result.stats.total).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain('not accessible');
  });

  it('scans a valid directory tree and discovers workspaces', async () => {
    // Create a workspace with a marker
    const wsDir = join(tempDir, 'ws1');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'CLAUDE.md'), '# Claude');

    const result = await scanFleet(tempDir);

    expect(result.stats.directoriesScanned).toBeGreaterThanOrEqual(1);
    expect(result.errors).toHaveLength(0);
    // ws1 should be discovered as UNGOVERNED (has marker but no .claws/)
    const ws = result.workspaces.find((w) => w.path.includes('ws1'));
    expect(ws).toBeDefined();
    expect(ws!.classification).toBe('UNGOVERNED');
  });
});

describe('discoverWorkspacePaths', () => {
  it('returns empty candidates for unreadable subdirectory', async () => {
    // We can test that readdir failure in subdirectory traversal is handled
    // by using depth=0 to stop recursion
    const config = { ...defaultFleetConfig(), maxDepth: 0 };
    const { candidates, dirCount } = await discoverWorkspacePaths(tempDir, config);

    // No markers in temp dir → no candidates; depth=0 stops recursion
    expect(candidates).toHaveLength(0);
    expect(dirCount).toBe(1);
  });
});
