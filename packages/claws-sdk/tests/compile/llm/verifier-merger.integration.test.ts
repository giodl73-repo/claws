/**
 * L1: Verifier + merger integration tests with mock LLM against reference workspace.
 *
 * 2 integration tests covering:
 * 1. Full verify→merge pipeline produces correct merged output with proper
 *    extraction methods, risk raise-only invariant, and confidence adjustments
 * 2. Pipeline handles edge cases: all intents dropped by verifier, empty files
 */

import { describe, it, expect } from 'vitest';
import { verifyExtractionResult } from '../../../src/compile/llm/verifier.js';
import { mergeIntents } from '../../../src/compile/llm/merger.js';
import type { ExtractionResult, LLMIntent } from '../../../src/compile/llm/types.js';
import type { RegexIntent } from '../../../src/compile/llm/merger.js';

// ── Reference Workspace Content ───────────────────────────────────────

const soulContent = [
  '# Soul',                                       // line 1
  '',                                              // line 2
  'Never use Bash to execute shell commands.',     // line 3
  '',                                              // line 4
  'Always prefer Read over cat for file access.',  // line 5
  'Require approval before production deploys.',   // line 6
  '',                                              // line 7
  'Be careful with Write operations.',             // line 8
].join('\n');

const toolsContent = [
  '# Tools',                                       // line 1
  '',                                              // line 2
  '## Bash',                                       // line 3
  'R5 — shell execution. Production write access.', // line 4
  '',                                              // line 5
  '## Read',                                       // line 6
  'R1 — file read. Computation only.',             // line 7
  '',                                              // line 8
  '## Write',                                      // line 9
  'R2 — file write. Filesystem access.',           // line 10
].join('\n');

// ── Tests ─────────────────────────────────────────────────────────────

