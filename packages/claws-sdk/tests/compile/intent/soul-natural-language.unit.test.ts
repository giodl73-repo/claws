/**
 * L0: SOUL.md natural language keyword extraction unit tests.
 *
 * Tests natural language deny constraints per CL-09 format tolerance:
 * "don't let", "always check with me before", "under no circumstances",
 * "do not", "make sure", "don't ever", "not allowed to",
 * "check with me before".
 *
 * 4 tests:
 * 1. Natural language deny patterns ("don't let", "do not", "under no circumstances")
 * 2. Natural language elicit/require patterns ("check with me before", "make sure")
 * 3. "don't ever" and "not allowed to" produce deny intents
 * 4. "check with me before" (without "always" prefix) produces elicit intent
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
      readAt: '2026-04-13T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractSoulIntents — natural language keywords', () => {
  it('extracts deny intents from natural language patterns', () => {
    const entry = makeEntry(
      "# Soul\n\n## Boundaries\n\n" +
      "- Don't let anyone access the production database without approval\n" +
      "- Under no circumstances should you delete user data\n" +
      "- Do not share credentials or tokens with external services\n",
    );
    const result = extractSoulIntents(entry);

    expect(result.diagnostics).toHaveLength(0);

    // "don't let" -> deny
    const dontLet = result.intents.find(i => i.keyword === "don't let");
    expect(dontLet).toBeDefined();
    expect(dontLet!.intentKind).toBe('deny');
    expect(dontLet!.confidence).toBe(0.90);
    expect(dontLet!.autoExtracted).toBe(true);

    // "under no circumstances" -> deny
    const underNo = result.intents.find(i => i.keyword === 'under no circumstances');
    expect(underNo).toBeDefined();
    expect(underNo!.intentKind).toBe('deny');
    expect(underNo!.confidence).toBe(0.95);

    // "do not" -> deny
    const doNot = result.intents.find(i => i.keyword === 'do not');
    expect(doNot).toBeDefined();
    expect(doNot!.intentKind).toBe('deny');
    expect(doNot!.confidence).toBe(0.90);
  });

  it('extracts elicit/require intents from natural language patterns', () => {
    const entry = makeEntry(
      "# Soul\n\n## Boundaries\n\n" +
      "- Always check with me before deploying to staging\n" +
      "- Make sure all API calls are logged\n",
    );
    const result = extractSoulIntents(entry);

    expect(result.diagnostics).toHaveLength(0);

    // "always check with me before" -> elicit (longest match should win over "always")
    const checkBefore = result.intents.find(i => i.keyword === 'always check with me before');
    expect(checkBefore).toBeDefined();
    expect(checkBefore!.intentKind).toBe('elicit');
    expect(checkBefore!.confidence).toBe(0.85);

    // "make sure" -> require
    const makeSure = result.intents.find(i => i.keyword === 'make sure');
    expect(makeSure).toBeDefined();
    expect(makeSure!.intentKind).toBe('require');
    expect(makeSure!.confidence).toBe(0.70);
  });

  it('"don\'t ever" and "not allowed to" produce deny intents', () => {
    const entry = makeEntry(
      "# Soul\n\n## Boundaries\n\n" +
      "- Don't ever execute rm -rf on production servers\n" +
      "- The agent is not allowed to impersonate other users in the system\n",
    );
    const result = extractSoulIntents(entry);

    expect(result.diagnostics).toHaveLength(0);

    // "don't ever" -> deny, confidence 0.95
    const dontEver = result.intents.find(i => i.keyword === "don't ever");
    expect(dontEver).toBeDefined();
    expect(dontEver!.intentKind).toBe('deny');
    expect(dontEver!.confidence).toBe(0.95);
    expect(dontEver!.autoExtracted).toBe(true);

    // "not allowed to" -> deny, confidence 0.90
    const notAllowed = result.intents.find(i => i.keyword === 'not allowed to');
    expect(notAllowed).toBeDefined();
    expect(notAllowed!.intentKind).toBe('deny');
    expect(notAllowed!.confidence).toBe(0.90);
  });

  it('"check with me before" (without "always") produces elicit intent', () => {
    const entry = makeEntry(
      "# Soul\n\n## Boundaries\n\n" +
      "- Please check with me before running any database migrations\n",
    );
    const result = extractSoulIntents(entry);

    expect(result.diagnostics).toHaveLength(0);

    const checkWith = result.intents.find(i => i.keyword === 'check with me before');
    expect(checkWith).toBeDefined();
    expect(checkWith!.intentKind).toBe('elicit');
    expect(checkWith!.confidence).toBe(0.80);
  });

  it('does not match keywords embedded inside larger words', () => {
    const entry = makeEntry(
      "# Soul\n\n## Boundaries\n\n" +
      "- We should consider alternatives for the approval process\n" +
      "- This is unavoidable complexity in the codebase\n",
    );
    const result = extractSoulIntents(entry);

    // "consider" should match (word boundary ok)
    const considerIntent = result.intents.find(i => i.keyword === 'consider');
    expect(considerIntent).toBeDefined();

    // "avoid" should NOT match inside "unavoidable" (word boundary check)
    const avoidIntent = result.intents.find(i => i.keyword === 'avoid');
    expect(avoidIntent).toBeUndefined();
  });

  it('extracts "should not" and "avoid" as deny intents', () => {
    const entry = makeEntry(
      "# Soul\n\n## Boundaries\n\n" +
      "- You should not access customer data without authorization\n" +
      "- Avoid running long-running queries on the production database\n",
    );
    const result = extractSoulIntents(entry);

    expect(result.diagnostics).toHaveLength(0);

    const shouldNot = result.intents.find(i => i.keyword === 'should not');
    expect(shouldNot).toBeDefined();
    expect(shouldNot!.intentKind).toBe('deny');
    expect(shouldNot!.confidence).toBe(0.70);

    const avoidIntent = result.intents.find(i => i.keyword === 'avoid');
    expect(avoidIntent).toBeDefined();
    expect(avoidIntent!.intentKind).toBe('deny');
    expect(avoidIntent!.confidence).toBe(0.60);
  });
});
