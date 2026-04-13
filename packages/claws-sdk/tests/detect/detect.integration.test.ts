/**
 * L1: detect() integration — full platform detection against fixture workspaces.
 *
 * Exercises the complete detect pipeline on realistic fixture directories.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { detect } from '../../src/detect/detect.js';

const FIXTURES = resolve(__dirname, '../fixtures');

describe('detect() integration', () => {
  it('full detect on platform-openclaw fixture returns OpenClaw entry', async () => {
    const root = resolve(FIXTURES, 'platform-openclaw');
    const inventory = await detect(root);

    expect(inventory.detected).toBe(true);
    expect(inventory.platforms.size).toBeGreaterThanOrEqual(1);
    expect(inventory.platforms.has('openclaw')).toBe(true);

    const oc = inventory.platforms.get('openclaw')!;
    expect(oc.marker.confidence).toBeGreaterThanOrEqual(0.8);
    expect(oc.marker.enforcement).toBe('full');
    expect(oc.marker.defaultTrustTier).toBe('from-config');
    expect(oc.marker.markerFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('full detect on platform-cursor fixture returns Cursor entry', async () => {
    const root = resolve(FIXTURES, 'platform-cursor');
    const inventory = await detect(root);

    expect(inventory.detected).toBe(true);
    expect(inventory.platforms.has('cursor')).toBe(true);

    const cursor = inventory.platforms.get('cursor')!;
    expect(cursor.marker.confidence).toBe(1.0);
    expect(cursor.marker.enforcement).toBe('advisory');
    expect(cursor.marker.defaultTrustTier).toBe(1);
  });

  it('full detect on platform-multi fixture returns multiple entries', async () => {
    const root = resolve(FIXTURES, 'platform-multi');
    const inventory = await detect(root);

    expect(inventory.detected).toBe(true);
    // platform-multi has CLAUDE.md, .cursorrules, and .github/copilot-instructions.md
    expect(inventory.platforms.size).toBeGreaterThanOrEqual(3);
    expect(inventory.platforms.has('claude-code')).toBe(true);
    expect(inventory.platforms.has('cursor')).toBe(true);
    expect(inventory.platforms.has('github-copilot')).toBe(true);
  });
});
