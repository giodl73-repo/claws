/**
 * Cursor platform marker detection.
 *
 * Detects .cursorrules file (legacy) and .cursor/ directory (forward-compat)
 * in the workspace root. Cursor uses advisory enforcement and defaults
 * to trust tier T1.
 *
 * Forward-compat: .cursor/ directory is the new location. When both exist,
 * .cursor/ directory is preferred (newer takes precedence).
 *
 * @module claws-sdk/detect/markers/cursor
 */

import { access, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarkerResult } from '../types.js';

/**
 * Detect Cursor from .cursorrules or .cursor/ directory in the workspace root.
 */
export async function detectCursor(root: string): Promise<MarkerResult | null> {
  const found: string[] = [];

  // Check forward-compat .cursor/ directory first (preferred when both exist)
  const cursorDir = join(root, '.cursor');
  try {
    const s = await stat(cursorDir);
    if (s.isDirectory()) {
      found.push(cursorDir);
    }
  } catch {
    // not present
  }

  // Check legacy .cursorrules file
  const legacyPath = join(root, '.cursorrules');
  try {
    await access(legacyPath);
    found.push(legacyPath);
  } catch {
    // not present
  }

  if (found.length === 0) {
    return null;
  }

  return {
    platform: 'cursor',
    confidence: 1.0,
    enforcement: 'advisory',
    defaultTrustTier: 1,
    markerFiles: found,
  };
}
