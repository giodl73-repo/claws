/**
 * HEARTBEAT.md reader — extracts health signals, lifecycle schedules, status.
 *
 * @module claws-sdk/compiler/readers/heartbeat-reader
 */

import { readWorkspaceFile, buildFailure } from './read-file.js';
import { extractH2Sections, extractListItems } from './markdown-utils.js';
import type {
  WorkspaceReader,
  WorkspaceReadResult,
  HeartbeatData,
  WorkspaceDiagnostic,
} from './types.js';

const FILE_PATH = 'HEARTBEAT.md';

function parseHeartbeat(content: string): { data: HeartbeatData; diagnostics: WorkspaceDiagnostic[] } {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const sections = extractH2Sections(content);

  const schedules = sections.map(section => ({
    trigger: section.heading,
    actions: extractListItems(section.body),
    line: section.line,
  }));

  return { data: { schedules }, diagnostics };
}

export const heartbeatReader: WorkspaceReader<HeartbeatData> = {
  filePath: FILE_PATH,
  required: false,

  async read(workspaceRoot: string): Promise<WorkspaceReadResult<HeartbeatData>> {
    const file = await readWorkspaceFile(workspaceRoot, FILE_PATH);
    if (!file) {
      return buildFailure(FILE_PATH, false, 'HEARTBEAT.md not found — no lifecycle hooks defined');
    }
    const { data, diagnostics } = parseHeartbeat(file.normalizedContent);
    return { ok: true, file, data, diagnostics };
  },
};
