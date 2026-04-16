/**
 * Filesystem utilities shared across claws-sdk modules.
 *
 * @module claws-sdk/util/fs
 */

import { access } from 'node:fs/promises';

/**
 * Check if a path exists on disk.
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
