/**
 * L1: Nested path detection — integration tests for subdirectory marker files.
 *
 * Tests full detect() pipeline with .github/copilot-instructions.md (nested)
 * and .cursor/ directory (forward-compat, no .cursorrules file).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detect } from '../../src/detect/detect.js';

let tmpRoot: string;

beforeAll(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), 'claws-nested-'));
});

afterAll(async () => {
  await rm(tmpRoot, { recursive: true, force: true });
});

describe('nested path detection integration', () => {
  it('full detect on workspace with .github/copilot-instructions.md in nested path', async () => {
    const workspace = join(tmpRoot, 'nested-copilot');
    await mkdir(join(workspace, '.github'), { recursive: true });
    await writeFile(
      join(workspace, '.github', 'copilot-instructions.md'),
      '# Copilot Instructions\nAlways write tests.',
    );

    const inventory = await detect(workspace);
    expect(inventory.detected).toBe(true);
    expect(inventory.platforms.has('github-copilot')).toBe(true);

    const copilot = inventory.platforms.get('github-copilot')!;
    expect(copilot.marker.platform).toBe('github-copilot');
    expect(copilot.marker.enforcement).toBe('advisory');
    expect(copilot.marker.markerFiles[0]).toContain('copilot-instructions.md');
  });

  it('full detect on workspace with .cursor/ directory (no .cursorrules file)', async () => {
    const workspace = join(tmpRoot, 'cursor-dir-only');
    await mkdir(join(workspace, '.cursor'), { recursive: true });
    // Write a rules file inside .cursor/ directory but NO .cursorrules at root
    await writeFile(
      join(workspace, '.cursor', 'rules'),
      'Use TypeScript strict mode.',
    );

    const inventory = await detect(workspace);
    expect(inventory.detected).toBe(true);
    expect(inventory.platforms.has('cursor')).toBe(true);

    const cursor = inventory.platforms.get('cursor')!;
    expect(cursor.marker.platform).toBe('cursor');
    expect(cursor.marker.enforcement).toBe('advisory');
    // .cursor/ directory path should be in the marker files
    expect(cursor.marker.markerFiles[0]).toContain('.cursor');
  });
});
