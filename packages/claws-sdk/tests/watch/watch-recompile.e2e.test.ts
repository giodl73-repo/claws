/**
 * L2: Watch recompile end-to-end test.
 *
 * Covers:
 * 1. Full watch pipeline: detect change → incremental parse → auto-analyze →
 *    auto-recompile, all completing within 1s on a reference workspace
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { parse } from '../../src/compile/parse.js';
import { DEFAULT_FILE_SOURCES } from '../../src/compile/types.js';
import { IncrementalParser } from '../../src/watch/incremental.js';
import { AutoAnalyzer } from '../../src/watch/auto-analyze.js';
import { AutoRecompiler } from '../../src/watch/auto-recompile.js';
import { ContentHashStore, hashContent } from '../../src/watch/content-hash.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `claws-recomp-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });

  // Create reference OC workspace with meaningful content
  await writeFile(join(testDir, 'SOUL.md'), [
    '# SOUL',
    '',
    '## Purpose',
    'Code review assistant for the engineering team.',
    '',
    '## Constraints',
    '- Never use the deploy tool without approval.',
    '- Always log tool invocations.',
    '',
  ].join('\n'), 'utf-8');

  await writeFile(join(testDir, 'TOOLS.md'), [
    '# TOOLS',
    '',
    '## read_file',
    'R2 file system read tool',
    '',
    '## write_file',
    'R2 file system write tool',
    '',
    '## deploy',
    'R4 production deployment tool',
    '',
  ].join('\n'), 'utf-8');

  await writeFile(join(testDir, 'AGENTS.md'), '# AGENTS\n\nNo subagents.\n', 'utf-8');
  await writeFile(join(testDir, 'IDENTITY.md'), '# IDENTITY\n\nTeam: Platform\nAuth: token\n', 'utf-8');
  await writeFile(join(testDir, 'USER.md'), '# USER\n\nRole: developer\n', 'utf-8');
  await writeFile(join(testDir, 'MEMORY.md'), '# MEMORY\n\nNo durable memory.\n', 'utf-8');
  await writeFile(join(testDir, 'HEARTBEAT.md'), '# HEARTBEAT\n\nNo scheduled tasks.\n', 'utf-8');
  await mkdir(join(testDir, 'skills'), { recursive: true });
  await writeFile(join(testDir, 'lobster.yaml'), 'name: default\nsteps: []\n', 'utf-8');
  await writeFile(join(testDir, 'claws.json'), '{}', 'utf-8');

  // Create compiled directory with initial artifacts
  const compiledDir = join(testDir, '.claws/compiled');
  await mkdir(compiledDir, { recursive: true });
  const toolsContent = await readFile(join(testDir, 'TOOLS.md'), 'utf-8');
  await writeFile(join(compiledDir, 'TOOLS.md.json'), JSON.stringify({
    source: 'TOOLS.md',
    contentHash: hashContent(toolsContent),
    compiledAt: new Date().toISOString(),
  }, null, 2), 'utf-8');
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('e2e: watch detects change → analyze → recompile within 1s', () => {
  it('full pipeline completes within 1s on reference workspace', async () => {
    const start = Date.now();

    // Step 1: Full parse (initial)
    const initial = await parse(testDir);
    const parser = new IncrementalParser(testDir);
    parser.seed(initial);

    // Step 2: Initial analyze to establish baseline
    const analyzer = new AutoAnalyzer();
    const baseline = analyzer.run(initial);

    // Step 3: Initialize recompiler
    const recompiler = new AutoRecompiler(testDir);

    // Step 4: Simulate TOOLS.md edit — add a new R5 tool
    const newToolsContent = [
      '# TOOLS',
      '',
      '## read_file',
      'R2 file system read tool',
      '',
      '## write_file',
      'R2 file system write tool',
      '',
      '## deploy',
      'R4 production deployment tool',
      '',
      '## admin_reset',
      'R5 production database reset',
      '',
    ].join('\n');
    await writeFile(join(testDir, 'TOOLS.md'), newToolsContent, 'utf-8');

    // Step 5: Content hash detects the change
    const hashStore = new ContentHashStore();
    const toolsPath = join(testDir, 'TOOLS.md');
    const oldContent = initial.entries.find(e => e.source === 'TOOLS.md');
    if (oldContent?.status === 'present') {
      hashStore.update(toolsPath, oldContent.content);
    }
    const changed = await hashStore.updateFromDisk(toolsPath);
    expect(changed).toBe(true);

    // Step 6: Incremental re-parse
    const updated = await parser.update(['TOOLS.md']);
    const toolsEntry = updated.entries.find(e => e.source === 'TOOLS.md');
    expect(toolsEntry?.status).toBe('present');
    if (toolsEntry?.status === 'present') {
      expect(toolsEntry.content).toContain('admin_reset');
    }

    // Step 7: Auto-analyze
    const analyzeResult = analyzer.run(updated);
    expect(analyzeResult.analysis).toBeDefined();
    expect(analyzeResult.diff).toBeDefined();

    // Step 8: Auto-recompile
    const recompileResult = await recompiler.recompile(['TOOLS.md']);
    expect(recompileResult.triggered).toBe(true);
    expect(recompileResult.recompiledCount).toBeGreaterThan(0);

    // Verify artifact on disk
    const artifactPath = join(testDir, '.claws/compiled/TOOLS.md.json');
    const artifact = JSON.parse(await readFile(artifactPath, 'utf-8'));
    expect(artifact.contentHash).toBe(hashContent(newToolsContent));

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});
