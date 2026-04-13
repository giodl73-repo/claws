/**
 * CrewAI platform marker detection.
 *
 * Detects crewai.yaml, crew.yaml, or pyproject.toml (with crewai
 * dependency) in the workspace root. CrewAI uses full enforcement
 * via guards and defaults to trust tier T2.
 *
 * @module claws-sdk/detect/markers/crewai
 */

import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarkerResult } from '../types.js';

/**
 * Primary marker filenames in order of specificity.
 */
const PRIMARY_MARKERS = [
  'crewai.yaml',
  'crew.yaml',
] as const;

/**
 * Detect CrewAI from crewai.yaml, crew.yaml, or pyproject.toml.
 */
export async function detectCrewAI(root: string): Promise<MarkerResult | null> {
  // Check primary markers first
  for (const filename of PRIMARY_MARKERS) {
    const abs = join(root, filename);
    try {
      await access(abs);
      return {
        platform: 'crewai',
        confidence: 1.0,
        enforcement: 'full',
        defaultTrustTier: 2,
        markerFiles: [abs],
      };
    } catch {
      // try next
    }
  }

  // Fallback: check pyproject.toml for crewai dependency
  const pyprojectPath = join(root, 'pyproject.toml');
  try {
    await access(pyprojectPath);
    const content = await readFile(pyprojectPath, 'utf-8');
    if (/crewai/i.test(content)) {
      return {
        platform: 'crewai',
        confidence: 0.8,
        enforcement: 'full',
        defaultTrustTier: 2,
        markerFiles: [pyprojectPath],
      };
    }
  } catch {
    // not present
  }

  return null;
}
