/**
 * L0: AGENTS.md format tolerance unit tests.
 *
 * Tests nested tool lists and comma-separated tool lists
 * per CL-09 format tolerance.
 *
 * 2 tests:
 * 1. Comma-separated tools on a single line
 * 2. Mixed: comma-separated delegation targets + nested tool lists
 */

import { describe, it, expect } from 'vitest';
import { extractAgentsIntents } from '../../../src/compile/intent/agents-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'AGENTS.md',
    content,
    provenance: {
      source: 'AGENTS.md',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-13T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractAgentsIntents — format tolerance', () => {
  it('parses comma-separated tools on a single line', () => {
    const entry = makeEntry(
      '# Agents\n\n' +
      '## Coder\n\n' +
      '- Tools: Read, Write, Bash, Grep, Glob\n' +
      '- Delegates to: Tester\n\n' +
      '## Tester\n\n' +
      '- Tools: Bash, Read\n',
    );
    const result = extractAgentsIntents(entry);

    expect(result.intents).toHaveLength(1);
    const edge = result.intents[0]!;
    expect(edge.from).toBe('Coder');
    expect(edge.to).toBe('Tester');
    // Target (Tester) has comma-separated tools
    expect(edge.tools).toEqual(['Bash', 'Read']);
  });

  it('handles comma-separated delegation targets with nested tool lists', () => {
    const entry = makeEntry(
      '# Agents\n\n' +
      '## Lead\n\n' +
      '- Tools: Read, Write\n' +
      '- Delegates to: Worker, Reviewer\n\n' +
      '## Worker\n\n' +
      '- tools:\n' +
      '  - Bash\n' +
      '  - Write\n' +
      '  - Read\n\n' +
      '## Reviewer\n\n' +
      '- tools:\n' +
      '  - Read\n' +
      '  - Grep\n',
    );
    const result = extractAgentsIntents(entry);

    // Lead delegates to both Worker and Reviewer
    expect(result.intents).toHaveLength(2);

    const toWorker = result.intents.find(i => i.to === 'Worker');
    expect(toWorker).toBeDefined();
    expect(toWorker!.from).toBe('Lead');
    expect(toWorker!.tools).toEqual(['Bash', 'Write', 'Read']);

    const toReviewer = result.intents.find(i => i.to === 'Reviewer');
    expect(toReviewer).toBeDefined();
    expect(toReviewer!.from).toBe('Lead');
    expect(toReviewer!.tools).toEqual(['Read', 'Grep']);
  });
});
