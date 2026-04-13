/**
 * L0: AGENTS.md intent extraction unit tests.
 *
 * 1 test:
 * 1. AGENTS.md with A->B->C delegation produces correct delegation graph
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
      readAt: '2026-04-12T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractAgentsIntents', () => {
  it('A->B->C delegation produces correct delegation graph', () => {
    const entry = makeEntry(
      '# Agents\n\n' +
      '## Coordinator\n\n' +
      '- Model: claude-sonnet-4-20250514\n' +
      '- Description: Coordinates work across sub-agents\n' +
      '- Tools: Read, Write, Bash\n' +
      '- Delegates to: Reviewer\n\n' +
      '## Reviewer\n\n' +
      '- Model: claude-haiku-4-5-20251001\n' +
      '- Description: Reviews code changes\n' +
      '- Tools: Read, Grep\n' +
      '- Delegates to: Reporter\n\n' +
      '## Reporter\n\n' +
      '- Model: claude-haiku-4-5-20251001\n' +
      '- Description: Generates reports\n' +
      '- Tools: Read, Write\n',
    );
    const result = extractAgentsIntents(entry);

    expect(result.source).toBe('AGENTS.md');
    expect(result.diagnostics).toHaveLength(0);

    // Should have 2 delegation edges: Coordinator->Reviewer, Reviewer->Reporter
    expect(result.intents).toHaveLength(2);

    const edge1 = result.intents.find(i => i.from === 'Coordinator' && i.to === 'Reviewer');
    expect(edge1).toBeDefined();
    expect(edge1!.tools).toContain('Read');

    const edge2 = result.intents.find(i => i.from === 'Reviewer' && i.to === 'Reporter');
    expect(edge2).toBeDefined();
    expect(edge2!.tools).toContain('Read');
  });
});
