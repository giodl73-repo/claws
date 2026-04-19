/**
 * Shared cache-directory resolver.
 *
 * Both the CLI and the compile path import `resolveCacheDir()` so the cache
 * location is a single source of truth. A second resolver would make `claws
 * cache stats` read from one place while the compile path writes to another,
 * producing false-empty stats after a populated compile.
 *
 * @module claws-sdk/compiler/cache/resolve
 */

import { join } from 'node:path';

/**
 * Cache directory layout, relative to `workspaceRoot`.
 *
 * The compile path and all `claws cache` subcommands funnel through this
 * function so a workspace has exactly one `.claws/cache/compile/` directory.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @returns Absolute path to the compilation cache directory.
 */
export function resolveCacheDir(workspaceRoot: string): string {
  return join(workspaceRoot, '.claws', 'cache', 'compile');
}