describe('Verify→Merge pipeline integration', () => {
  it('full pipeline: verify LLM intents, merge with regex, correct output', () => {
    // Simulate regex-extracted intents from keyword pipeline
    const regexSoulIntents: RegexIntent[] = [
      {
        kind: 'deny',
        target: 'Bash',
        description: 'Never use Bash',
        confidence: 0.95,
        line: 3,
        sourceText: 'Never use Bash to execute shell commands.',
        riskClass: 5,
      },
      {
        kind: 'require',
        target: 'Read',
        description: 'Always prefer Read',
        confidence: 0.90,
        line: 5,
        sourceText: 'Always prefer Read over cat for file access.',
      },
    ];

    const regexToolIntents: RegexIntent[] = [
      {
        kind: 'label',
        target: 'Bash',
        description: 'R5 shell',
        confidence: 0.99,
        line: 4,
        sourceText: 'R5 — shell execution.',
        riskClass: 5,
        explicit: true, // Explicit annotation from TOOLS.md
      },
    ];

    // Simulate LLM extraction results (some good, some hallucinated)
    const llmSoulResult: ExtractionResult = {
      source: 'SOUL.md',
      intents: [
        // Exact match — should pass verification
        {
          kind: 'deny',
          target: 'Bash',
          description: 'LLM: No shell commands',
          confidence: 0.92,
          line: 3,
          sourceText: 'Never use Bash to execute shell commands.',
        },
        // Fuzzy match — case differs
        {
          kind: 'require',
          target: 'Read',
          description: 'LLM: Use Read tool',
          confidence: 0.88,
          line: 5,
          sourceText: 'always prefer read over cat',
        },
        // LLM gap-fill — new intent not in regex (exact match)
        {
          kind: 'limit',
          target: 'Write',
          description: 'LLM: Careful with writes',
          confidence: 0.70,
          line: 8,
          sourceText: 'Be careful with Write operations.',
        },
        // Hallucinated — text doesn't exist at reported line
        {
          kind: 'deny',
          target: 'Database',
          description: 'LLM: No database access',
          confidence: 0.85,
          line: 4,
          sourceText: 'Never access production databases directly.',
        },
      ],
      modelId: 'mock-v1',
    };

    const llmToolsResult: ExtractionResult = {
      source: 'TOOLS.md',
      intents: [
        // Exact match on TOOLS.md
        {
          kind: 'label',
          target: 'Bash',
          description: 'LLM: Bash is R5',
          confidence: 0.95,
          line: 4,
          sourceText: 'R5 — shell execution.',
        },
      ],
      modelId: 'mock-v1',
    };

    // Step 1: Verify LLM intents against source content
    const soulVerification = verifyExtractionResult(llmSoulResult, soulContent);
    const toolsVerification = verifyExtractionResult(llmToolsResult, toolsContent);

    // SOUL.md: 1 exact, 1 fuzzy, 1 exact (gap-fill), 1 mismatch
    expect(soulVerification.exactCount).toBe(2);
    expect(soulVerification.fuzzyCount).toBe(1);
    expect(soulVerification.mismatchCount).toBe(1);
    expect(soulVerification.passedIntents).toHaveLength(3);

    // TOOLS.md: 1 exact
    expect(toolsVerification.exactCount).toBe(1);
    expect(toolsVerification.passedIntents).toHaveLength(1);

    // Step 2: Merge verified LLM intents with regex intents
    const soulMerge = mergeIntents(
      'SOUL.md',
      regexSoulIntents,
      soulVerification.passedIntents,
    );

    const toolsMerge = mergeIntents(
      'TOOLS.md',
      regexToolIntents,
      toolsVerification.passedIntents,
    );

    // SOUL.md merge: deny|Bash (overlap), require|Read (overlap), limit|Write (LLM gap-fill)
    expect(soulMerge.intents).toHaveLength(3);
    expect(soulMerge.overlapCount).toBe(2);
    expect(soulMerge.llmOnlyCount).toBe(1);
    expect(soulMerge.regexOnlyCount).toBe(0);

    // Check deny|Bash — overlap, risk stays at 5 (raise-only)
    const bashDeny = soulMerge.intents.find((i) => i.target === 'Bash');
    expect(bashDeny).toBeDefined();
    expect(bashDeny!.extractionMethod).toBe('llm+regex');
    expect(bashDeny!.riskClass).toBe(5);
    expect(bashDeny!.confidence).toBe(0.95); // max(0.92, 0.95)

    // Check require|Read — overlap, fuzzy LLM intent (confidence halved to 0.44)
    const readReq = soulMerge.intents.find((i) => i.target === 'Read');
    expect(readReq).toBeDefined();
    expect(readReq!.extractionMethod).toBe('llm+regex');
    // Confidence = max(fuzzy 0.44, regex 0.90) = 0.90
    expect(readReq!.confidence).toBe(0.90);

    // Check limit|Write — LLM gap-fill
    const writeLimit = soulMerge.intents.find((i) => i.target === 'Write');
    expect(writeLimit).toBeDefined();
    expect(writeLimit!.extractionMethod).toBe('llm');
    expect(writeLimit!.confidence).toBe(0.70);

    // TOOLS.md merge: explicit annotation wins description
    expect(toolsMerge.intents).toHaveLength(1);
    const bashTool = toolsMerge.intents[0]!;
    expect(bashTool.extractionMethod).toBe('llm+regex');
    expect(bashTool.description).toBe('R5 shell'); // Explicit keeps its description
    expect(bashTool.riskClass).toBe(5);

    // Database intent was hallucinated and should NOT appear anywhere
    const dbIntent = soulMerge.intents.find((i) => i.target === 'Database');
    expect(dbIntent).toBeUndefined();
  });

  it('edge case: all LLM intents dropped by verifier, merge falls back to regex-only', () => {
    // Regex baseline
    const regexIntents: RegexIntent[] = [
      {
        kind: 'deny',
        target: 'Bash',
        description: 'No Bash',
        confidence: 0.95,
        line: 3,
        sourceText: 'Never use Bash.',
        riskClass: 5,
      },
    ];

    // All LLM intents are hallucinated
    const llmResult: ExtractionResult = {
      source: 'SOUL.md',
      intents: [
        {
          kind: 'deny',
          target: 'SSH',
          description: 'No SSH',
          confidence: 0.90,
          line: 1,
          sourceText: 'Never use SSH tunnels.',
        },
        {
          kind: 'require',
          target: 'VPN',
          description: 'Require VPN',
          confidence: 0.80,
          line: 99, // way out of range
          sourceText: 'Always use VPN.',
        },
      ],
      modelId: 'mock-v1',
    };

    // Verify against a minimal file
    const content = '# Soul\n\nNever use Bash.\n';
    const verification = verifyExtractionResult(llmResult, content);

    // All LLM intents should fail verification
    expect(verification.passedIntents).toHaveLength(0);
    expect(verification.mismatchCount).toBe(2);
    expect(verification.diagnostics).toHaveLength(2);

    // Merge with empty verified set — only regex survives
    const merge = mergeIntents('SOUL.md', regexIntents, verification.passedIntents);

    expect(merge.intents).toHaveLength(1);
    expect(merge.regexOnlyCount).toBe(1);
    expect(merge.llmOnlyCount).toBe(0);
    expect(merge.overlapCount).toBe(0);
    expect(merge.intents[0]!.extractionMethod).toBe('regex');
    expect(merge.intents[0]!.target).toBe('Bash');

    // Also test empty file content
    const emptyVerification = verifyExtractionResult(
      { source: 'EMPTY.md', intents: [], modelId: 'mock-v1' },
      '',
    );
    expect(emptyVerification.passedIntents).toHaveLength(0);
    expect(emptyVerification.diagnostics).toHaveLength(0);

    const emptyMerge = mergeIntents('EMPTY.md', [], emptyVerification.passedIntents);
    expect(emptyMerge.intents).toHaveLength(0);
  });
});
