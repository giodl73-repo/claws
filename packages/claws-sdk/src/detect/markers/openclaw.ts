/**
 * OpenClaw platform marker detection.
 *
 * Detects SOUL.md with structural validation: the file must contain
 * governance keywords (never, always, must not, tool declarations,
 * trust tier references) to be recognized as OpenClaw. A SOUL.md
 * used as a mission statement ("Our company soul is excellence")
 * will NOT trigger detection.
 *
 * @module claws-sdk/detect/markers/openclaw
 */

import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarkerResult } from '../types.js';
import { GOVERNANCE_PATTERNS, MIN_GOVERNANCE_HITS } from '../governance-patterns.js';

/**
 * Detect OpenClaw governance from SOUL.md in the workspace root.
 *
 * Returns null if SOUL.md is absent or if it does not contain
 * sufficient governance keywords (false positive prevention).
 */
export async function detectOpenClaw(root: string): Promise<MarkerResult | null> {
  const soulPath = join(root, 'SOUL.md');

  try {
    await access(soulPath);
  } catch {
    return null;
  }

  let content: string;
  try {
    content = await readFile(soulPath, 'utf-8');
  } catch {
    return null;
  }
  const hits = GOVERNANCE_PATTERNS.filter((p) => p.test(content)).length;

  if (hits < MIN_GOVERNANCE_HITS) {
    return null;
  }

  // Confidence scales with governance keyword density
  const confidence = Math.min(1.0, 0.6 + hits * 0.1);

  return {
    platform: 'openclaw',
    confidence,
    enforcement: 'full',
    defaultTrustTier: 'from-config',
    markerFiles: [soulPath],
  };
}
