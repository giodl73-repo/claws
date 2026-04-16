/**
 * L0: ExtractorLLM unit tests for CI unit-project coverage.
 *
 * Tests the ExtractorLLM class, computeMerge, extractVerifyMerge,
 * and buildRegexIntentMap.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExtractorLLM, buildRegexIntentMap } from '../../../src/compile/llm/extractor.js';
import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
  LLMIntent,
  ExtractionHints,
  ExtractionOptions,
} from '../../../src/compile/llm/types.js';
import type {
  FileEntry,
  FileEntryPresent,
  FileEntryAbsent,
  ParseDiagnostic,
  GovernanceAST,
} from '../../../src/compile/types.js';

// ── Mock Provider ───────────────────────────────────────────────────────

class MockLLMProvider implements LLMProvider {
  readonly modelId = 'mock-unit-v1';
  extractCallCount = 0;
  validateCallCount = 0;

  async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
    this.extractCallCount++;
    return {
      source: request.source,
      intents: [
        {
          kind: 'deny',
          target: 'Bash',
          description: 'Block bash',
          confidence: 0.95,
          line: 1,
          sourceText: 'Never use Bash',
        },
      ],
      modelId: this.modelId,
    };
  }

  async validate(result: ExtractionResult): Promise<ParseDiagnostic[]> {
    this.validateCallCount++;
    return [];
  }
}

function presentEntry(source: string, content: string): FileEntryPresent {
  return {
    status: 'present',
    source,
    content,
    provenance: {
      source,
      sourceType: 'filesystem',
      contentHash: 'abc',
      readAt: '2026-04-13T00:00:00Z',
      rawSize: content.length,
    },
  };
}

function absentEntry(source: string): FileEntryAbsent {
  return { status: 'absent', source, defaultDescription: 'Missing file' };
}

// ── ExtractorLLM ──────────────────────────────────────────────────────

describe('ExtractorLLM', () => {
  describe('with null provider', () => {
    it('available is false', () => {
      const extractor = new ExtractorLLM(null);
      expect(extractor.available).toBe(false);
    });

    it('modelId is none', () => {
      const extractor = new ExtractorLLM(null);
      expect(extractor.modelId).toBe('none');
    });

    it('extractFile returns null', async () => {
      const extractor = new ExtractorLLM(null);
      const result = await extractor.extractFile(presentEntry('SOUL.md', 'content'));
      expect(result).toBeNull();
    });

    it('extractAll returns empty array', async () => {
      const extractor = new ExtractorLLM(null);
      const results = await extractor.extractAll([presentEntry('SOUL.md', 'content')]);
      expect(results).toEqual([]);
    });

    it('validateResults returns empty array', async () => {
      const extractor = new ExtractorLLM(null);
      const diags = await extractor.validateResults([]);
      expect(diags).toEqual([]);
    });

    it('extractVerifyMerge returns null', async () => {
      const extractor = new ExtractorLLM(null);
      const result = await extractor.extractVerifyMerge([], new Map());
      expect(result).toBeNull();
    });
  });

  describe('with mock provider', () => {
    it('available is true', () => {
      const extractor = new ExtractorLLM(new MockLLMProvider());
      expect(extractor.available).toBe(true);
    });

    it('modelId returns provider modelId', () => {
      const extractor = new ExtractorLLM(new MockLLMProvider());
      expect(extractor.modelId).toBe('mock-unit-v1');
    });

    it('extractFile returns null for absent entries', async () => {
      const extractor = new ExtractorLLM(new MockLLMProvider());
      const result = await extractor.extractFile(absentEntry('SOUL.md'));
      expect(result).toBeNull();
    });

    it('extractFile returns result for present entries', async () => {
      const extractor = new ExtractorLLM(new MockLLMProvider());
      const result = await extractor.extractFile(presentEntry('SOUL.md', 'Never use Bash'));
      expect(result).not.toBeNull();
      expect(result!.source).toBe('SOUL.md');
      expect(result!.intents).toHaveLength(1);
    });

    it('extractFile passes hints and options', async () => {
      const provider = new MockLLMProvider();
      const extractor = new ExtractorLLM(provider);
      const hints: ExtractionHints = { knownDenyPatterns: ['rm'] };
      const options: ExtractionOptions = { maxIntents: 10 };
      const result = await extractor.extractFile(
        presentEntry('SOUL.md', 'Never use Bash'),
        hints,
        options,
      );
      expect(result).not.toBeNull();
      expect(provider.extractCallCount).toBe(1);
    });

    it('extractAll filters absent entries', async () => {
      const extractor = new ExtractorLLM(new MockLLMProvider());
      const entries: FileEntry[] = [
        presentEntry('SOUL.md', 'Never use Bash'),
        absentEntry('TOOLS.md'),
        presentEntry('AGENTS.md', 'Some agents'),
      ];
      const results = await extractor.extractAll(entries);
      expect(results).toHaveLength(2);
    });

    it('validateResults calls provider.validate for each result', async () => {
      const provider = new MockLLMProvider();
      const extractor = new ExtractorLLM(provider);
      const results: ExtractionResult[] = [
        { source: 'SOUL.md', intents: [], modelId: 'mock' },
        { source: 'TOOLS.md', intents: [], modelId: 'mock' },
      ];
      const diags = await extractor.validateResults(results);
      expect(diags).toEqual([]);
      expect(provider.validateCallCount).toBe(2);
    });

    it('extractVerifyMerge returns empty pipeline result when no entries produce results', async () => {
      const extractor = new ExtractorLLM(new MockLLMProvider());
      const result = await extractor.extractVerifyMerge(
        [absentEntry('SOUL.md')],
        new Map(),
      );
      expect(result).not.toBeNull();
      expect(result!.mergeResults).toHaveLength(0);
    });

    it('extractVerifyMerge skips result whose source has no matching content', async () => {
      // Provider returns result for a source not in the entries
      class SourceMismatchProvider implements LLMProvider {
        readonly modelId = 'mismatch-v1';
        async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
          return {
            source: 'PHANTOM.md', // different from the request source
            intents: [{ kind: 'deny', target: 'X', description: 'd', confidence: 0.9, sourceText: 's' }],
            modelId: this.modelId,
          };
        }
        async validate(): Promise<ParseDiagnostic[]> { return []; }
      }
      const extractor = new ExtractorLLM(new SourceMismatchProvider());
      const entries: FileEntry[] = [presentEntry('SOUL.md', 'Never use Bash')];
      const result = await extractor.extractVerifyMerge(entries, new Map());
      expect(result).not.toBeNull();
      // Result has extraction results but no merge/verification (source mismatch)
      expect(result!.extractionResults).toHaveLength(1);
      expect(result!.mergeResults).toHaveLength(0);
      expect(result!.verificationResults).toHaveLength(0);
    });

    it('extractVerifyMerge runs full pipeline with present entries', async () => {
      const extractor = new ExtractorLLM(new MockLLMProvider());
      const entries: FileEntry[] = [
        presentEntry('SOUL.md', 'Never use Bash'),
      ];
      const regexMap = new Map<string, readonly { kind: string; target: string; description: string; confidence: number; sourceText: string }[]>();
      const result = await extractor.extractVerifyMerge(entries, regexMap);
      expect(result).not.toBeNull();
      expect(result!.extractionResults).toHaveLength(1);
      expect(result!.verificationResults).toHaveLength(1);
    });
  });

  describe('computeMerge', () => {
    it('computes overlap between keyword and LLM intents', () => {
      const extractor = new ExtractorLLM(null);
      const keywordIntents = [
        { source: 'SOUL.md', kind: 'deny', target: 'Bash' },
      ];
      const llmResults: ExtractionResult[] = [
        {
          source: 'SOUL.md',
          intents: [
            { kind: 'deny', target: 'Bash', description: 'Block', confidence: 0.9, sourceText: 'x' },
            { kind: 'deny', target: 'Rm', description: 'Block rm', confidence: 0.8, sourceText: 'y' },
          ],
          modelId: 'mock',
        },
      ];
      const merge = extractor.computeMerge(keywordIntents, llmResults);
      expect(merge.overlapping).toBe(1);
      expect(merge.llmOnly).toBe(1);
      expect(merge.keywordOnly).toBe(0);
      expect(merge.totalIntents).toBe(2);
    });

    it('handles empty inputs', () => {
      const extractor = new ExtractorLLM(null);
      const merge = extractor.computeMerge([], []);
      expect(merge.totalIntents).toBe(0);
      expect(merge.overlapping).toBe(0);
    });
  });

  // ── Retry / backoff branch (lines 125-128) ────────────────────────

  describe('extractAll retry/backoff', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('retries on provider error and succeeds after transient failure', async () => {
      let callCount = 0;
      const failOnce: LLMProvider = {
        modelId: 'fail-once-v1',
        async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
          callCount++;
          if (callCount === 1) {
            throw new Error('rate limit exceeded');
          }
          return { source: request.source, intents: [], modelId: 'fail-once-v1' };
        },
        async validate(): Promise<ParseDiagnostic[]> { return []; },
      };
      const extractor = new ExtractorLLM(failOnce);
      const promise = extractor.extractAll([presentEntry('SOUL.md', 'test')]);
      // Advance past backoff delay
      await vi.advanceTimersByTimeAsync(10_000);
      const results = await promise;
      expect(results).toHaveLength(1);
      expect(callCount).toBe(2);
    });

    it('exercises non-Error throw path in retry logging', async () => {
      let callCount = 0;
      const failWithString: LLMProvider = {
        modelId: 'fail-string-v1',
        async extract(): Promise<ExtractionResult> {
          callCount++;
          if (callCount === 1) {
            // eslint-disable-next-line no-throw-literal
            throw 'string error'; // non-Error throw — exercises String(err) branch
          }
          return { source: 'SOUL.md', intents: [], modelId: 'fail-string-v1' };
        },
        async validate(): Promise<ParseDiagnostic[]> { return []; },
      };
      const extractor = new ExtractorLLM(failWithString);
      const promise = extractor.extractAll([presentEntry('SOUL.md', 'test')]);
      await vi.advanceTimersByTimeAsync(10_000);
      const results = await promise;
      expect(results).toHaveLength(1);
      expect(callCount).toBe(2);
    });

    it('throws after exhausting all retries', async () => {
      const alwaysFail: LLMProvider = {
        modelId: 'always-fail-v1',
        async extract(): Promise<ExtractionResult> {
          throw new Error('permanent failure');
        },
        async validate(): Promise<ParseDiagnostic[]> { return []; },
      };
      const extractor = new ExtractorLLM(alwaysFail);
      const promise = extractor.extractAll([presentEntry('SOUL.md', 'test')]);
      // Attach catch handler immediately to prevent unhandled rejection on Linux/macOS
      const caughtPromise = promise.catch((err: unknown) => err);
      // Advance through all retry backoff delays
      await vi.advanceTimersByTimeAsync(60_000);
      const err = await caughtPromise;
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('permanent failure');
    });
  });
});

// ── buildRegexIntentMap ─────────────────────────────────────────────

describe('buildRegexIntentMap', () => {
  it('maps deny intents from AST', () => {
    const ast: GovernanceAST = {
      deny: [
        {
          source: 'SOUL.md',
          intents: [
            {
              intentKind: 'deny',
              pattern: 'Bash',
              rawLine: 'Never use Bash',
              confidence: 0.9,
              line: 3,
            },
          ],
        },
      ],
      tool: [],
      context: [],
      permission: [],
      memory: [],
      obo: [],
      schedule: [],
      data: [],
      agents: [],
      output: [],
      elicit: [],
      input: [],
      user: [],
      activity: [],
      workflow: [],
      supply: [],
      boundary: [],
      skill: [],
    };
    const map = buildRegexIntentMap(ast);
    expect(map.has('SOUL.md')).toBe(true);
    expect(map.get('SOUL.md')!).toHaveLength(1);
    expect(map.get('SOUL.md')![0]!.target).toBe('Bash');
  });

  it('maps deny intents without line property (line-undefined branch)', () => {
    const ast: GovernanceAST = {
      deny: [
        {
          source: 'SOUL.md',
          intents: [
            {
              intentKind: 'deny',
              pattern: 'Bash',
              rawLine: 'Never use Bash',
              confidence: 0.9,
              // line deliberately omitted at runtime to hit the else branch
            } as unknown as GovernanceAST['deny'][0]['intents'][0],
          ],
        },
      ],
      tool: [],
      context: [],
      permission: [],
      memory: [],
      obo: [],
      schedule: [],
      data: [],
      agents: [],
      output: [],
      elicit: [],
      input: [],
      user: [],
      activity: [],
      workflow: [],
      supply: [],
      boundary: [],
      skill: [],
    };
    const map = buildRegexIntentMap(ast);
    expect(map.has('SOUL.md')).toBe(true);
    const intents = map.get('SOUL.md')!;
    expect(intents).toHaveLength(1);
    expect(intents[0]!.target).toBe('Bash');
    // The line property should NOT be present since si.line was undefined
    expect(intents[0]).not.toHaveProperty('line');
  });

  it('maps tool intents from AST', () => {
    const ast: GovernanceAST = {
      deny: [],
      tool: [
        {
          source: 'TOOLS.md',
          intents: [
            {
              name: 'Read',
              riskClass: 1,
              line: 5,
            },
          ],
        },
      ],
      context: [],
      permission: [],
      memory: [],
      obo: [],
      schedule: [],
      data: [],
      agents: [],
      output: [],
      elicit: [],
      input: [],
      user: [],
      activity: [],
      workflow: [],
      supply: [],
      boundary: [],
      skill: [],
    };
    const map = buildRegexIntentMap(ast);
    expect(map.has('TOOLS.md')).toBe(true);
    expect(map.get('TOOLS.md')!).toHaveLength(1);
    expect(map.get('TOOLS.md')![0]!.target).toBe('Read');
    expect(map.get('TOOLS.md')![0]!.kind).toBe('label');
  });
});
