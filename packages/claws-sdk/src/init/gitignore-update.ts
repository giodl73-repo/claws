/**
 * Gitignore update — append all sensitive .claws/ directories to
 * the workspace .gitignore if not already present.
 *
 * Derives the list from CLAWS_GITIGNORE_DIRS (authoritative source).
 *
 * @module claws-sdk/init/gitignore-update
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CLAWS_GITIGNORE_DIRS } from '../types/sidecar.js';

/**
 * Entries that must be present in .gitignore after init.
 * Derived from the authoritative CLAWS_GITIGNORE_DIRS constant.
 */
const REQUIRED_GITIGNORE_ENTRIES: readonly string[] = CLAWS_GITIGNORE_DIRS.map(
  (dir) => (dir.endsWith('/') ? dir : `${dir}/`),
);

/**
 * Ensure all sensitive .claws/ directories are in the workspace .gitignore.
 *
 * Reads the existing .gitignore (if any), checks for each required entry,
 * and appends missing entries. Creates .gitignore if it doesn't exist.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns List of entries that were added (empty if all already present)
 */
export async function updateGitignore(workspaceRoot: string): Promise<readonly string[]> {
  const gitignorePath = join(workspaceRoot, '.gitignore');

  let existing = '';
  try {
    existing = await readFile(gitignorePath, 'utf-8');
  } catch {
    // .gitignore doesn't exist yet — will create it
  }

  const lines = existing.split('\n');
  const added: string[] = [];

  for (const entry of REQUIRED_GITIGNORE_ENTRIES) {
    // Check if the entry already exists (exact line match, trimmed)
    const found = lines.some((line) => line.trim() === entry);
    if (!found) {
      added.push(entry);
    }
  }

  if (added.length === 0) {
    return [];
  }

  // Append missing entries with a blank line separator if file has content
  const needsNewline = existing.length > 0 && !existing.endsWith('\n');
  const needsSeparator = existing.length > 0;
  const suffix =
    (needsNewline ? '\n' : '') +
    (needsSeparator ? '\n' : '') +
    '# claws governance (sensitive)\n' +
    added.join('\n') +
    '\n';

  await writeFile(gitignorePath, existing + suffix, 'utf-8');
  return added;
}
