/**
 * MEMORY.md reader — extracts memory entries, retention policies, index structure.
 *
 * @module claws-sdk/compiler/readers/memory-reader
 */

import { readWorkspaceFile, buildFailure } from './read-file.js';
import { extractH2Sections } from './markdown-utils.js';
import type {
  WorkspaceReader,
  WorkspaceReadResult,
  MemoryData,
  WorkspaceDiagnostic,
} from './types.js';

const FILE_PATH = 'MEMORY.md';

function parseMemory(content: string): { data: MemoryData; diagnostics: WorkspaceDiagnostic[] } {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const sections = extractH2Sections(content);

  const entries = sections.map(section => ({
    title: section.heading,
    body: section.body,
    line: section.line,
  }));

  return { data: { entries }, diagnostics };
}

export const memoryReader: WorkspaceReader<MemoryData> = {
  filePath: FILE_PATH,
  required: false,

  async read(workspaceRoot: string): Promise<WorkspaceReadResult<MemoryData>> {
    const file = await readWorkspaceFile(workspaceRoot, FILE_PATH);
    if (!file) {
      return buildFailure(FILE_PATH, false, 'MEMORY.md not found — no durable memory defined');
    }
    const { data, diagnostics } = parseMemory(file.normalizedContent);
    return { ok: true, file, data, diagnostics };
  },
};
