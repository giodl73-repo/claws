/**
 * Shared file reading utility for workspace readers.
 *
 * Reads a file from disk, normalizes content, and returns a WorkspaceFile
 * or a failure result. All readers delegate to this for I/O.
 *
 * @module claws-sdk/compiler/readers/read-file
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizeFileContent } from './normalize.js';
import type { WorkspaceFile, WorkspaceReadFailure, WorkspaceDiagnostic } from './types.js';

/**
 * Read a single file from a workspace root and normalize its content.
 *
 * @param workspaceRoot - Absolute path to the workspace root
 * @param relativePath - Path relative to workspace root
 * @returns The workspace file, or null if the file does not exist
 */
export async function readWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<WorkspaceFile | null> {
  const fullPath = join(workspaceRoot, relativePath);
  try {
    const rawContent = await readFile(fullPath, 'utf-8');
    const normalizedContent = normalizeFileContent(rawContent);
    // Normalize path separators to forward slashes
    const normalizedPath = relativePath.replace(/\\/g, '/');
    return { path: normalizedPath, rawContent, normalizedContent };
  } catch {
    return null;
  }
}

/**
 * Build a failure result for a missing file.
 */
export function buildFailure(
  relativePath: string,
  required: boolean,
  description: string,
): WorkspaceReadFailure {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const severity = required ? 'error' : 'warning';
  const diagnostic: WorkspaceDiagnostic = {
    severity,
    message: description,
    file: normalizedPath,
    code: required ? 'WORKSPACE-MISSING-REQUIRED' : 'WORKSPACE-MISSING-OPTIONAL',
  };
  return {
    ok: false,
    path: normalizedPath,
    diagnostics: [diagnostic],
  };
}
