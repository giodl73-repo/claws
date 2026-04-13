/**
 * L0: detect() orchestration — scans workspace root for platform markers.
 *
 * Tests the top-level detect() function which dispatches to per-platform
 * detectors and aggregates results into a PlatformInventory.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detect } from '../../src/detect/detect.js';

const FIXTURES = resolve(__dirname, '../fixtures');

describe('detect()', () => {
  it('detects OpenClaw workspace with full enforcement', async () => {
    const root = resolve(FIXTURES, 'platform-openclaw');
    const inventory = await detect(root);

    expect(inventory.detected).toBe(true);
    expect(inventory.platforms.has('openclaw')).toBe(true);

    const oc = inventory.platforms.get('openclaw')!;
    expect(oc.marker.enforcement).toBe('full');
    expect(oc.marker.platform).toBe('openclaw');
  });

  it('detects Cursor workspace with advisory enforcement and T1 default', async () => {
    const root = resolve(FIXTURES, 'platform-cursor');
    const inventory = await detect(root);

    expect(inventory.detected).toBe(true);
    expect(inventory.platforms.has('cursor')).toBe(true);

    const cursor = inventory.platforms.get('cursor')!;
    expect(cursor.marker.enforcement).toBe('advisory');
    expect(cursor.marker.defaultTrustTier).toBe(1);
  });

  it('returns empty inventory with guidance when no markers found', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-empty-'));
    try {
      const inventory = await detect(tmp);

      expect(inventory.detected).toBe(false);
      expect(inventory.platforms.size).toBe(0);
      expect(inventory.guidance).toBeDefined();
      expect(inventory.guidance!.length).toBeGreaterThan(0);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects Claude Code from CLAUDE.md with full enforcement', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-claude-'));
    try {
      await writeFile(join(tmp, 'CLAUDE.md'), '# Project\nUse vitest.\n');

      const inventory = await detect(tmp);
      expect(inventory.detected).toBe(true);
      expect(inventory.platforms.has('claude-code')).toBe(true);

      const cc = inventory.platforms.get('claude-code')!;
      expect(cc.marker.enforcement).toBe('full');
      expect(cc.marker.defaultTrustTier).toBe(2);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('zero-config: synthesizes defaults when no claws.json exists', async () => {
    const root = resolve(FIXTURES, 'platform-cursor');
    const inventory = await detect(root);

    // platform-cursor fixture has no claws.json
    expect(inventory.zeroConfig).toBe(true);
    expect(inventory.detected).toBe(true);
  });

  it('zero-config false when claws.json exists', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-config-'));
    try {
      await writeFile(join(tmp, '.cursorrules'), 'rules here\n');
      await writeFile(join(tmp, 'claws.json'), '{"version": 1}\n');

      const inventory = await detect(tmp);
      expect(inventory.zeroConfig).toBe(false);
      expect(inventory.detected).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
