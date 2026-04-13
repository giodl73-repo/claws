/**
 * L0: TOOLS.md intent extraction unit tests.
 *
 * 2 tests:
 * 1. TOOLS.md with R5 tool (production write access) classified as R5
 * 2. TOOLS.md tool with OBO flag detected
 */

import { describe, it, expect } from 'vitest';
import { extractToolsIntents } from '../../../src/compile/intent/tools-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'TOOLS.md',
    content,
    provenance: {
      source: 'TOOLS.md',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-12T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractToolsIntents', () => {
  it('R5 tool (production write access) classified as R5', () => {
    const entry = makeEntry(
      '# Tool Guidance\n\n## DatabaseWrite\n\nProduction write access to the main database.\nAll writes require dual approval.\n',
    );
    const result = extractToolsIntents(entry);

    expect(result.source).toBe('TOOLS.md');

    const dbTool = result.intents.find(i => i.name === 'DatabaseWrite');
    expect(dbTool).toBeDefined();
    expect(dbTool!.riskClass).toBe(5);
    expect(dbTool!.capabilities).toContain('write');
  });

  it('tool with OBO flag detected', () => {
    const entry = makeEntry(
      '# Tool Guidance\n\n## SendEmail\n\nSend email on behalf of the user.\nRequires user approval before sending.\n',
    );
    const result = extractToolsIntents(entry);

    const emailTool = result.intents.find(i => i.name === 'SendEmail');
    expect(emailTool).toBeDefined();
    expect(emailTool!.oboFlag).toBe(true);
    expect(emailTool!.riskClass).toBeGreaterThanOrEqual(3);
  });
});
