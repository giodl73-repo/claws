/**
 * Shared filesystem utilities for claws CLI.
 *
 * @module claws-cli/core/fs
 */

import { access } from 'node:fs/promises';

/**
 * Check whether a file exists at the given path.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
