/**
 * Workspace platform detection — detect the development platform
 * (node, python, rust, go, dotnet, java) from marker files.
 *
 * This is distinct from the agent platform detection in `detect/` which
 * identifies agent platforms (openclaw, cursor, claude-code, etc.).
 * This module detects the _workspace_ language/runtime platform.
 *
 * @module claws-sdk/init/platform-detect
 */

import { access, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Supported workspace platforms — the language/runtime environment.
 */
export type WorkspacePlatform =
  | 'node'
  | 'python'
  | 'rust'
  | 'go'
  | 'dotnet'
  | 'java'
  | 'unknown';

/**
 * Marker file → workspace platform mapping.
 * Checked in priority order (first match wins).
 */
const WORKSPACE_MARKERS: ReadonlyArray<{ readonly file: string; readonly platform: WorkspacePlatform }> = [
  { file: 'package.json', platform: 'node' },
  { file: 'pyproject.toml', platform: 'python' },
  { file: 'setup.py', platform: 'python' },
  { file: 'requirements.txt', platform: 'python' },
  { file: 'Cargo.toml', platform: 'rust' },
  { file: 'go.mod', platform: 'go' },
  { file: 'go.sum', platform: 'go' },
  { file: '*.csproj', platform: 'dotnet' },
  { file: '*.sln', platform: 'dotnet' },
  { file: 'pom.xml', platform: 'java' },
  { file: 'build.gradle', platform: 'java' },
  { file: 'build.gradle.kts', platform: 'java' },
];

/**
 * Result of workspace platform detection.
 */
export interface WorkspacePlatformResult {
  /** Detected platform or 'unknown'. */
  readonly platform: WorkspacePlatform;
  /** The marker file that triggered detection (null if unknown). */
  readonly markerFile: string | null;
  /** Detection method description. */
  readonly method: string;
}

/**
 * Detect workspace platform by scanning for marker files.
 *
 * Checks each marker file in priority order. First match wins.
 * Returns 'unknown' if no marker files are found.
 *
 * @param workspaceRoot - Absolute path to workspace root
 */
export async function detectWorkspacePlatform(
  workspaceRoot: string,
): Promise<WorkspacePlatformResult> {
  for (const marker of WORKSPACE_MARKERS) {
    if (marker.file.includes('*')) {
      // Glob pattern: scan directory for matching files
      const ext = marker.file.replaceAll('*', '');
      try {
        const entries = await readdir(workspaceRoot);
        const match = entries.find((e) => e.endsWith(ext));
        if (match) {
          return {
            platform: marker.platform,
            markerFile: match,
            method: `auto-detect (${match})`,
          };
        }
      } catch {
        // Directory not readable, continue to next marker
      }
      continue;
    }

    try {
      await access(join(workspaceRoot, marker.file));
      return {
        platform: marker.platform,
        markerFile: marker.file,
        method: `auto-detect (${marker.file})`,
      };
    } catch {
      // File not found, continue to next marker
    }
  }

  return {
    platform: 'unknown',
    markerFile: null,
    method: 'default (no markers found)',
  };
}
