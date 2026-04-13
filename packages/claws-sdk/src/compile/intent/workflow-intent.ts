/**
 * lobster.yaml intent extraction — DAG extraction from workflow definitions.
 *
 * Extracts workflow name, steps, and dependencies from YAML workflow
 * definitions. Produces a WorkflowIntent with ordered steps and
 * dependency edges.
 *
 * @module claws-sdk/compile/intent/workflow-intent
 */

import type {
  FileEntryPresent,
  WorkflowIntent,
  WorkflowStep,
  IntentResult,
  ParseDiagnostic,
} from '../types.js';

/**
 * Extract workflow intents from a lobster.yaml file entry.
 *
 * Uses line-based YAML parsing (no external YAML library dependency)
 * to extract workflow name, description, and steps.
 */
export function extractWorkflowIntents(entry: FileEntryPresent): IntentResult<WorkflowIntent> {
  const diagnostics: ParseDiagnostic[] = [];
  const lines = entry.content.split('\n');

  let workflowName = '';
  let workflowDescription = '';
  const steps: WorkflowStep[] = [];
  const dependencies: Record<string, readonly string[]> = {};

  let inSteps = false;
  let currentStepName = '';
  let currentStepCommand = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Top-level name:
    const nameMatch = /^name:\s*(\S[^\n]*)$/.exec(trimmed);
    if (nameMatch && !inSteps) {
      workflowName = nameMatch[1]!.trim();
      continue;
    }

    // Top-level description:
    const descMatch = /^description:\s*(\S[^\n]*)$/.exec(trimmed);
    if (descMatch && !inSteps) {
      workflowDescription = descMatch[1]!.trim();
      continue;
    }

    // Steps section
    if (trimmed === 'steps:') {
      inSteps = true;
      continue;
    }

    if (inSteps) {
      // New step item (starts with "- name:")
      const stepNameMatch = /^-\s+name:\s*(\S[^\n]*)$/.exec(trimmed);
      if (stepNameMatch) {
        // Flush previous step
        if (currentStepName.length > 0) {
          steps.push({ name: currentStepName, command: currentStepCommand });
        }
        currentStepName = stepNameMatch[1]!.trim();
        currentStepCommand = '';
        continue;
      }

      // Step command
      const cmdMatch = /^command:\s*(\S[^\n]*)$/.exec(trimmed);
      if (cmdMatch) {
        currentStepCommand = cmdMatch[1]!.trim();
        continue;
      }

      // Step depends_on
      const depsMatch = /^depends_on:\s*\[([^\]]+)]$/.exec(trimmed);
      if (depsMatch && currentStepName.length > 0) {
        dependencies[currentStepName] = depsMatch[1]!.split(',').map(d => d.trim()).filter(d => d.length > 0);
      }
    }
  }

  // Flush last step
  if (currentStepName.length > 0) {
    steps.push({ name: currentStepName, command: currentStepCommand });
  }

  if (workflowName.length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'lobster.yaml has no workflow name',
      file: entry.source,
      line: 1,
      column: 1,
      code: 'CLAWS-I010',
    });
  }

  const intents: WorkflowIntent[] = [];
  if (workflowName.length > 0 || steps.length > 0) {
    intents.push({
      name: workflowName,
      description: workflowDescription,
      steps,
      dependencies,
    });
  }

  return {
    source: entry.source,
    intents,
    diagnostics,
  };
}
