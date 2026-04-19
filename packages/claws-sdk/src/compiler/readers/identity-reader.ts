/**
 * IDENTITY.md reader — extracts identity config, SSO references, RBAC hints.
 *
 * @module claws-sdk/compiler/readers/identity-reader
 */

import { readWorkspaceFile, buildFailure } from './read-file.js';
import { extractH2Sections } from './markdown-utils.js';
import type {
  WorkspaceReader,
  WorkspaceReadResult,
  IdentityData,
  WorkspaceDiagnostic,
} from './types.js';

const FILE_PATH = 'IDENTITY.md';

function findSectionBody(sections: { heading: string; body: string }[], heading: string): string {
  const section = sections.find(s => s.heading.toLowerCase() === heading.toLowerCase());
  return section?.body ?? '';
}

function parseIdentity(content: string): { data: IdentityData; diagnostics: WorkspaceDiagnostic[] } {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const sections = extractH2Sections(content);

  const organization = findSectionBody(sections, 'Organization');
  const team = findSectionBody(sections, 'Team');
  const trustLevel = findSectionBody(sections, 'Trust Level');

  if (!organization) {
    diagnostics.push({
      severity: 'warning',
      message: 'IDENTITY.md missing "Organization" section',
      file: FILE_PATH,
      code: 'IDENTITY-NO-ORG',
    });
  }

  return {
    data: { organization, team, trustLevel, sections },
    diagnostics,
  };
}

export const identityReader: WorkspaceReader<IdentityData> = {
  filePath: FILE_PATH,
  required: false,

  async read(workspaceRoot: string): Promise<WorkspaceReadResult<IdentityData>> {
    const file = await readWorkspaceFile(workspaceRoot, FILE_PATH);
    if (!file) {
      return buildFailure(FILE_PATH, false, 'IDENTITY.md not found — defaults to L0 identity');
    }
    const { data, diagnostics } = parseIdentity(file.normalizedContent);
    return { ok: true, file, data, diagnostics };
  },
};
