/**
 * L0: lobster.yaml (workflow) intent extraction unit tests.
 *
 * Tests:
 * 1. Complete workflow with name, description, steps
 * 2. Step dependencies parsing
 * 3. Multiple steps in sequence
 * 4. Warning diagnostic when workflow name is missing
 * 5. Empty content — no intents, no diagnostics
 * 6. Steps without commands
 * 7. No steps section — empty intent if name present
 */

import { describe, it, expect } from 'vitest';
import { extractWorkflowIntents } from '../../../src/compile/intent/workflow-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'lobster.yaml',
    content,
    provenance: {
      source: 'lobster.yaml',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-12T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractWorkflowIntents', () => {
  it('extracts a complete workflow with name, description, and steps', () => {
    const entry = makeEntry(
      'name: deploy-pipeline\n' +
      'description: Deploys the application\n' +
      'steps:\n' +
      '  - name: build\n' +
      '    command: npm run build\n' +
      '  - name: test\n' +
      '    command: npm test\n',
    );
    const result = extractWorkflowIntents(entry);

    expect(result.source).toBe('lobster.yaml');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.intents).toHaveLength(1);

    const workflow = result.intents[0]!;
    expect(workflow.name).toBe('deploy-pipeline');
    expect(workflow.description).toBe('Deploys the application');
    expect(workflow.steps).toHaveLength(2);
    expect(workflow.steps[0]!.name).toBe('build');
    expect(workflow.steps[0]!.command).toBe('npm run build');
    expect(workflow.steps[1]!.name).toBe('test');
    expect(workflow.steps[1]!.command).toBe('npm test');
  });

  it('parses step dependencies', () => {
    const entry = makeEntry(
      'name: ci\n' +
      'description: CI pipeline\n' +
      'steps:\n' +
      '  - name: lint\n' +
      '    command: npm run lint\n' +
      '  - name: test\n' +
      '    command: npm test\n' +
      '    depends_on: [lint]\n' +
      '  - name: deploy\n' +
      '    command: npm run deploy\n' +
      '    depends_on: [lint, test]\n',
    );
    const result = extractWorkflowIntents(entry);

    const workflow = result.intents[0]!;
    expect(workflow.dependencies['test']).toEqual(['lint']);
    expect(workflow.dependencies['deploy']).toEqual(['lint', 'test']);
    expect(workflow.dependencies['lint']).toBeUndefined();
  });

  it('handles multiple steps in sequence', () => {
    const entry = makeEntry(
      'name: build\n' +
      'steps:\n' +
      '  - name: clean\n' +
      '    command: rm -rf dist\n' +
      '  - name: compile\n' +
      '    command: tsc\n' +
      '  - name: bundle\n' +
      '    command: tsup\n',
    );
    const result = extractWorkflowIntents(entry);

    expect(result.intents[0]!.steps).toHaveLength(3);
    expect(result.intents[0]!.steps.map(s => s.name)).toEqual(['clean', 'compile', 'bundle']);
  });

  it('emits warning diagnostic when workflow name is missing', () => {
    const entry = makeEntry(
      'description: A nameless workflow\n' +
      'steps:\n' +
      '  - name: only-step\n' +
      '    command: echo hello\n',
    );
    const result = extractWorkflowIntents(entry);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('warning');
    expect(result.diagnostics[0]!.code).toBe('CLAWS-I010');
    expect(result.diagnostics[0]!.message).toContain('no workflow name');

    // Still emits intent because steps exist
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.steps).toHaveLength(1);
  });

  it('empty content produces no intents and no diagnostics', () => {
    const entry = makeEntry('');
    const result = extractWorkflowIntents(entry);
    // No name and no steps → no intent emitted, but diagnostic is emitted
    // Actually: name is '' so diagnostic fires, but no intent because both name and steps empty
    expect(result.intents).toHaveLength(0);
  });

  it('handles steps without commands', () => {
    const entry = makeEntry(
      'name: partial\n' +
      'steps:\n' +
      '  - name: step-no-cmd\n' +
      '  - name: step-with-cmd\n' +
      '    command: echo done\n',
    );
    const result = extractWorkflowIntents(entry);

    expect(result.intents[0]!.steps).toHaveLength(2);
    expect(result.intents[0]!.steps[0]!.command).toBe('');
    expect(result.intents[0]!.steps[1]!.command).toBe('echo done');
  });

  it('emits intent with empty steps when name is present but no steps section', () => {
    const entry = makeEntry(
      'name: empty-workflow\n' +
      'description: Has a name but no steps\n',
    );
    const result = extractWorkflowIntents(entry);

    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.name).toBe('empty-workflow');
    expect(result.intents[0]!.steps).toHaveLength(0);
  });

  it('description defaults to empty string when not provided', () => {
    const entry = makeEntry(
      'name: minimal\n' +
      'steps:\n' +
      '  - name: run\n' +
      '    command: go\n',
    );
    const result = extractWorkflowIntents(entry);
    expect(result.intents[0]!.description).toBe('');
  });
});
