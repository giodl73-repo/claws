/**
 * AWS Bedrock platform marker detection.
 *
 * Detects bedrock-guardrails.json or .bedrock/guardrails.json
 * in the workspace root. Bedrock uses explicit-only enforcement
 * and defaults to trust tier T3.
 *
 * @module claws-sdk/detect/markers/bedrock
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarkerResult } from '../types.js';

const MARKER_FILES = [
  'bedrock-guardrails.json',
  '.bedrock/guardrails.json',
] as const;

/**
 * Detect AWS Bedrock from guardrail config files.
 */
export async function detectBedrock(root: string): Promise<MarkerResult | null> {
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
    platform: 'bedrock',
    confidence: 1.0,
    enforcement: 'explicit-only',
    defaultTrustTier: 3,
    markerFiles: found,
  };
}
