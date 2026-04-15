/**
 * L0: Watch recompile unit tests.
 *
 * Covers:
 * 1. Auto-analyze triggers on change and produces correct violation set
 * 2. Cache invalidation on hash mismatch marks artifacts stale
 * 3. Artifact update after recompile updates hash
 * 4. Violation diff identifies new/resolved violations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { AutoAnalyzer, diffViolations } from '../../src/watch/auto-analyze.js';
import { CacheInvalidator } from '../../src/watch/cache-invalidation.js';
import { AutoRecompiler } from '../../src/watch/auto-recompile.js';
import type { ParseResult, FileEntryPresent } from '../../src/compile/types.js';
import type { GovViolation } from '../../src/ir/gov-analysis.js';
import { hashContent } from '../../src/watch/content-hash.js';

// ── Helper: build a minimal ParseResult ──────────────────────────────────

function makeParseResult(files: Record<string, string>): ParseResult {
  const entries: FileEntryPresent[] = Object.entries(files).map(([source, content]) => ({
    status: 'present' as const,
    source,
    content,
    provenance: {
      source,
      sourceType: 'filesystem' as const,
      contentHash: hashContent(content),
      readAt: new Date().toISOString(),
      rawSize: Buffer.byteLength(content, 'utf-8'),
    },
  }));

  return {
    entries,
    diagnostics: [],
    presentCount: entries.length,
    absentCount: 0,
    shouldHalt: false,
  };
}

// ── Auto-analyze ────────────────────────────────────────────────────────

describe('AutoAnalyzer', () => {
  it('triggers on change and produces a governance analysis result', () => {
    const analyzer = new AutoAnalyzer();
    const parseResult = makeParseResult({
      'SOUL.md': '# SOUL\nNever use the deploy tool.\n',
      'TOOLS.md': '# TOOLS\n## deploy\nR4 deployment tool\n',
      'AGENTS.md': '# AGENTS\n',
      'IDENTITY.md': '# IDENTITY\n',
      'USER.md': '# USER\n',
      'MEMORY.md': '# MEMORY\n',
      'HEARTBEAT.md': '# HEARTBEAT\n',
    });

    const result = analyzer.run(parseResult);

    expect(result.analysis).toBeDefined();
    expect(result.analysis.violations).toBeDefined();
    expect(result.diff).toBeDefined();
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('tracks violation count across runs', () => {
    const analyzer = new AutoAnalyzer();

    const result1 = makeParseResult({
      'SOUL.md': '# SOUL\n',
      'TOOLS.md': '# TOOLS\n',
    });
    analyzer.run(result1);

    const initialCount = analyzer.violationCount;

    // Run again with same state
    const result2 = analyzer.run(result1);
    expect(result2.diff.delta).toBe(0);
    expect(result2.diff.added).toHaveLength(0);
    expect(result2.diff.resolved).toHaveLength(0);
  });

  it('reset clears previous violation state', () => {
    const analyzer = new AutoAnalyzer();

    const parseResult = makeParseResult({
      'SOUL.md': '# SOUL\n',
      'TOOLS.md': '# TOOLS\n',
    });
    analyzer.run(parseResult);
    analyzer.reset();
    expect(analyzer.violationCount).toBe(0);
  });
});

// ── Cache invalidation ──────────────────────────────────────────────────

describe('CacheInvalidator', () => {
  let invalidator: CacheInvalidator;

  beforeEach(() => {
    invalidator = new CacheInvalidator();
  });

  it('marks artifact stale when source content hash changes', () => {
    const originalContent = '# TOOLS\nOriginal\n';
    const updatedContent = '# TOOLS\nUpdated\n';

    invalidator.track('.claws/compiled/TOOLS.md.json', 'TOOLS.md', originalContent);

    const changedFiles = new Map([['TOOLS.md', updatedContent]]);
    const result = invalidator.check(changedFiles);

    expect(result.staleArtifacts).toContain('.claws/compiled/TOOLS.md.json');
    expect(result.changedSources).toContain('TOOLS.md');
    expect(result.validArtifacts).toHaveLength(0);
  });

  it('keeps artifact valid when content hash is unchanged', () => {
    const content = '# TOOLS\nSame content\n';

    invalidator.track('.claws/compiled/TOOLS.md.json', 'TOOLS.md', content);

    const changedFiles = new Map([['TOOLS.md', content]]);
    const result = invalidator.check(changedFiles);

    expect(result.staleArtifacts).toHaveLength(0);
    expect(result.validArtifacts).toContain('.claws/compiled/TOOLS.md.json');
    expect(result.changedSources).toHaveLength(0);
  });

  it('updateSource refreshes hash so subsequent check sees valid', () => {
    const original = '# TOOLS\nV1\n';
    const updated = '# TOOLS\nV2\n';

    invalidator.track('.claws/compiled/TOOLS.md.json', 'TOOLS.md', original);

    // First check: stale
    const result1 = invalidator.check(new Map([['TOOLS.md', updated]]));
    expect(result1.staleArtifacts).toHaveLength(1);

    // Update source hash to match new content
    invalidator.updateSource('TOOLS.md', updated);

    // Second check: valid
    const result2 = invalidator.check(new Map([['TOOLS.md', updated]]));
    expect(result2.staleArtifacts).toHaveLength(0);
    expect(result2.validArtifacts).toHaveLength(1);
  });

  it('tracks multiple artifacts for the same source', () => {
    const content = '# TOOLS\n';
    invalidator.track('.claws/compiled/TOOLS.md.json', 'TOOLS.md', content);
    invalidator.track('.claws/compiled/TOOLS.md.sarif', 'TOOLS.md', content);

    expect(invalidator.size).toBe(2);
    expect(invalidator.getArtifactsForSource('TOOLS.md')).toHaveLength(2);

    const changedFiles = new Map([['TOOLS.md', '# TOOLS\nChanged\n']]);
    const result = invalidator.check(changedFiles);
    expect(result.staleArtifacts).toHaveLength(2);
  });

  it('remove() deletes a tracked artifact', () => {
    invalidator.track('.claws/compiled/TOOLS.md.json', 'TOOLS.md', '# TOOLS\n');
    expect(invalidator.size).toBe(1);

    invalidator.remove('.claws/compiled/TOOLS.md.json');
    expect(invalidator.size).toBe(0);
  });

  it('clear() removes all tracked artifacts', () => {
    invalidator.track('.claws/compiled/TOOLS.md.json', 'TOOLS.md', '# TOOLS\n');
    invalidator.track('.claws/compiled/SOUL.md.json', 'SOUL.md', '# SOUL\n');
    expect(invalidator.size).toBe(2);

    invalidator.clear();
    expect(invalidator.size).toBe(0);
  });

  it('getArtifactsForSource returns empty for unknown source', () => {
    expect(invalidator.getArtifactsForSource('unknown.md')).toHaveLength(0);
  });

  it('trackWithHash registers artifact with pre-computed hash', () => {
    const precomputedHash = hashContent('# TOOLS\nContent\n');
    invalidator.trackWithHash('.claws/compiled/TOOLS.md.json', 'TOOLS.md', precomputedHash);

    expect(invalidator.size).toBe(1);

    // Same content → valid
    const result = invalidator.check(new Map([['TOOLS.md', '# TOOLS\nContent\n']]));
    expect(result.staleArtifacts).toHaveLength(0);
    expect(result.validArtifacts).toHaveLength(1);
  });

  it('check with changed file not matching any tracked artifact', () => {
    invalidator.track('.claws/compiled/SOUL.md.json', 'SOUL.md', '# SOUL\n');

    // TOOLS.md changed but no artifact tracks it
    const result = invalidator.check(new Map([['TOOLS.md', '# TOOLS\nNew\n']]));
    expect(result.staleArtifacts).toHaveLength(0);
    expect(result.validArtifacts).toHaveLength(1);
    expect(result.changedSources).toHaveLength(0);
  });

  it('check with empty changedFiles map returns all valid', () => {
    invalidator.track('.claws/compiled/TOOLS.md.json', 'TOOLS.md', '# TOOLS\n');

    const result = invalidator.check(new Map());
    expect(result.staleArtifacts).toHaveLength(0);
    expect(result.validArtifacts).toHaveLength(1);
    expect(result.changedSources).toHaveLength(0);
  });

  it('updateSource only updates artifacts matching the source path', () => {
    invalidator.track('.claws/compiled/TOOLS.md.json', 'TOOLS.md', '# TOOLS\nV1\n');
    invalidator.track('.claws/compiled/SOUL.md.json', 'SOUL.md', '# SOUL\nV1\n');

    // Update only TOOLS.md source
    invalidator.updateSource('TOOLS.md', '# TOOLS\nV2\n');

    // TOOLS.md artifact should now be valid against V2 content
    const result1 = invalidator.check(new Map([['TOOLS.md', '# TOOLS\nV2\n']]));
    expect(result1.staleArtifacts).toHaveLength(0);

    // SOUL.md artifact should still be valid against V1 content
    const result2 = invalidator.check(new Map([['SOUL.md', '# SOUL\nV1\n']]));
    expect(result2.staleArtifacts).toHaveLength(0);

    // SOUL.md artifact should be stale against V2 content
    const result3 = invalidator.check(new Map([['SOUL.md', '# SOUL\nV2\n']]));
    expect(result3.staleArtifacts).toHaveLength(1);
    expect(result3.staleArtifacts[0]).toBe('.claws/compiled/SOUL.md.json');
  });
});

// ── Violation diff ──────────────────────────────────────────────────────

describe('diffViolations', () => {
  const makeViolation = (ruleId: string, target: string, message: string): GovViolation => ({
    ruleId,
    level: 3,
    message,
    target,
    diagnosticCode: `CLAWS-${ruleId}`,
    fixSuggestions: [],
    toolFuzzyMatches: [],
  });

  it('identifies new violations', () => {
    const prev: GovViolation[] = [];
    const curr = [makeViolation('G-CLASS-01', 'deploy', 'Unclassified tool')];

    const diff = diffViolations(prev, curr);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]!.ruleId).toBe('G-CLASS-01');
    expect(diff.resolved).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
    expect(diff.totalCount).toBe(1);
    expect(diff.delta).toBe(1);
  });

  it('identifies resolved violations', () => {
    const prev = [makeViolation('G-CLASS-01', 'deploy', 'Unclassified tool')];
    const curr: GovViolation[] = [];

    const diff = diffViolations(prev, curr);

    expect(diff.resolved).toHaveLength(1);
    expect(diff.resolved[0]!.ruleId).toBe('G-CLASS-01');
    expect(diff.added).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
    expect(diff.totalCount).toBe(0);
    expect(diff.delta).toBe(-1);
  });

  it('identifies unchanged violations', () => {
    const v = makeViolation('G-CLASS-01', 'deploy', 'Unclassified tool');

    const diff = diffViolations([v], [v]);

    expect(diff.unchanged).toHaveLength(1);
    expect(diff.added).toHaveLength(0);
    expect(diff.resolved).toHaveLength(0);
    expect(diff.totalCount).toBe(1);
    expect(diff.delta).toBe(0);
  });

  it('handles mixed new, resolved, and unchanged', () => {
    const v1 = makeViolation('G-CLASS-01', 'deploy', 'Unclassified');
    const v2 = makeViolation('G-PERM-01', 'read_file', 'Missing perm');
    const v3 = makeViolation('G-DATA-01', 'store', 'Data leak');

    const prev = [v1, v2]; // v1 unchanged, v2 resolved
    const curr = [v1, v3]; // v1 unchanged, v3 added

    const diff = diffViolations(prev, curr);

    expect(diff.unchanged).toHaveLength(1);
    expect(diff.added).toHaveLength(1);
    expect(diff.resolved).toHaveLength(1);
    expect(diff.totalCount).toBe(2);
    expect(diff.delta).toBe(0);
  });

  it('empty-to-empty produces no changes', () => {
    const diff = diffViolations([], []);

    expect(diff.added).toHaveLength(0);
    expect(diff.resolved).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
    expect(diff.totalCount).toBe(0);
    expect(diff.delta).toBe(0);
  });
});

// ── AutoRecompiler ──────────────────────────────────────────────────────

describe('AutoRecompiler', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claws-recomp-unit-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('hasCompiledDir returns false when no compiled dir', async () => {
    const recompiler = new AutoRecompiler(testDir);
    expect(await recompiler.hasCompiledDir()).toBe(false);
  });

  it('hasCompiledDir returns true when compiled dir exists', async () => {
    await mkdir(join(testDir, '.claws/compiled'), { recursive: true });
    const recompiler = new AutoRecompiler(testDir);
    expect(await recompiler.hasCompiledDir()).toBe(true);
  });

  it('recompile returns triggered=false when no compiled dir', async () => {
    const recompiler = new AutoRecompiler(testDir);
    const result = await recompiler.recompile(['TOOLS.md']);

    expect(result.triggered).toBe(false);
    expect(result.compiledDirExists).toBe(false);
    expect(result.recompiledCount).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('trackArtifact registers artifact for invalidation', async () => {
    await mkdir(join(testDir, '.claws/compiled'), { recursive: true });
    const recompiler = new AutoRecompiler(testDir);

    recompiler.trackArtifact('.claws/compiled/TOOLS.md.json', 'TOOLS.md', '# TOOLS\n');
    expect(recompiler.trackedCount).toBe(1);
  });

  it('reset clears all state', async () => {
    const recompiler = new AutoRecompiler(testDir);
    recompiler.trackArtifact('.claws/compiled/TOOLS.md.json', 'TOOLS.md', '# TOOLS\n');
    expect(recompiler.trackedCount).toBe(1);

    recompiler.reset();
    expect(recompiler.trackedCount).toBe(0);
  });

  it('recompile handles deleted source file', async () => {
    const compiledDir = join(testDir, '.claws/compiled');
    await mkdir(compiledDir, { recursive: true });

    // Create source and artifact
    await writeFile(join(testDir, 'TOOLS.md'), '# TOOLS\nOriginal\n', 'utf-8');
    await writeFile(join(compiledDir, 'TOOLS.md.json'), JSON.stringify({
      source: 'TOOLS.md',
      contentHash: hashContent('# TOOLS\nOriginal\n'),
      compiledAt: new Date().toISOString(),
    }, null, 2), 'utf-8');

    const recompiler = new AutoRecompiler(testDir);

    // Delete source file
    await rm(join(testDir, 'TOOLS.md'));

    // Recompile should handle deleted file (empty content forces invalidation)
    const result = await recompiler.recompile(['TOOLS.md']);
    expect(result.triggered).toBe(true);
    expect(result.recompiledCount).toBe(1);
  });

  it('initialize reads artifact JSON to seed invalidator', async () => {
    const compiledDir = join(testDir, '.claws/compiled');
    await mkdir(compiledDir, { recursive: true });

    // Write source
    const content = '# TOOLS\nContent\n';
    await writeFile(join(testDir, 'TOOLS.md'), content, 'utf-8');

    // Write artifact with known hash
    await writeFile(join(compiledDir, 'TOOLS.md.json'), JSON.stringify({
      source: 'TOOLS.md',
      contentHash: hashContent(content),
      compiledAt: new Date().toISOString(),
    }, null, 2), 'utf-8');

    const recompiler = new AutoRecompiler(testDir);

    // Recompile with unchanged content → should not trigger
    const result = await recompiler.recompile(['TOOLS.md']);
    expect(result.triggered).toBe(false);
    expect(result.compiledDirExists).toBe(true);
  });

  it('initialize handles artifact with no contentHash field', async () => {
    const compiledDir = join(testDir, '.claws/compiled');
    await mkdir(compiledDir, { recursive: true });

    // Write artifact without contentHash
    await writeFile(join(compiledDir, 'TOOLS.md.json'), JSON.stringify({
      source: 'TOOLS.md',
      compiledAt: new Date().toISOString(),
    }, null, 2), 'utf-8');

    await writeFile(join(testDir, 'TOOLS.md'), '# TOOLS\n', 'utf-8');

    const recompiler = new AutoRecompiler(testDir);
    // Should still recompile because tracked with empty hash
    const result = await recompiler.recompile(['TOOLS.md']);
    expect(result.triggered).toBe(true);
  });

  it('initialize handles non-JSON artifact file gracefully', async () => {
    const compiledDir = join(testDir, '.claws/compiled');
    await mkdir(compiledDir, { recursive: true });

    // Write invalid JSON
    await writeFile(join(compiledDir, 'TOOLS.md.json'), 'not json', 'utf-8');
    await writeFile(join(testDir, 'TOOLS.md'), '# TOOLS\n', 'utf-8');

    const recompiler = new AutoRecompiler(testDir);
    // Should track with empty hash and trigger recompile
    const result = await recompiler.recompile(['TOOLS.md']);
    expect(result.triggered).toBe(true);
  });

  it('lazy init on first recompile when not previously initialized', async () => {
    const compiledDir = join(testDir, '.claws/compiled');
    await mkdir(compiledDir, { recursive: true });

    const content = '# SOUL\nOriginal\n';
    await writeFile(join(testDir, 'SOUL.md'), content, 'utf-8');
    await writeFile(join(compiledDir, 'SOUL.md.json'), JSON.stringify({
      source: 'SOUL.md',
      contentHash: hashContent(content),
      compiledAt: new Date().toISOString(),
    }, null, 2), 'utf-8');

    const recompiler = new AutoRecompiler(testDir);
    // initialized is false — first recompile triggers lazy init
    const result = await recompiler.recompile(['SOUL.md']);
    expect(result.compiledDirExists).toBe(true);
    // Content unchanged → no recompile
    expect(result.triggered).toBe(false);

    // Second recompile with changed content → triggers
    await writeFile(join(testDir, 'SOUL.md'), '# SOUL\nChanged\n', 'utf-8');
    const result2 = await recompiler.recompile(['SOUL.md']);
    expect(result2.triggered).toBe(true);
    expect(result2.recompiledCount).toBe(1);
  });

  it('uses empty string for source content not in changedFiles', async () => {
    const compiledDir = join(testDir, '.claws/compiled');
    await mkdir(compiledDir, { recursive: true });

    const recompiler = new AutoRecompiler(testDir);

    // Manually track an artifact whose source is 'PHANTOM.md'
    recompiler.trackArtifact('.claws/compiled/PHANTOM.md.json', 'PHANTOM.md', '# OLD\n');

    // Write the compiled dir artifact
    await writeFile(join(compiledDir, 'PHANTOM.md.json'), JSON.stringify({
      source: 'PHANTOM.md',
      contentHash: hashContent('# OLD\n'),
      compiledAt: new Date().toISOString(),
    }, null, 2), 'utf-8');

    // Recompile with PHANTOM.md as a changed file but don't create the file
    // (it doesn't exist → readFile throws → contentMap gets '' from catch)
    const result = await recompiler.recompile(['PHANTOM.md']);
    expect(result.triggered).toBe(true);
    expect(result.recompiledCount).toBe(1);
    expect(result.recompiledArtifacts).toContain('.claws/compiled/PHANTOM.md.json');
  });

  it('skips non-.json files in compiled directory', async () => {
    const compiledDir = join(testDir, '.claws/compiled');
    await mkdir(compiledDir, { recursive: true });

    // Write a non-json file
    await writeFile(join(compiledDir, 'readme.txt'), 'not an artifact', 'utf-8');
    await writeFile(join(testDir, 'TOOLS.md'), '# TOOLS\n', 'utf-8');

    const recompiler = new AutoRecompiler(testDir);
    const result = await recompiler.recompile(['TOOLS.md']);
    // No artifacts tracked → no recompile
    expect(result.triggered).toBe(false);
    expect(result.compiledDirExists).toBe(true);
  });
});
