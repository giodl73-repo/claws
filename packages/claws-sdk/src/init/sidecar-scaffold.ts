/**
 * Sidecar scaffolding — create the .claws/ directory with all 13
 * subdirectories as defined in CLAWS_SIDECAR_LAYOUT, plus the
 * inner .gitignore for sensitive directories.
 *
 * This is the single authoritative scaffold function (merged from
 * the former types/sidecar.ts initSidecar). types/sidecar.ts is
 * now pure types and constants with no I/O.
 *
 * @module claws-sdk/init/sidecar-scaffold
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CLAWS_SIDECAR_LAYOUT, CLAWS_GITIGNORE_DIRS } from '../types/sidecar.js';

/**
 * Scaffold the .claws/ sidecar directory structure.
 *
 * Creates all 13 subdirectories defined in CLAWS_SIDECAR_LAYOUT and
 * writes a .claws/.gitignore protecting sensitive directories (keys,
 * secrets, cache, runtime). Safe to call multiple times (idempotent).
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns List of created directory paths (relative to workspace root)
 */
export async function scaffoldSidecar(workspaceRoot: string): Promise<readonly string[]> {
  const dirs = Object.values(CLAWS_SIDECAR_LAYOUT);
  await Promise.all(
    dirs.map((dir) => mkdir(join(workspaceRoot, dir), { recursive: true })),
  );

  // Write .gitignore for sensitive/cache directories inside .claws/
  const gitignoreLines = CLAWS_GITIGNORE_DIRS.map((d) => {
    // Strip the .claws/ prefix since .gitignore lives inside .claws/
    const relative = d.replace(/^\.claws\//, '');
    return `${relative}/`;
  });
  const gitignorePath = join(workspaceRoot, '.claws', '.gitignore');
  await writeFile(gitignorePath, gitignoreLines.join('\n') + '\n', 'utf-8');

  return dirs;
}
