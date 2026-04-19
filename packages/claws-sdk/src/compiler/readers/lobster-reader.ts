/**
 * lobster.yaml reader — YAML parse, extract lobster configuration, validate required fields.
 *
 * Uses a lightweight YAML parser (no external dependencies) for the
 * simple structure of lobster.yaml.
 *
 * @module claws-sdk/compiler/readers/lobster-reader
 */

import { readWorkspaceFile, buildFailure } from './read-file.js';
import type {
  WorkspaceReader,
  WorkspaceReadResult,
  LobsterData,
  LobsterStep,
  WorkspaceDiagnostic,
} from './types.js';

const FILE_PATH = 'lobster.yaml';

/**
 * Minimal YAML parser for lobster.yaml structure.
 *
 * Handles: top-level scalars, step arrays, dependency maps.
 * Does NOT handle arbitrary YAML — just lobster.yaml's known schema.
 */
function parseLobsterYaml(content: string): {
  data: LobsterData | null;
  diagnostics: WorkspaceDiagnostic[];
} {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const lines = content.split('\n');

  let name = '';
  let description = '';
  const steps: LobsterStep[] = [];
  const dependencies: Record<string, string[]> = {};

  type ParseState = 'top' | 'steps' | 'step-item' | 'dependencies' | 'dep-item';
  let state: ParseState = 'top';
  let currentStepName = '';
  let currentStepCommand = '';
  let currentDepKey = '';

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // Indentation level
    const indent = line.length - line.trimStart().length;
    const key = trimmed.trim();

    if (indent === 0) {
      // Flush any in-progress step
      if (state === 'step-item' && currentStepName) {
        steps.push({ name: currentStepName, command: currentStepCommand });
        currentStepName = '';
        currentStepCommand = '';
      }

      if (key.startsWith('name:')) {
        name = key.slice(5).trim();
        state = 'top';
      } else if (key.startsWith('description:')) {
        description = key.slice(12).trim();
        state = 'top';
      } else if (key === 'steps:') {
        state = 'steps';
      } else if (key === 'dependencies:') {
        state = 'dependencies';
      }
    } else if (state === 'steps' || state === 'step-item') {
      if (key.startsWith('- name:')) {
        // Flush previous step
        if (currentStepName) {
          steps.push({ name: currentStepName, command: currentStepCommand });
        }
        currentStepName = key.slice(7).trim();
        currentStepCommand = '';
        state = 'step-item';
      } else if (state === 'step-item' && key.startsWith('command:')) {
        currentStepCommand = key.slice(8).trim();
      }
    } else if (state === 'dependencies' || state === 'dep-item') {
      if (!key.startsWith('- ') && key.endsWith(':')) {
        currentDepKey = key.slice(0, -1).trim();
        dependencies[currentDepKey] = [];
        state = 'dep-item';
      } else if (state === 'dep-item' && key.startsWith('- ')) {
        dependencies[currentDepKey]?.push(key.slice(2).trim());
      }
    }
  }

  // Flush last step
  if (currentStepName) {
    steps.push({ name: currentStepName, command: currentStepCommand });
  }

  // Validate required fields
  if (!name) {
    diagnostics.push({
      severity: 'error',
      message: 'lobster.yaml missing required "name" field',
      file: FILE_PATH,
      code: 'LOBSTER-MISSING-NAME',
    });
    return { data: null, diagnostics };
  }

  return {
    data: { name, description, steps, dependencies },
    diagnostics,
  };
}

export const lobsterReader: WorkspaceReader<LobsterData> = {
  filePath: FILE_PATH,
  required: false,

  async read(workspaceRoot: string): Promise<WorkspaceReadResult<LobsterData>> {
    const file = await readWorkspaceFile(workspaceRoot, FILE_PATH);
    if (!file) {
      return buildFailure(FILE_PATH, false, 'lobster.yaml not found — no workflow defined');
    }

    const { data, diagnostics } = parseLobsterYaml(file.normalizedContent);
    if (!data) {
      return {
        ok: false,
        path: FILE_PATH,
        diagnostics,
      };
    }

    return { ok: true, file, data, diagnostics };
  },
};
