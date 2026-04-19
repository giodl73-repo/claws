/**
 * AGENTS.md reader — extracts agent definitions, delegation rules, capability grants.
 *
 * @module claws-sdk/compiler/readers/agents-reader
 */

import { readWorkspaceFile, buildFailure } from './read-file.js';
import { extractH2Sections, findListValue, extractListItems } from './markdown-utils.js';
import type {
  WorkspaceReader,
  WorkspaceReadResult,
  AgentsData,
  AgentDefinition,
  WorkspaceDiagnostic,
} from './types.js';

const FILE_PATH = 'AGENTS.md';

function parseAgents(content: string): { data: AgentsData; diagnostics: WorkspaceDiagnostic[] } {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const sections = extractH2Sections(content);

  const agents: AgentDefinition[] = sections.map(section => {
    const description = findListValue(section.body, 'Description') ?? '';
    const toolsStr = findListValue(section.body, 'Tools') ?? '';
    const tools = toolsStr
      ? toolsStr.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    return {
      name: section.heading,
      description,
      tools,
      line: section.line,
    };
  });

  return { data: { agents }, diagnostics };
}

export const agentsReader: WorkspaceReader<AgentsData> = {
  filePath: FILE_PATH,
  required: false,

  async read(workspaceRoot: string): Promise<WorkspaceReadResult<AgentsData>> {
    const file = await readWorkspaceFile(workspaceRoot, FILE_PATH);
    if (!file) {
      return buildFailure(FILE_PATH, false, 'AGENTS.md not found — no agent delegation defined');
    }
    const { data, diagnostics } = parseAgents(file.normalizedContent);
    return { ok: true, file, data, diagnostics };
  },
};
