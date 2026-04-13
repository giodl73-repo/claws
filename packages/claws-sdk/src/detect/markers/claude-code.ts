/**
 * Claude Code platform marker detection.
 *
 * Detects CLAUDE.md and/or .claude/settings.json (dual-surface).
 * Claude Code uses full enforcement and defaults to trust tier T2.
 *
 * @module claws-sdk/detect/markers/claude-code
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarkerResult } from '../types.js';

const MARKER_FILES = [
  'CLAUDE.md',
  '.claude/settings.json',
] as const;

/**
 * Detect Claude Code from CLAUDE.md or .claude/settings.json.
 */
export async function detectClaudeCode(root: string): Promise<MarkerResult | null> {
  const found: string[] = [];

  for (const rel of MARKER_FILES) {
    const abs = join(root, rel);
    try {
      await access(abs);
      found.push(abs);
    } catch {
      // not present
    }
  }

  if (found.length === 0) {
    return null;
  }

  return {
    platform: 'claude-code',
    confidence: 1.0,
    enforcement: 'full',
    defaultTrustTier: 2,
    markerFiles: found,
  };
}
