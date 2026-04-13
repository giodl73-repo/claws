/**
 * L0: OpenClaw marker detection — structural validation of SOUL.md.
 *
 * OpenClaw detection requires governance keywords in SOUL.md content,
 * not just file presence. A SOUL.md used as a company mission statement
 * must NOT trigger a false positive.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { detectOpenClaw } from '../../../src/detect/markers/openclaw.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('detectOpenClaw', () => {
  it('detects governance SOUL.md as OpenClaw (true positive)', async () => {
    const root = resolve(FIXTURES, 'platform-openclaw');
    const result = await detectOpenClaw(root);

    expect(result).not.toBeNull();
    expect(result!.platform).toBe('openclaw');
    expect(result!.enforcement).toBe('full');
    expect(result!.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result!.defaultTrustTier).toBe('from-config');
    expect(result!.markerFiles).toHaveLength(1);
    expect(result!.markerFiles[0]).toContain('SOUL.md');
  });

  it('rejects non-governance SOUL.md (false positive prevention)', async () => {
    const root = resolve(FIXTURES, 'platform-false-positive');
    const result = await detectOpenClaw(root);

    expect(result).toBeNull();
  });
});
