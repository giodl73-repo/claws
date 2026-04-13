/**
 * USER.md intent extraction — OBO scope and authority bounds.
 *
 * Extracts user role and authority bounds from USER.md content.
 *
 * @module claws-sdk/compile/intent/user-intent
 */

import type {
  FileEntryPresent,
  AuthorityIntent,
  IntentResult,
} from '../types.js';

/**
 * Extract authority intents from a USER.md file entry.
 *
 * Parses role from "## Role" section and bounds from "## Preferences" or
 * "## Permissions" sections.
 */
export function extractUserIntents(entry: FileEntryPresent): IntentResult<AuthorityIntent> {
  const lines = entry.content.split('\n');
  const intents: AuthorityIntent[] = [];

  let currentSection = '';
  let role = '';
  const bounds: string[] = [];
  let roleLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    const h2Match = /^##\s+(\S[^\n]*)$/.exec(trimmed);
    if (h2Match) {
      currentSection = h2Match[1]!.trim().toLowerCase();
      continue;
    }

    if (trimmed.length === 0) continue;

    if (currentSection === 'role' && !trimmed.startsWith('#')) {
      role = trimmed;
      roleLine = i + 1;
      continue;
    }

    if ((currentSection === 'preferences' || currentSection === 'permissions' || currentSection === 'authority') &&
        /^[-*+]\s/.test(trimmed)) {
      bounds.push(trimmed.replace(/^[-*+]\s+/, ''));
    }
  }

  if (role.length > 0) {
    intents.push({
      role,
      bounds,
      line: roleLine,
    });
  }

  return {
    source: entry.source,
    intents,
    diagnostics: [],
  };
}
