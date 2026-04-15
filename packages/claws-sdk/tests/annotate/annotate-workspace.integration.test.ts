/**
 * L1: Annotate on reference workspace — verify heuristic classifications
 * match expected risk levels for known skill types.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { analyzeHeuristics } from '../../src/annotate/heuristics.js';

const FIXTURES = resolve(__dirname, '../fixtures/oc-reference-workspace');

/**
 * Parse SKILL.md frontmatter for name, description, and tools.
 */
function parseSkillFm(content: string): { name: string; description: string } {
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  const descMatch = content.match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch?.[1]?.trim() ?? 'unknown',
    description: descMatch?.[1]?.trim() ?? '',
  };
}

describe('annotate on reference workspace', () => {
  it('classifies email-drafter skill as R4+ with OBO', async () => {
    const skillPath = join(FIXTURES, 'skills', 'email-drafter', 'SKILL.md');
    const content = await readFile(skillPath, 'utf-8');
    const { name, description } = parseSkillFm(content);

    const annotation = analyzeHeuristics(name, description, content);

    // email-drafter: sends email on behalf → R4+
    expect(annotation.riskClass).toBeGreaterThanOrEqual(4);
    // "on behalf of the user" → OBO
    expect(annotation.obo.detected).toBe(true);
    expect(annotation.riskConfidence).toBeGreaterThan(0.0);
  });

  it('classifies web-lookup skill as R1-R2', async () => {
    const skillPath = join(FIXTURES, 'skills', 'web-lookup', 'SKILL.md');
    let content: string;
    try {
      content = await readFile(skillPath, 'utf-8');
    } catch {
      // If SKILL.md not present, synthesize from name
      content = '';
    }
    const name = 'web-lookup';
    const description = content
      ? (content.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? 'Look up information on the web')
      : 'Look up information on the web';

    const annotation = analyzeHeuristics(name, description, content);

    // web-lookup: read-only search → R1-R2
    expect(annotation.riskClass).toBeLessThanOrEqual(2);
  });
});
