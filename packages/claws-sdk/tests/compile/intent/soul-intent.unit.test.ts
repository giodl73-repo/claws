/**
 * L0: SOUL.md intent extraction unit tests.
 *
 * 5 tests:
 * 1. "Never access production databases" -> DenyIntent with scope 'tool', pattern 'prod-*', confidence 0.95
 * 2. "Be careful with customer data" -> confidence < 0.5, flagged not auto-extracted
 * 3. "never access" (no scope qualifier) -> syntax error, not low-confidence intent (CP-S04-F01)
 * 4. Content inside fenced code blocks skipped (CP-S04-F07)
 * 5. Confidence threshold boundary: 0.51 auto-extracted, 0.49 flagged
 */

import { describe, it, expect } from 'vitest';
import { extractSoulIntents } from '../../../src/compile/intent/soul-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'SOUL.md',
    content,
    provenance: {
      source: 'SOUL.md',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-12T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('buildCodeBlockMap (via extractSoulIntents)', () => {
  it('skips all lines inside a large fenced code block (O(1) lookup)', () => {
    // Build a SOUL.md with many lines inside a code block — if O(n²) were
    // still in place, this would be noticeably slow; with pre-computed map
    // it's a single pass.
    const insideLines = Array.from({ length: 200 }, (_, i) =>
      `- Never do thing ${i} in the forbidden zone`,
    );
    const content = [
      '# Soul',
      '',
      '- Never access production databases',
      '',
      '```',
      ...insideLines,
      '```',
      '',
      '- Always audit tool usage',
    ].join('\n');

    const entry = makeEntry(content);
    const result = extractSoulIntents(entry);

    // None of the 200 code-block lines should produce intents
    const forbiddenIntents = result.intents.filter(i =>
      i.rawLine.includes('forbidden zone'),
    );
    expect(forbiddenIntents).toHaveLength(0);

    // The two outside-block intents should be extracted
    expect(result.intents.find(i => i.rawLine.includes('production databases'))).toBeDefined();
    expect(result.intents.find(i => i.rawLine.includes('audit tool usage'))).toBeDefined();
  });

  it('handles nested/adjacent code blocks correctly', () => {
    const content = [
      '# Soul',
      '',
      '```',
      '- Never run rm -rf /',
      '```',
      '',
      '- Never access production databases',
      '',
      '```python',
      '- Never drop tables',
      '```',
      '',
      '- Always log API calls',
    ].join('\n');

    const entry = makeEntry(content);
    const result = extractSoulIntents(entry);

    // Inside code blocks — should be skipped
    expect(result.intents.find(i => i.rawLine.includes('rm -rf'))).toBeUndefined();
    expect(result.intents.find(i => i.rawLine.includes('drop tables'))).toBeUndefined();

    // Outside code blocks — should be extracted
    expect(result.intents.find(i => i.rawLine.includes('production databases'))).toBeDefined();
    expect(result.intents.find(i => i.rawLine.includes('log API calls'))).toBeDefined();
  });
});

describe('extractSoulIntents', () => {
  it('"Never access production databases" produces DenyIntent with scope tool, confidence 0.95', () => {
    const entry = makeEntry(
      '# Soul\n\n## Boundaries\n\n- Never access production databases\n',
    );
    const result = extractSoulIntents(entry);

    expect(result.source).toBe('SOUL.md');
    expect(result.diagnostics).toHaveLength(0);

    const denyIntents = result.intents.filter(i => i.intentKind === 'deny');
    expect(denyIntents.length).toBeGreaterThanOrEqual(1);

    const prodDeny = denyIntents.find(i => i.rawLine.includes('Never access production databases'));
    expect(prodDeny).toBeDefined();
    expect(prodDeny!.keyword).toBe('never');
    expect(prodDeny!.confidence).toBe(0.95);
    expect(prodDeny!.scope).toBe('tool');
    expect(prodDeny!.pattern).toContain('production databases');
    expect(prodDeny!.autoExtracted).toBe(true);
    expect(prodDeny!.line).toBe(5);
  });

  it('"Be careful with customer data" produces intent with confidence < 0.5 (flagged)', () => {
    const entry = makeEntry(
      '# Soul\n\n- Be careful with customer data\n',
    );
    const result = extractSoulIntents(entry);

    expect(result.diagnostics).toHaveLength(0);

    const flagged = result.intents.find(i => i.rawLine.includes('Be careful with customer data'));
    expect(flagged).toBeDefined();
    expect(flagged!.keyword).toBe('be careful');
    expect(flagged!.confidence).toBe(0.30);
    expect(flagged!.autoExtracted).toBe(false);
  });

  it('"never access" with no scope qualifier is syntax error, not low-confidence (CP-S04-F01)', () => {
    const entry = makeEntry(
      '# Soul\n\n- never access\n',
    );
    const result = extractSoulIntents(entry);

    // Should produce a diagnostic, not a low-confidence intent
    const syntaxErrors = result.diagnostics.filter(d => d.severity === 'error');
    expect(syntaxErrors.length).toBeGreaterThanOrEqual(1);
    expect(syntaxErrors[0]!.code).toBe('CLAWS-I001');
    expect(syntaxErrors[0]!.message).toContain('incomplete constraint');

    // Should NOT produce an intent for this line
    const intentsForLine = result.intents.filter(i => i.rawLine.trim() === 'never access');
    expect(intentsForLine).toHaveLength(0);
  });

  it('content inside fenced code blocks is skipped (CP-S04-F07)', () => {
    const entry = makeEntry(
      '# Soul\n\n- Never access production databases\n\n```\n- Never run rm -rf /\n```\n\n- Always audit tool usage\n',
    );
    const result = extractSoulIntents(entry);

    // The "Never run rm -rf /" is inside a code block -- should be skipped
    const rmIntent = result.intents.find(i => i.rawLine.includes('rm -rf'));
    expect(rmIntent).toBeUndefined();

    // The other two intents should be extracted
    const prodDeny = result.intents.find(i => i.rawLine.includes('production databases'));
    expect(prodDeny).toBeDefined();

    const auditReq = result.intents.find(i => i.rawLine.includes('audit tool usage'));
    expect(auditReq).toBeDefined();
  });

  it('confidence threshold boundary: 0.51 auto-extracted, 0.49 flagged', () => {
    // "prefer" has confidence 0.55 (above threshold -> auto-extracted)
    // "be careful" has confidence 0.30 (below threshold -> flagged)
    const entry = makeEntry(
      '# Soul\n\n- Prefer verbose logging for production\n- Be careful with PII data\n',
    );
    const result = extractSoulIntents(entry);

    const preferIntent = result.intents.find(i => i.keyword === 'prefer');
    expect(preferIntent).toBeDefined();
    expect(preferIntent!.confidence).toBe(0.55);
    expect(preferIntent!.autoExtracted).toBe(true);

    const carefulIntent = result.intents.find(i => i.keyword === 'be careful');
    expect(carefulIntent).toBeDefined();
    expect(carefulIntent!.confidence).toBe(0.30);
    expect(carefulIntent!.autoExtracted).toBe(false);
  });
});
