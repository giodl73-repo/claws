/**
 * TOOLS.md reader — extracts tool declarations, trust annotations, usage constraints.
 *
 * @module claws-sdk/compiler/readers/tools-reader
 */

import { readWorkspaceFile, buildFailure } from './read-file.js';
import { extractH2Sections } from './markdown-utils.js';
import type {
  WorkspaceReader,
  WorkspaceReadResult,
  ToolsData,
  WorkspaceDiagnostic,
} from './types.js';

const FILE_PATH = 'TOOLS.md';

function parseTools(content: string): { data: ToolsData; diagnostics: WorkspaceDiagnostic[] } {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const sections = extractH2Sections(content);

  const tools = sections.map(section => ({
    name: section.heading,
    description: section.body,
    line: section.line,
  }));

  if (tools.length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'TOOLS.md has no tool declarations (expected H2 sections)',
      file: FILE_PATH,
      code: 'TOOLS-NO-DECLARATIONS',
    });
  }

  return { data: { tools }, diagnostics };
}

export const toolsReader: WorkspaceReader<ToolsData> = {
  filePath: FILE_PATH,
  required: true,

  async read(workspaceRoot: string): Promise<WorkspaceReadResult<ToolsData>> {
    const file = await readWorkspaceFile(workspaceRoot, FILE_PATH);
    if (!file) {
      return buildFailure(FILE_PATH, true, 'TOOLS.md not found — no tool guidance defined');
    }
    const { data, diagnostics } = parseTools(file.normalizedContent);
    return { ok: true, file, data, diagnostics };
  },
};
