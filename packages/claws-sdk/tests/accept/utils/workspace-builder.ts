/**
 * Workspace builder — copies 00+workspace/ from a scenario directory
 * to a temp directory for isolated test execution.
 *
 * If 00+workspace/ doesn't exist, returns null (skip the scenario).
 * No generative materialization from problem: text — workspace must
 * exist on disk.
 *
 * @module claws-sdk/tests/accept/utils/workspace-builder
 */

import { existsSync, readFileSync, readdirSync, mkdtempSync, cpSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Result of building a workspace fixture.
 */
export interface WorkspaceResult {
  /** Absolute path to the temp workspace directory. */
  workspacePath: string;
  /** Map of relative file paths → file contents. */
  files: Map<string, string>;
  /** Cleanup function — removes the temp directory. */
  cleanup: () => void;
}

export interface BuildWorkspaceOptions {
  /**
   * Override the subdirectory name within the scenario dir.
   * Default: '00+workspace'
   * Use '.' to treat the scenario dir itself as the workspace.
   */
  fixtureSubdir?: string;
}

/**
 * Read all files recursively under a directory into a Map<relativePath, content>.
 */
function readDirRecursive(dir: string, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  if (!existsSync(dir)) return result;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [k, v] of readDirRecursive(fullPath, relPath)) {
        result.set(k, v);
      }
    } else if (entry.isFile()) {
      try {
        result.set(relPath, readFileSync(fullPath, 'utf-8'));
      } catch {
        // Skip binary or unreadable files
      }
    }
  }
  return result;
}

/**
 * Build a workspace fixture from a scenario directory.
 *
 * Copies 00+workspace/ to a temp directory for filesystem isolation.
 * Returns null if 00+workspace/ doesn't exist (scenario should be skipped).
 */
export function buildWorkspace(
  scenarioDir: string,
  options?: BuildWorkspaceOptions,
): WorkspaceResult | null {
  const subdir = options?.fixtureSubdir ?? '00+workspace';
  const sourceDir = subdir === '.'
    ? scenarioDir
    : join(scenarioDir, subdir);

  if (!existsSync(sourceDir)) {
    return null;
  }

  // Create temp directory
  const tempDir = mkdtempSync(join(tmpdir(), 'claws-accept-'));

  try {
    // Copy workspace to temp dir
    cpSync(sourceDir, tempDir, { recursive: true });
  } catch (e) {
    // Cleanup on failure
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    return null;
  }

  // Read all files for inspection
  const files = readDirRecursive(tempDir);

  return {
    workspacePath: tempDir,
    files,
    cleanup: () => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
    },
  };
}
