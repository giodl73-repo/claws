/**
 * L1: ExtractorLLM integration tests with mock provider against file entries.
 *
 * 2 integration tests covering:
 * 1. extractAll() with present and absent entries returns results for present only
 * 2. null provider (LLM unavailable) returns graceful no-ops for all operations
 */

import { describe, it, expect } from 'vitest';
import { ExtractorLLM } from '../../../src/compile/llm/extractor.js';
import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
  LLMIntent,
} from '../../../src/compile/llm/types.js';
import type { FileEntry, FileEntryPresent, FileEntryAbsent, ParseDiagnostic } from '../../../src/compile/types.js';

// ── Mock Provider ───────────────────────────────────────────────────────

class MockLLMProvider implements LLMProvider {
  readonly modelId = 'mock-extractor-v1';
  extractCallCount = 0;

  async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
    this.extractCallCount++;

    // Return file-specific intents
    const intents: LLMIntent[] = [];

    if (request.source === 'SOUL.md') {
      intents.push({
        kind: 'deny',
        target: 'Bash',
        description: 'Never execute shell commands',
        confidence: 0.95,
        line: 3,
        sourceText: 'Never use Bash directly.',
      });
      intents.push({
        kind: 'require',
        target: 'Read',
        description: 'Always use Read tool',
        confidence: 0.85,
        line: 5,
        sourceText: 'Always use the Read tool.',
      });
    } else if (request.source === 'TOOLS.md') {
      intents.push({
        kind: 'label',
        target: 'Write',
        description: 'Write tool is R2 filesystem',
        confidence: 0.90,
        line: 8,
        sourceText: 'Write — R2 filesystem access.',
      });
    }

    return {
      source: request.source,
      intents,
      usage: { inputTokens: 200, outputTokens: 80 },
      modelId: this.modelId,
    };
  }

  async validate(result: ExtractionResult): Promise<readonly ParseDiagnostic[]> {
    return [];
  }
}

// ── Fixtures ────────────────────────────────────────────────────────────

const presentSoul: FileEntryPresent = {
  status: 'present',
  source: 'SOUL.md',
  content: '# Soul\n\nNever use Bash directly.\n\nAlways use the Read tool.',
  provenance: {
    source: 'SOUL.md',
    sourceType: 'filesystem',
    contentHash: 'abc123',
    readAt: '2026-04-13T00:00:00Z',
    rawSize: 60,
  },
};

const presentTools: FileEntryPresent = {
  status: 'present',
  source: 'TOOLS.md',
  content: '# Tools\n\n## Bash\nR5 — shell execution.\n\n## Read\nR1 — file read.\n\n## Write\nWrite — R2 filesystem access.',
  provenance: {
    source: 'TOOLS.md',
    sourceType: 'filesystem',
    contentHash: 'def456',
    readAt: '2026-04-13T00:00:00Z',
    rawSize: 90,
  },
};

const absentAgents: FileEntryAbsent = {
  status: 'absent',
  source: 'AGENTS.md',
  defaultDescription: 'AGENTS.md not found -- no agent delegation defined',
};

const entries: readonly FileEntry[] = [presentSoul, presentTools, absentAgents];

// ── Tests ───────────────────────────────────────────────────────────────

describe('ExtractorLLM integration', () => {
  it('extractAll() with present and absent entries returns results for present only', async () => {
    const provider = new MockLLMProvider();
    const extractor = new ExtractorLLM(provider);

    expect(extractor.available).toBe(true);
    expect(extractor.modelId).toBe('mock-extractor-v1');

    const results = await extractor.extractAll(entries, {
      knownTools: ['Bash', 'Read', 'Write'],
    });

    // Only 2 present files should produce results
    expect(results).toHaveLength(2);
    expect(provider.extractCallCount).toBe(2);

    // SOUL.md result
    const soulResult = results.find((r) => r.source === 'SOUL.md');
    expect(soulResult).toBeDefined();
    expect(soulResult!.intents).toHaveLength(2);
    expect(soulResult!.intents[0]!.kind).toBe('deny');
    expect(soulResult!.intents[0]!.target).toBe('Bash');
    expect(soulResult!.intents[1]!.kind).toBe('require');
    expect(soulResult!.modelId).toBe('mock-extractor-v1');

    // TOOLS.md result
    const toolsResult = results.find((r) => r.source === 'TOOLS.md');
    expect(toolsResult).toBeDefined();
    expect(toolsResult!.intents).toHaveLength(1);
    expect(toolsResult!.intents[0]!.kind).toBe('label');

    // Validate returns no diagnostics for valid results
    const diagnostics = await extractor.validateResults(results);
    expect(diagnostics).toHaveLength(0);

    // Compute merge stats
    const keywordIntents = [
      { source: 'SOUL.md', kind: 'deny', target: 'Bash' },
      { source: 'SOUL.md', kind: 'limit', target: 'Write' },
    ];
    const merge = extractor.computeMerge(keywordIntents, results);
    expect(merge.overlapping).toBe(1); // deny|Bash found in both
    expect(merge.keywordOnly).toBe(1); // limit|Write only in keyword
    expect(merge.llmOnly).toBe(2); // require|Read and label|Write only in LLM
    expect(merge.totalIntents).toBe(4);
  });

  it('extractFile() passes hints and options through to provider request', async () => {
    const provider = new MockLLMProvider();
    const extractor = new ExtractorLLM(provider);

    const result = await extractor.extractFile(
      presentSoul,
      { knownTools: ['Bash'] },
      { temperature: 0.2, maxTokens: 2048 },
    );

    expect(result).not.toBeNull();
    expect(result!.source).toBe('SOUL.md');
    expect(result!.intents).toHaveLength(2);
    expect(provider.extractCallCount).toBe(1);
  });

  it('null provider (LLM unavailable) returns graceful no-ops', async () => {
    const extractor = new ExtractorLLM(null);

    expect(extractor.available).toBe(false);
    expect(extractor.modelId).toBe('none');

    // extractFile returns null
    const single = await extractor.extractFile(presentSoul);
    expect(single).toBeNull();

    // extractAll returns empty array
    const results = await extractor.extractAll(entries);
    expect(results).toHaveLength(0);

    // validateResults returns empty array
    const diagnostics = await extractor.validateResults([]);
    expect(diagnostics).toHaveLength(0);

    // computeMerge works with empty LLM results
    const merge = extractor.computeMerge(
      [{ source: 'SOUL.md', kind: 'deny', target: 'Bash' }],
      [],
    );
    expect(merge.totalIntents).toBe(1);
    expect(merge.keywordOnly).toBe(1);
    expect(merge.llmOnly).toBe(0);
    expect(merge.overlapping).toBe(0);
  });
});
