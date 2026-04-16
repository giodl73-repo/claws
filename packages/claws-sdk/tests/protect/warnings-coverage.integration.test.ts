/**
 * L1: Warnings coverage integration tests.
 *
 * D-W1: Rate limit backoff fires after rapid sequential calls.
 * D-W2: Fuzzy match disabled for R5 tool — near-miss rejected.
 * S-W1: Cache files written with 0o600 permissions.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyIntent } from '../../src/compile/llm/verifier.js';
import { store as cacheStore } from '../../src/compile/cache.js';
import type { LLMIntent } from '../../src/compile/llm/types.js';
import type { ToolRiskClass } from '../../src/compile/types.js';

describe('D-W2: fuzzy match disabled for R5 tool — near-miss rejected', () => {
  it('rejects fuzzy match for R5 tool intent', () => {
    const fileContent = 'line1\nDelete All Files\nline3';

    // Intent with near-miss (case difference) at R5
    const intent: LLMIntent = {
      kind: 'label',
      target: 'delete-all-files',
      description: 'Dangerous file deletion',
      confidence: 0.95,
      sourceText: 'delete all files', // lowercase vs actual "Delete All Files"
      line: 2,
      riskClass: 5 as ToolRiskClass,
    };

    const { verified, diagnostic } = verifyIntent(intent, fileContent, 'TOOLS.md');

    // D-W2: fuzzy match on R5 tool treated as mismatch
    expect(verified.outcome).toBe('mismatch');
    expect(verified.verified).toBe(false);
    expect(verified.intent.confidence).toBe(0);
    expect(diagnostic).toBeDefined();
    expect(diagnostic!.code).toBe('CLAWS-LLM-VERIFY-FUZZY-HIGHRISK');
    expect(diagnostic!.message).toContain('R5');
    expect(diagnostic!.message).toContain('exact match required');
  });
});

describe('S-W1: cache files written with 0o600 permissions', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('cache file has 0o600 permissions (or exists on Windows)', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cache-perm-'));

    // Write minimal workspace files for cache
    const { writeFile, mkdir } = await import('node:fs/promises');
    await writeFile(join(tempDir, 'SOUL.md'), '# Soul\n', 'utf-8');

    await cacheStore(tempDir);

    const cachePath = join(tempDir, '.claws', 'cache', 'hashes.json');
    const fileStat = await stat(cachePath);
    expect(fileStat.isFile()).toBe(true);

    if (process.platform !== 'win32') {
      // On POSIX: mode & 0o777 should be 0o600
      expect(fileStat.mode & 0o777).toBe(0o600);
    }
  });
});

describe('D-W1: rate limit backoff fires on retry, not between successful calls', () => {
  it('ExtractorLLM.extractAll has no inter-call delay on success (M-07: single backoff)', async () => {
    const { ExtractorLLM } = await import('../../src/compile/llm/extractor.js');

    const callTimestamps: number[] = [];
    const mockProvider = {
      modelId: 'mock',
      async extract() {
        callTimestamps.push(Date.now());
        return { source: 'SOUL.md', intents: [], modelId: 'mock' };
      },
      async validate() { return []; },
    };

    const extractor = new ExtractorLLM(mockProvider);
    const entries = [
      { source: 'SOUL.md', status: 'present' as const, content: '# Soul' },
      { source: 'TOOLS.md', status: 'present' as const, content: '# Tools' },
      { source: 'USER.md', status: 'present' as const, content: '# User' },
    ];

    await extractor.extractAll(entries);

    // All 3 entries processed
    expect(callTimestamps).toHaveLength(3);

    // No artificial delay between successful calls — calls should be fast
    if (callTimestamps.length >= 2) {
      const delta = callTimestamps[1]! - callTimestamps[0]!;
      expect(delta).toBeLessThan(100); // no inter-call backoff
    }
  });

  it('ExtractorLLM.extractAll applies retry backoff on transient failure', async () => {
    const { ExtractorLLM } = await import('../../src/compile/llm/extractor.js');

    let callCount = 0;
    const callTimestamps: number[] = [];
    const mockProvider = {
      modelId: 'mock',
      async extract() {
        callCount++;
        callTimestamps.push(Date.now());
        // Fail on first call, succeed on retry
        if (callCount === 1) {
          throw new Error('rate limited');
        }
        return { source: 'SOUL.md', intents: [], modelId: 'mock' };
      },
      async validate() { return []; },
    };

    const extractor = new ExtractorLLM(mockProvider);
    const entries = [
      { source: 'SOUL.md', status: 'present' as const, content: '# Soul' },
    ];

    await extractor.extractAll(entries);

    // First call fails, second call succeeds (retry)
    expect(callTimestamps).toHaveLength(2);

    // Retry should be delayed by backoff (base 200ms * 2^0 = 200ms, minus jitter)
    const delta = callTimestamps[1]! - callTimestamps[0]!;
    expect(delta).toBeGreaterThanOrEqual(100); // 200ms base - jitter tolerance
  });
});
