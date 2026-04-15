/**
 * L1: OC format tolerance integration tests.
 *
 * Tests each parser (tools, soul, agents) against community workspace
 * examples from design/claws/examples/community/ to verify real-world
 * format diversity handling per CL-09.
 *
 * 3 tests:
 * 1. tools-intent against community TOOLS-table-format.md
 * 2. soul-intent against community SOUL-natural-language.md
 * 3. agents-intent against community AGENTS-comma-tools.md
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractToolsIntents } from '../../../src/compile/intent/tools-intent.js';
import { extractSoulIntents } from '../../../src/compile/intent/soul-intent.js';
import { extractAgentsIntents } from '../../../src/compile/intent/agents-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

const EXAMPLES_DIR = resolve(__dirname, '../../../../design/claws/examples/community');

function loadExample(filename: string, source: string): FileEntryPresent {
  const content = readFileSync(resolve(EXAMPLES_DIR, filename), 'utf-8');
  return {
    status: 'present',
    source,
    content,
    provenance: {
      source,
      sourceType: 'filesystem',
      contentHash: 'integration-test-hash',
      readAt: '2026-04-13T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('OC format tolerance — community workspace examples', () => {
  it('tools-intent extracts tools from community table-format TOOLS.md', () => {
    const entry = loadExample('TOOLS-table-format.md', 'TOOLS.md');
    const result = extractToolsIntents(entry);

    // Should extract all 5 tools from the table
    expect(result.intents.length).toBeGreaterThanOrEqual(5);
    expect(result.diagnostics).toHaveLength(0);

    const names = result.intents.map(i => i.name);
    expect(names).toContain('Bash');
    expect(names).toContain('Read');
    expect(names).toContain('Write');
    expect(names).toContain('DatabaseQuery');
    expect(names).toContain('SendSlack');

    // Verify risk classification from annotation
    const dbTool = result.intents.find(i => i.name === 'DatabaseQuery')!;
    expect(dbTool.riskClass).toBe(4);

    // Verify OBO detection from annotation
    const slackTool = result.intents.find(i => i.name === 'SendSlack')!;
    expect(slackTool.oboFlag).toBe(true);
  });

  it('soul-intent extracts intents from community natural-language SOUL.md', () => {
    const entry = loadExample('SOUL-natural-language.md', 'SOUL.md');
    const result = extractSoulIntents(entry);

    // Should extract multiple intents from natural language boundaries
    expect(result.intents.length).toBeGreaterThanOrEqual(5);

    // Verify deny intents from natural language
    const denyIntents = result.intents.filter(i => i.intentKind === 'deny');
    expect(denyIntents.length).toBeGreaterThanOrEqual(3);

    // "Don't let" should produce a deny
    const dontLet = result.intents.find(i => i.keyword === "don't let");
    expect(dontLet).toBeDefined();
    expect(dontLet!.intentKind).toBe('deny');

    // "Under no circumstances" should produce a deny
    const underNo = result.intents.find(i => i.keyword === 'under no circumstances');
    expect(underNo).toBeDefined();
    expect(underNo!.intentKind).toBe('deny');

    // "Never" should still work (formal keyword)
    const neverIntent = result.intents.find(i => i.keyword === 'never');
    expect(neverIntent).toBeDefined();
    expect(neverIntent!.intentKind).toBe('deny');
  });

  it('agents-intent extracts delegation graph from community comma-tools AGENTS.md', () => {
    const entry = loadExample('AGENTS-comma-tools.md', 'AGENTS.md');
    const result = extractAgentsIntents(entry);

    // Lead Developer delegates to Code Reviewer and Test Runner
    // Code Reviewer delegates to Test Runner
    expect(result.intents.length).toBeGreaterThanOrEqual(3);

    const leadToReviewer = result.intents.find(
      i => i.from === 'Lead Developer' && i.to === 'Code Reviewer',
    );
    expect(leadToReviewer).toBeDefined();

    const leadToRunner = result.intents.find(
      i => i.from === 'Lead Developer' && i.to === 'Test Runner',
    );
    expect(leadToRunner).toBeDefined();

    const reviewerToRunner = result.intents.find(
      i => i.from === 'Code Reviewer' && i.to === 'Test Runner',
    );
    expect(reviewerToRunner).toBeDefined();

    // Test Runner has nested tool list (Bash, Read)
    expect(reviewerToRunner!.tools).toContain('Bash');
    expect(reviewerToRunner!.tools).toContain('Read');
  });
});
