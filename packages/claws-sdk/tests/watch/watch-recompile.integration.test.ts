/**
 * L1: Watch recompile integration tests.
 *
 * Covers:
 * 1. Watch + edit TOOLS.md → auto-recompile → verify artifact updated;
 *    unchanged save → no recompile
 * 2. Windows integration: full pipeline (parse → analyze → recompile) <1s
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { parse } from '../../src/compile/parse.js';
import { DEFAULT_FILE_SOURCES } from '../../src/compile/types.js';
import { IncrementalParser } from '../../src/watch/incremental.js';
import { AutoAnalyzer } from '../../src/watch/auto-analyze.js';
import { AutoRecompiler } from '../../src/watch/auto-recompile.js';
import { ContentHashStore, hashContent } from '../../src/watch/content-hash.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `claws-recomp-int-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });

  // Create minimal OC workspace
  for (const source of DEFAULT_FILE_SOURCES) {
    if (source.endsWith('/')) {
      await mkdir(join(testDir, source), { recursive: true });
    } else {
      await writeFile(join(testDir, source), `# ${source}\nMinimal content\n`, 'utf-8');
    }
  }
  await writeFile(join(testDir, 'claws.json'), '{}', 'utf-8');
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('watch integration: TOOLS.md edit → auto-recompile', () => {
  it('recompiles stale artifacts on content change and skips on unchanged save', async () => {
    // Set up compiled dir with an initial artifact
    const compiledDir = join(testDir, '.claws/compiled');
    await mkdir(compiledDir, { recursive: true });

    const toolsContent = '# TOOLS.md\nMinimal content\n';
    const artifactContent = JSON.stringify({
      source: 'TOOLS.md',
      contentHash: hashContent(toolsContent),
      compiledAt: new Date().toISOString(),
    }, null, 2);
    await writeFile(join(compiledDir, 'TOOLS.md.json'), artifactContent, 'utf-8');

    // Initialize recompiler
    const recompiler = new AutoRecompiler(testDir);

    // Step 1: Edit TOOLS.md with new content
    const newToolsContent = '# TOOLS\n## deploy\nR4 deployment tool\n';
    await writeFile(join(testDir, 'TOOLS.md'), newToolsContent, 'utf-8');

    const result1 = await recompiler.recompile(['TOOLS.md']);
    expect(result1.triggered).toBe(true);
    expect(result1.recompiledCount).toBe(1);
    expect(result1.recompiledArtifacts).toContain('.claws/compiled/TOOLS.md.json');

    // Verify artifact was updated on disk
    const updatedArtifact = JSON.parse(
      await readFile(join(compiledDir, 'TOOLS.md.json'), 'utf-8'),
    );
    expect(updatedArtifact.contentHash).toBe(hashContent(newToolsContent));

    // Step 2: "Save" the same content (no change)
    const result2 = await recompiler.recompile(['TOOLS.md']);
    expect(result2.triggered).toBe(false);
    expect(result2.recompiledCount).toBe(0);
  });
});

describe('watch integration: full pipeline latency', () => {
  it('parse → analyze → recompile completes within 1s', async () => {
    const start = Date.now();

    // Full parse
    const parseResult = await parse(testDir);
    const parser = new IncrementalParser(testDir);
    parser.seed(parseResult);

    // Analyze
    const analyzer = new AutoAnalyzer();
    const analyzeResult = analyzer.run(parseResult);

    // Recompile (no compiled dir → fast path)
    const recompiler = new AutoRecompiler(testDir);
    const recompileResult = await recompiler.recompile(['TOOLS.md']);

    const elapsed = Date.now() - start;

    expect(analyzeResult.analysis).toBeDefined();
    expect(recompileResult.compiledDirExists).toBe(false);
    expect(elapsed).toBeLessThan(1000);
  });
});
