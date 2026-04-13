/**
 * GitHub Copilot platform marker detection.
 *
 * Detects .github/copilot-instructions.md (nested path) and .copilot/
 * directory (forward-compat) in the workspace root.
 * Copilot uses advisory enforcement and defaults to trust tier T1.
 *
 * Forward-compat: .copilot/ directory is the anticipated next-gen location.
 * When both exist, .copilot/ is preferred (newer takes precedence).
 *
 * @module claws-sdk/detect/markers/copilot
 */

import { access, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarkerResult } from '../types.js';

/**
 * Detect GitHub Copilot from .github/copilot-instructions.md or .copilot/ directory.
 */
export async function detectCopilot(root: string): Promise<MarkerResult | null> {
  const found: string[] = [];

  // Check forward-compat .copilot/ directory first (preferred when both exist)
  const copilotDir = join(root, '.copilot');
  try {
    const s = await stat(copilotDir);
    if (s.isDirectory()) {
      found.push(copilotDir);
    }
  } catch {
    // not present
  }

  // Check legacy nested .github/copilot-instructions.md
  const legacyPath = join(root, '.github', 'copilot-instructions.md');
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
    platform: 'github-copilot',
    confidence: 1.0,
    enforcement: 'advisory',
    defaultTrustTier: 1,
    markerFiles: found,
  };
}
