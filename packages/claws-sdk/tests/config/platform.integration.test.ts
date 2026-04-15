/**
 * L1: platform detect on 3 fixture directories returns correct platforms.
 *
 * Reuses existing detect module — validates that platform detection works
 * correctly on the pre-existing fixture workspaces.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { detect } from '../../src/detect/detect.js';

const FIXTURES = resolve(__dirname, '../fixtures');

describe('platform detection — fixture integration', () => {
  it('detects correct platforms across 3 fixture directories', async () => {
    // 1. OpenClaw workspace
    const ocInventory = await detect(resolve(FIXTURES, 'platform-openclaw'));
    expect(ocInventory.detected).toBe(true);
    expect(ocInventory.platforms.has('openclaw')).toBe(true);

    // 2. Cursor workspace
    const cursorInventory = await detect(resolve(FIXTURES, 'platform-cursor'));
    expect(cursorInventory.detected).toBe(true);
    expect(cursorInventory.platforms.has('cursor')).toBe(true);

    // 3. Multi-platform workspace (Claude Code + Cursor + Copilot)
    const multiInventory = await detect(resolve(FIXTURES, 'platform-multi'));
    expect(multiInventory.detected).toBe(true);
    expect(multiInventory.platforms.size).toBeGreaterThanOrEqual(2);
    expect(multiInventory.platforms.has('claude-code')).toBe(true);
    expect(multiInventory.platforms.has('cursor')).toBe(true);
  });
});
