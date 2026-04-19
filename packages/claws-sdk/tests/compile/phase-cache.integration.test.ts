/**
 * L1: Incremental phase cache integration tests.
 *
 * Covers:
 *  1. full compile → edit TOOLS.md → only classify+evaluate+emit re-run
 *  2. sequential edits to different files invalidate correct phase subsets
 *  3. coalesced compile produces correct output (latest content wins)
 *  4. cache survives across multiple compile cycles
 */

import { describe, it, expect } from 'vitest';
import { IncrementalCompilationCache } from '../../src/compile/cache.js';
import { CompilationQueue } from '../../src/compile/compilation-queue.js';
import { hashContent } from '../../src/compilation-host.js';

type PhaseLog = string[];

interface FakePhase {
  readonly name: string;
  readonly consumes: readonly string[];
}

/**
 * Simulated 4-phase CAP pipeline.
 *
 * parse:    SOUL.md, TOOLS.md, POLICY.md   (reads every file)
 * classify: TOOLS.md, POLICY.md            (tool + policy classification)
 * evaluate: POLICY.md                      (policy decision)
 * emit:     SOUL.md, TOOLS.md, POLICY.md   (serializes output)
 */
const PHASES: readonly FakePhase[] = [
  { name: 'parse', consumes: ['SOUL.md', 'TOOLS.md', 'POLICY.md'] },
  { name: 'classify', consumes: ['TOOLS.md', 'POLICY.md'] },
  { name: 'evaluate', consumes: ['POLICY.md'] },
  { name: 'emit', consumes: ['SOUL.md', 'TOOLS.md', 'POLICY.md'] },
];

function runPipeline(
  cache: IncrementalCompilationCache,
  files: Record<string, string>,
  log: PhaseLog,
  phasesToRun?: readonly string[],
): void {
  const names = phasesToRun ?? PHASES.map((p) => p.name);
  for (const phase of PHASES) {
    if (!names.includes(phase.name)) continue;
    const inputHashes = phase.consumes.map((f) => hashContent(files[f] ?? ''));
    const hit = cache.getPhase(phase.name, inputHashes);
    if (hit !== undefined) continue;
    log.push(phase.name);
    cache.setPhase(phase.name, inputHashes, { phase: phase.name }, [...phase.consumes]);
  }
  for (const [path, content] of Object.entries(files)) {
    cache.updateFileHash(path, content);
  }
}

describe('IncrementalCompilationCache — full → edit → partial re-run', () => {
  it('edit TOOLS.md triggers parse+classify+emit re-run; evaluate survives', () => {
    const cache = new IncrementalCompilationCache();
    const log: PhaseLog = [];
    const files: Record<string, string> = {
      'SOUL.md': 'soul v1',
      'TOOLS.md': 'tools v1',
      'POLICY.md': 'policy v1',
    };

    // Full compile — records dependency graph and seeds phase cache.
    runPipeline(cache, files, log);
    expect(log).toEqual(['parse', 'classify', 'evaluate', 'emit']);

    // Edit TOOLS.md only.
    files['TOOLS.md'] = 'tools v2';
    const plan = cache.planRecompile(
      Object.entries(files).map(([filePath, content]) => ({ filePath, hash: hashContent(content) })),
    );
    expect(plan.fullRebuild).toBe(false);
    expect(plan.changedFiles).toEqual(['TOOLS.md']);
    expect([...plan.phases].sort()).toEqual(['classify', 'emit', 'parse']);

    // Invalidate + re-run the planned phases only.
    for (const file of plan.changedFiles) cache.invalidateFile(file);
    log.length = 0;
    runPipeline(cache, files, log, plan.phases);
    // 'evaluate' is not in the plan → did not re-run.
    expect(log.sort()).toEqual(['classify', 'emit', 'parse']);
  });
});

