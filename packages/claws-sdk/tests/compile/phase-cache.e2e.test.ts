/**
 * L2: Incremental compile e2e — <200ms single-file PATCH and rapid-edit
 * coalescing against a synthetic CAP pipeline.
 *
 * Covers:
 *  1. PATCH single tool → recompile completes in <200ms
 *  2. rapid sequential edits coalesce — only one compile runs for the
 *     burst after the in-flight compile settles
 */

import { describe, it, expect } from 'vitest';
import { IncrementalCompilationCache } from '../../src/compile/cache.js';
import { CompilationQueue } from '../../src/compile/compilation-queue.js';
import { hashContent } from '../../src/compilation-host.js';

/**
 * Synthetic CAP-like pipeline. Each phase sleeps for a small amount to
 * approximate real work; the cache should skip phases whose inputs
 * didn't change.
 */
const PHASES = [
  { name: 'parse', consumes: ['SOUL.md', 'TOOLS.md', 'POLICY.md'], work: 30 },
  { name: 'classify', consumes: ['TOOLS.md', 'POLICY.md'], work: 25 },
  { name: 'evaluate', consumes: ['POLICY.md'], work: 25 },
  { name: 'emit', consumes: ['SOUL.md', 'TOOLS.md', 'POLICY.md'], work: 30 },
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runPipeline(
  cache: IncrementalCompilationCache,
  files: Record<string, string>,
  phasesToRun: readonly string[],
): Promise<string[]> {
  const ran: string[] = [];
  for (const phase of PHASES) {
    if (!phasesToRun.includes(phase.name)) continue;
    const inputHashes = phase.consumes.map((f) => hashContent(files[f] ?? ''));
    const hit = cache.getPhase(phase.name, inputHashes);
    if (hit !== undefined) continue;
    await sleep(phase.work);
    ran.push(phase.name);
    cache.setPhase(phase.name, inputHashes, { phase: phase.name }, [...phase.consumes]);
  }
  for (const [path, content] of Object.entries(files)) {
    cache.updateFileHash(path, content);
  }
  return ran;
}

describe('e2e: single-file PATCH recompile', () => {
  it('PATCH TOOLS.md → recompile completes in <200ms', async () => {
    const cache = new IncrementalCompilationCache();
    const files: Record<string, string> = {
      'SOUL.md': 'soul v1',
      'TOOLS.md': 'tools v1',
      'POLICY.md': 'policy v1',
    };
    // Cold: full compile (~110ms + overhead).
    await runPipeline(cache, files, ['parse', 'classify', 'evaluate', 'emit']);

    // Apply a PATCH to TOOLS.md only.
    files['TOOLS.md'] = 'tools v2 (patched)';

    const start = performance.now();
    const plan = cache.planRecompile(
      Object.entries(files).map(([filePath, content]) => ({ filePath, hash: hashContent(content) })),
    );
    for (const f of plan.changedFiles) cache.invalidateFile(f);
    const ran = await runPipeline(cache, files, plan.phases);
    const elapsed = performance.now() - start;

    // evaluate skipped → save at least one phase's work.
    expect(ran).not.toContain('evaluate');
    expect(ran.sort()).toEqual(['classify', 'emit', 'parse']);
    expect(elapsed).toBeLessThan(200);
  });
});

describe('e2e: rapid sequential edits coalesce', () => {
  it('burst of 5 edits results in ≤2 compiles (in-flight + coalesced)', async () => {
    const cache = new IncrementalCompilationCache();
    const files: Record<string, string> = {
      'SOUL.md': 'soul v1',
      'TOOLS.md': 'tools v1',
      'POLICY.md': 'policy v1',
    };
    await runPipeline(cache, files, ['parse', 'classify', 'evaluate', 'emit']);

    let runs = 0;
    const queue = new CompilationQueue({
      compile: async (t) => {
        runs += 1;
        const snapshot = { ...files };
        const plan = cache.planRecompile(
          Object.entries(snapshot).map(([filePath, content]) => ({ filePath, hash: hashContent(content) })),
        );
        for (const f of plan.changedFiles) cache.invalidateFile(f);
        await runPipeline(cache, snapshot, plan.phases);
        return { reason: t.reason, runIndex: runs };
      },
    });

    const promises: Promise<unknown>[] = [];
    for (let i = 2; i <= 6; i++) {
      files['TOOLS.md'] = `tools v${i}`;
      promises.push(queue.enqueue({ filePath: 'TOOLS.md', reason: `v${i}` }));
    }

    const results = await Promise.all(promises);
    expect(runs).toBeLessThanOrEqual(2);
    // Last awaited result came from the coalesced compile.
    const last = results[results.length - 1] as { reason: string };
    expect(last.reason).toBe('v6');
  });
});
