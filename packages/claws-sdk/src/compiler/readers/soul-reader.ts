/**
 * SOUL.md reader — extracts persona, principles, voice, boundaries.
 *
 * Tolerant of missing sections: produces a warning, not an error.
 *
 * @module claws-sdk/compiler/readers/soul-reader
 */

import { readWorkspaceFile, buildFailure } from './read-file.js';
import { extractH2Sections, extractPreamble } from './markdown-utils.js';
import type {
  WorkspaceReader,
  WorkspaceReadResult,
  SoulData,
  WorkspaceDiagnostic,
} from './types.js';

const FILE_PATH = 'SOUL.md';

/**
 * Parse SOUL.md content into SoulData.
 */
function parseSoul(content: string): { data: SoulData; diagnostics: WorkspaceDiagnostic[] } {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const persona = extractPreamble(content);
  const sections = extractH2Sections(content);

  if (sections.length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'SOUL.md has no H2 sections — expected Purpose, Boundaries, etc.',
      file: FILE_PATH,
      code: 'SOUL-NO-SECTIONS',
    });
  }

  return { data: { persona, sections }, diagnostics };
}

export const soulReader: WorkspaceReader<SoulData> = {
  filePath: FILE_PATH,
  required: true,

  async read(workspaceRoot: string): Promise<WorkspaceReadResult<SoulData>> {
    const file = await readWorkspaceFile(workspaceRoot, FILE_PATH);
    if (!file) {
      return buildFailure(FILE_PATH, true, 'SOUL.md not found — agent has no persona or purpose declaration');
    }
    const { data, diagnostics } = parseSoul(file.normalizedContent);
    return { ok: true, file, data, diagnostics };
  },
};