describe('IncrementalCompilationCache — sequential edits', () => {
  it('invalidates only the phase subset affected by each edit', () => {
    const cache = new IncrementalCompilationCache();
    const log: PhaseLog = [];
    const files: Record<string, string> = {
      'SOUL.md': 'soul v1',
      'TOOLS.md': 'tools v1',
      'POLICY.md': 'policy v1',
    };
    runPipeline(cache, files, log);

    // Edit 1: SOUL.md → parse + emit (classify/evaluate survive).
    log.length = 0;
    files['SOUL.md'] = 'soul v2';
    const plan1 = cache.planRecompile(
      Object.entries(files).map(([filePath, content]) => ({ filePath, hash: hashContent(content) })),
    );
    for (const f of plan1.changedFiles) cache.invalidateFile(f);
    runPipeline(cache, files, log, plan1.phases);
    expect(log.sort()).toEqual(['emit', 'parse']);

    // Edit 2: POLICY.md → every phase touches POLICY.md except none;
    // parse+classify+evaluate+emit all must re-run.
    log.length = 0;
    files['POLICY.md'] = 'policy v2';
    const plan2 = cache.planRecompile(
      Object.entries(files).map(([filePath, content]) => ({ filePath, hash: hashContent(content) })),
    );
    for (const f of plan2.changedFiles) cache.invalidateFile(f);
    runPipeline(cache, files, log, plan2.phases);
    expect(log.sort()).toEqual(['classify', 'emit', 'evaluate', 'parse']);
  });
});

describe('IncrementalCompilationCache — coalesced compile via queue', () => {
  it('rapid edits to same file produce a single compile with latest content', async () => {
    const cache = new IncrementalCompilationCache();
    const runs: string[] = [];
    const files: Record<string, string> = {
      'SOUL.md': 'soul v1',
      'TOOLS.md': 'tools v1',
      'POLICY.md': 'policy v1',
    };
    runPipeline(cache, files, []);

    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const queue = new CompilationQueue({
      compile: async (t) => {
        runs.push(`${t.filePath}:${t.reason ?? ''}`);
        if (runs.length === 1) await gate;
        const snapshot = { ...files };
        const plan = cache.planRecompile(
          Object.entries(snapshot).map(([filePath, content]) => ({ filePath, hash: hashContent(content) })),
        );
        for (const f of plan.changedFiles) cache.invalidateFile(f);
        runPipeline(cache, snapshot, [], plan.phases);
        return { phases: plan.phases, reason: t.reason };
      },
    });

    files['TOOLS.md'] = 'tools v2';
    const first = queue.enqueue({ filePath: 'TOOLS.md', reason: 'v2' });
    files['TOOLS.md'] = 'tools v3';
    const second = queue.enqueue({ filePath: 'TOOLS.md', reason: 'v3' });
    files['TOOLS.md'] = 'tools v4';
    const third = queue.enqueue({ filePath: 'TOOLS.md', reason: 'v4' });

    release();
    const [r1, r2, r3] = await Promise.all([first, second, third]);

    // Two runs total: the in-flight first, then the coalesced v4.
    expect(runs.length).toBe(2);
    expect((r1 as { reason: string }).reason).toBe('v2');
    expect(r2).toEqual(r3);
    expect((r3 as { reason: string }).reason).toBe('v4');
  });
});

describe('IncrementalCompilationCache — persistence across cycles', () => {
  it('cache survives multiple compile cycles with no-op edits', () => {
    const cache = new IncrementalCompilationCache();
    const log: PhaseLog = [];
    const files: Record<string, string> = {
      'SOUL.md': 'soul v1',
      'TOOLS.md': 'tools v1',
      'POLICY.md': 'policy v1',
    };
    runPipeline(cache, files, log);
    expect(log.length).toBe(4);

    for (let i = 0; i < 5; i++) {
      log.length = 0;
      const plan = cache.planRecompile(
        Object.entries(files).map(([filePath, content]) => ({ filePath, hash: hashContent(content) })),
      );
      expect(plan.changedFiles).toEqual([]);
      expect(plan.fullRebuild).toBe(false);
      expect(plan.phases).toEqual([]);
      runPipeline(cache, files, log, plan.phases);
      // No phases planned → pipeline is a no-op.
      expect(log).toEqual([]);
    }
  });
});
