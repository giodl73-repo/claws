/**
 * USER.md reader — extracts user preferences, environment, platform.
 *
 * @module claws-sdk/compiler/readers/user-reader
 */

import { readWorkspaceFile, buildFailure } from './read-file.js';
import { extractH2Sections, extractListItems } from './markdown-utils.js';
import type {
  WorkspaceReader,
  WorkspaceReadResult,
  UserData,
  WorkspaceDiagnostic,
} from './types.js';

const FILE_PATH = 'USER.md';

function findSectionBody(sections: { heading: string; body: string }[], heading: string): string {
  const section = sections.find(s => s.heading.toLowerCase() === heading.toLowerCase());
  return section?.body ?? '';
}

function parseUser(content: string): { data: UserData; diagnostics: WorkspaceDiagnostic[] } {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const sections = extractH2Sections(content);

  const role = findSectionBody(sections, 'Role');
  const prefsBody = findSectionBody(sections, 'Preferences');
  const preferences = extractListItems(prefsBody);

  return {
    data: { role, preferences, sections },
    diagnostics,
  };
}

export const userReader: WorkspaceReader<UserData> = {
  filePath: FILE_PATH,
  required: false,

  async read(workspaceRoot: string): Promise<WorkspaceReadResult<UserData>> {
    const file = await readWorkspaceFile(workspaceRoot, FILE_PATH);
    if (!file) {
      return buildFailure(FILE_PATH, false, 'USER.md not found — no user profile defined');
    }
    const { data, diagnostics } = parseUser(file.normalizedContent);
    return { ok: true, file, data, diagnostics };
  },
};
