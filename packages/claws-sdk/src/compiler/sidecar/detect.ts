/**
 * Detection heuristics — infer workspace type from file markers.
 *
 * When no .claws sidecar file exists, this module scans the workspace
 * for platform-specific marker files and returns confidence-scored
 * DetectionHeuristic results.
 *
 * Split from FORMA per Architect M-02: detection is independent of
 * the format registry.
 *
 * @module claws-sdk/compiler/sidecar/detect
 */

import { access, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { DetectionHeuristic, SidecarPlatformTarget } from './types.js';

/**
 * A marker definition: which files to check, what platform they indicate.
 */
interface MarkerDef {
  readonly platform: SidecarPlatformTarget;
  readonly paths: readonly string[];
  readonly confidence: number;
}

/**
 * Known marker definitions for platform detection.
 *
 * Each entry maps file paths to a platform with a confidence score.
 * Multiple markers for the same platform increase confidence.
 */
const MARKER_DEFS: readonly MarkerDef[] = [
  // Claude Code: CLAUDE.md or .claude/ directory
  { platform: 'claude-code', paths: ['CLAUDE.md', '.claude/settings.json'], confidence: 1.0 },
  // Cursor: .cursorrules (legacy) or .cursor/ directory
  { platform: 'cursor', paths: ['.cursorrules', '.cursor'], confidence: 1.0 },
  // OpenClaw: SOUL.md (the OC governance file)
  { platform: 'openclaw', paths: ['SOUL.md'], confidence: 0.9 },
  // GitHub Copilot: .github/copilot-instructions.md
  { platform: 'copilot', paths: ['.github/copilot-instructions.md'], confidence: 1.0 },
];

/**
 * Check if a path exists (file or directory).
 */
async function pathExists(absPath: string): Promise<boolean> {
  try {
    await access(absPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a directory.
 */
async function isDirectory(absPath: string): Promise<boolean> {
  try {
    const s = await stat(absPath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Detect workspace platforms from file markers.
 *
 * Scans the workspace root for known platform marker files and
 * returns an array of DetectionHeuristic results sorted by
 * confidence (highest first).
 *
 * @param workspaceRoot - Absolute path to the workspace root directory
 * @returns Array of detection heuristics (may be empty)
 */
export async function detectWorkspacePlatforms(
  workspaceRoot: string,
): Promise<DetectionHeuristic[]> {
  const results: DetectionHeuristic[] = [];

  for (const def of MARKER_DEFS) {
    const signals: string[] = [];

    for (const relPath of def.paths) {
      const absPath = join(workspaceRoot, relPath);
      // Check directory first (e.g. ".cursor" directory), then file
      if (await isDirectory(absPath)) {
        signals.push(relPath + '/');
      } else if (await pathExists(absPath)) {
        signals.push(relPath);
      }
    }

    if (signals.length > 0) {
      results.push({
        platform: def.platform,
        confidence: def.confidence,
        signals,
      });
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}
