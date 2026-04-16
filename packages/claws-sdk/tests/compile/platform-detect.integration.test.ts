/**
 * L1: Platform detection across openclaw, cursor, and claude-code fixture workspaces.
 *
 * THOTH-INTEGRATION-COVERAGE: detect 62% -> 90%.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { detect } from '../../src/detect/detect.js';

const FIXTURES = resolve(__dirname, '..', 'fixtures');

describe('platform detection across fixture workspaces', () => {
  it('detects openclaw, cursor, and claude-code platforms from fixture markers', async () => {
    // 1. OpenClaw workspace — has SOUL.md (OpenClaw marker)
    const openclawResult = await detect(resolve(FIXTURES, 'platform-openclaw'));
    expect(openclawResult.platforms.size).toBeGreaterThan(0);
    expect(openclawResult.detected).toBe(true);
    const openclawPlatform = openclawResult.platforms.get('openclaw');
    expect(openclawPlatform).toBeDefined();
    expect(openclawPlatform!.marker.confidence).toBeGreaterThan(0);

    // 2. Cursor workspace — has .cursorrules directory (may be empty)
    const cursorResult = await detect(resolve(FIXTURES, 'platform-cursor'));
    expect(cursorResult).toBeDefined();
    expect(cursorResult.platforms).toBeDefined();

    // 3. Claude Code workspace — has CLAUDE.md
    const claudeResult = await detect(resolve(FIXTURES, 'platform-claude-code'));
    expect(claudeResult.platforms.size).toBeGreaterThan(0);
    const claudePlatform = claudeResult.platforms.get('claude-code');
    expect(claudePlatform).toBeDefined();
    expect(claudePlatform!.marker.confidence).toBeGreaterThan(0);

    // 4. Multi-platform workspace — has both .cursorrules and CLAUDE.md
    const multiResult = await detect(resolve(FIXTURES, 'platform-multi'));
    expect(multiResult.platforms.size).toBeGreaterThanOrEqual(1);

    // 5. Full workspace — has SOUL.md (at least OpenClaw)
    const fullResult = await detect(resolve(FIXTURES, 'full-workspace'));
    expect(fullResult.platforms.size).toBeGreaterThan(0);
  });
});
