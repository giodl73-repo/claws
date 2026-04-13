/**
 * LangGraph platform marker detection.
 *
 * Detects langgraph.json in the workspace root. Distinguishes
 * JS vs Python variants by inspecting the file content.
 * LangGraph uses full enforcement via guards and defaults to T2.
 *
 * @module claws-sdk/detect/markers/langgraph
 */

import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarkerResult } from '../types.js';

/**
 * Detect LangGraph from langgraph.json.
 *
 * Returns the marker result with a note about the detected variant
 * (JS or Python) if determinable from file content.
 */
export async function detectLangGraph(root: string): Promise<MarkerResult | null> {
  const markerPath = join(root, 'langgraph.json');

  try {
    await access(markerPath);
  } catch {
    return null;
  }

  // Read content to determine JS vs Python variant
  let variant: string | undefined;
  try {
    const content = await readFile(markerPath, 'utf-8');
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (typeof parsed['language'] === 'string') {
      variant = parsed['language'] === 'python' ? 'Python' : 'JS';
    }
  } catch {
    // Parse failure is fine — still a valid marker file
  }

  return {
    platform: 'langgraph',
    confidence: 1.0,
    enforcement: 'full',
    defaultTrustTier: 2,
    markerFiles: [markerPath],
    ...(variant !== undefined ? { variant } : {}),
  };
}

/**
 * Get the detected variant note for LangGraph.
 * Exposed separately so detect() can attach it to PlatformInfo.notes.
 *
 * Accepts optional pre-read content to avoid a redundant file read
 * when the caller has already read the marker file.
 */
export async function getLangGraphVariant(root: string, content?: string): Promise<string | undefined> {
  let raw = content;
  if (raw === undefined) {
    const markerPath = join(root, 'langgraph.json');
    try {
      raw = await readFile(markerPath, 'utf-8');
    } catch {
      return undefined;
    }
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed['language'] === 'string') {
      return parsed['language'] === 'python' ? 'Python variant' : 'JS variant';
    }
  } catch {
    // ignore
  }
  return undefined;
}
