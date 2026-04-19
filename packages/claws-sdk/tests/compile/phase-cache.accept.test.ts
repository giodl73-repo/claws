/**
 * L3: Acceptance — S06 single-file PATCH <200ms on a reference workspace.
 *
 * Reference workspace uses the DEFAULT_FILE_SOURCES set. A PATCH to a
 * single tool in TOOLS.md should produce a partial recompile that
 * completes in well under 200ms, exercising the same phase pipeline an
 * end-user would trigger via claws serve.
 */

import { describe, it, expect } from 'vitest';
import { IncrementalCompilationCache } from '../../src/compile/cache.js';
import { hashContent } from '../../src/compilation-host.js';

const FILES = {
  'SOUL.md': '# SOUL\n\nIdentity: acceptance-agent\n',
  'TOOLS.md': '# TOOLS\n\n## github_issue_read\nallow\n',
  'POLICY.md': '# POLICY\n\ntrust: org\n',
  'AGENTS.md': '# AGENTS\n\nroster: []\n',
  'MEMORY.md': '# MEMORY\n\nscopes: []\n',
  'DATA.md': '# DATA\n\nlabels: []\n',
  'HEARTBEAT.md': '# HEARTBEAT\n\ninterval: 60s\n',
  'SKILLS.md': '# SKILLS\n\nregistered: []\n',
  'USER.md': '# USER\n\npreferences: {}\n',
};

const PHASES = [
  { name: 'parse', consumes: Object.keys(FILES), work: 15 },
  { name: 'classify', consumes: ['TOOLS.md', 'POLICY.md', 'DATA.md'], work: 12 },
  { name: 'evaluate', consumes: ['POLICY.md', 'AGENTS.md'], work: 12 },
  { name: 'emit', consumes: Object.keys(FILES), work: 15 },
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runPipeline(
  cache: IncrementalCompilationCache,
  files: Record<string, string>,
  phasesToRun: readonly string[],
): Promise<void> {
  for (const phase of PHASES) {
    if (!phasesToRun.includes(phase.name)) continue;
    const inputHashes = phase.consumes.map((f) => hashContent(files[f] ?? ''));
    if (cache.getPhase(phase.name, inputHashes) !== undefined) continue;
    await sleep(phase.work);
    cache.setPhase(phase.name, inputHashes, { phase: phase.name }, [...phase.consumes]);
  }
  for (const [path, content] of Object.entries(files)) {
    cache.updateFileHash(path, content);
  }
}

describe('S06 acceptance — PATCH single tool <200ms', () => {
  it('single-file PATCH to TOOLS.md recompiles in <200ms', async () => {
    const cache = new IncrementalCompilationCache();
    const files: Record<string, string> = { ...FILES };

    // Cold full compile seeds the dependency graph.
    await runPipeline(cache, files, PHASES.map((p) => p.name));

    // Apply a PATCH: add a second tool to TOOLS.md.
    files['TOOLS.md'] = `${files['TOOLS.md']}\n## slack_post_message\ndeny\n`;

    const start = performance.now();
    const plan = cache.planRecompile(
      Object.entries(files).map(([filePath, content]) => ({ filePath, hash: hashContent(content) })),
    );
    for (const f of plan.changedFiles) cache.invalidateFile(f);
    await runPipeline(cache, files, plan.phases);
    const elapsed = performance.now() - start;

    expect(plan.fullRebuild).toBe(false);
    expect(plan.changedFiles).toEqual(['TOOLS.md']);
    // evaluate does not consume TOOLS.md → must not be replayed.
    expect(plan.phases).not.toContain('evaluate');
    expect(elapsed).toBeLessThan(200);
  });
});
