/**
 * .claws FORMA sidecar layout definition.
 *
 * The .claws sidecar is the governance-focused counterpart to .craft.
 * It stores compiled governance artifacts, policies, audit trails,
 * compliance records, and fleet management data.
 *
 * Config file: claws.json (NOT craft.json).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * All 13 subdirectories in the .claws sidecar layout.
 */
export type ClawsSidecarDir =
  | 'compiled'
  | 'staging'
  | 'keys'
  | 'audit'
  | 'cache'
  | 'policies'
  | 'secrets'
  | 'config'
  | 'snapshots'
  | 'runtime'
  | 'fleet'
  | 'compliance'
  | 'supply';

/**
 * Complete .claws sidecar layout map.
 *
 * Each key is a logical directory name; each value is the relative path
 * within the .claws sidecar root. All paths use forward slashes.
 */
export const CLAWS_SIDECAR_LAYOUT: Record<ClawsSidecarDir, string> = {
  compiled: '.claws/compiled',
  staging: '.claws/staging',
  keys: '.claws/keys',
  audit: '.claws/audit',
  cache: '.claws/cache',
  policies: '.claws/policies',
  secrets: '.claws/secrets',
  config: '.claws/config',
  snapshots: '.claws/snapshots',
  runtime: '.claws/runtime',
  fleet: '.claws/fleet',
  compliance: '.claws/compliance',
  supply: '.claws/supply',
};

/**
 * The config file name — lives at workspace root, NOT inside .claws/.
 * The .claws/ directory is for compiler output, cache, and audit artifacts.
 * This is claws.json, NOT craft.json.
 */
export const CLAWS_CONFIG_FILE = 'claws.json';

/**
 * Sidecar layout version. Bump when directories are added or renamed.
 */
export const CLAWS_SIDECAR_VERSION = 1;

/**
 * Directories that should be listed in .gitignore (contain secrets or caches).
 */
export const CLAWS_GITIGNORE_DIRS: readonly string[] = [
  '.claws/keys',
  '.claws/secrets',
  '.claws/cache',
  '.claws/runtime',
];

/**
 * Initialize the .claws sidecar directory structure.
 *
 * Creates all 13 subdirectories under `${root}/.claws/` using
 * recursive mkdir. Safe to call multiple times (idempotent).
 *
 * @param root - Workspace root directory (absolute path).
 */
export async function initSidecar(root: string): Promise<void> {
  const dirs = Object.values(CLAWS_SIDECAR_LAYOUT);
  await Promise.all(
    dirs.map((dir) => mkdir(join(root, dir), { recursive: true })),
  );

  // Write .gitignore for sensitive/cache directories
  const gitignoreLines = CLAWS_GITIGNORE_DIRS.map((d) => {
    // Strip the .claws/ prefix since .gitignore lives inside .claws/
    const relative = d.replace(/^\.claws\//, '');
    return `${relative}/`;
  });
  const gitignorePath = join(root, '.claws', '.gitignore');
  await writeFile(gitignorePath, gitignoreLines.join('\n') + '\n', 'utf-8');
}
