/**
 * Platform detection orchestrator.
 *
 * Scans a workspace root for marker files from 7 supported platforms,
 * dispatches to per-platform detectors, and aggregates results into
 * a PlatformInventory.
 *
 * @module claws-sdk/detect/detect
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { PlatformInventory, PlatformInfo, MarkerResult, PlatformId } from './types.js';
import { detectOpenClaw } from './markers/openclaw.js';
import { detectCursor } from './markers/cursor.js';
import { detectClaudeCode } from './markers/claude-code.js';
import { detectCopilot } from './markers/copilot.js';
import { detectBedrock } from './markers/bedrock.js';
import { detectLangGraph } from './markers/langgraph.js';
import { detectCrewAI } from './markers/crewai.js';
import { CLAWS_CONFIG_FILE } from '../types/sidecar.js';

/**
 * All per-platform detector functions, dispatched in parallel.
 */
const DETECTORS: ReadonlyArray<(root: string) => Promise<MarkerResult | null>> = [
  detectOpenClaw,
  detectCursor,
  detectClaudeCode,
  detectCopilot,
  detectBedrock,
  detectLangGraph,
  detectCrewAI,
];

/**
 * Scan a workspace root for platform marker files and return a
 * PlatformInventory describing all detected platforms.
 *
 * Detection runs BEFORE parsing — it determines which files to parse
 * and which supplementary configs to read.
 *
 * When no claws.json exists, zero-config mode synthesizes defaults
 * from detected platform markers.
 */
export async function detect(workspaceRoot: string): Promise<PlatformInventory> {
  // Run all detectors in parallel
  const results = await Promise.all(
    DETECTORS.map((fn) => fn(workspaceRoot)),
  );

  // Build platform map from non-null results
  const platforms = new Map<PlatformId, PlatformInfo>();
  for (const result of results) {
    if (result !== null) {
      // Derive variant note from MarkerResult.variant (e.g. "JS" → "JS variant")
      const notes = result.variant ? `${result.variant} variant` : undefined;
      const info: PlatformInfo = notes ? { marker: result, notes } : { marker: result };
      platforms.set(result.platform, info);
    }
  }

  // Check if claws.json exists (for zero-config detection)
  const configPath = join(workspaceRoot, CLAWS_CONFIG_FILE);
  let hasConfig = false;
  try {
    await access(configPath);
    hasConfig = true;
  } catch {
    // no config file
  }

  const detected = platforms.size > 0;

  const base = {
    platforms,
    detected,
    zeroConfig: detected && !hasConfig,
  };

  if (!detected) {
    return {
      ...base,
      guidance:
        'No platform marker files detected. Create a SOUL.md (OpenClaw), ' +
        'CLAUDE.md (Claude Code), .cursorrules (Cursor), or other platform ' +
        'config file to enable governance compilation. Run `claws init` to ' +
        'generate a starter configuration.',
    };
  }

  return base;
}
