/**
 * L1 integration tests for maker import engine.
 *
 * P28: import legacy skill creates complete governance structure,
 * import legacy skill -> annotate -> verify governance structure complete.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm, cp, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

import { makerImport } from '../../src/maker/import.js';
import { makerAnnotate } from '../../src/maker/annotate.js';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'ungoverned-skill');

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-import-int-'));
  await cp(FIXTURE_DIR, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

describe('import legacy skill creates complete governance structure', () => {
  it('produces .claws/ with governance.yaml reflecting annotate analysis', async () => {
    const result = await makerImport({ skillDir: tempDir });

    // .claws/ directory exists
    const clawsDir = join(tempDir, '.claws');
    const clawsStat = await stat(clawsDir);
    expect(clawsStat.isDirectory()).toBe(true);

    // governance.yaml has correct skill name
    const governance = await readFile(join(clawsDir, 'governance.yaml'), 'utf-8');
    expect(governance).toContain('name: send-invoice');

    // governance.yaml reflects annotate results
    expect(governance).toContain('risk: R');
    expect(governance).toContain('tier:');

    // OBO should be detected (send-email in fixture)
    expect(governance).toContain('obo: true');
    expect(governance).toContain('obo_capabilities:');

    // manifest.yaml has file hashes for drift detection
    const manifest = await readFile(join(clawsDir, 'manifest.yaml'), 'utf-8');
    expect(manifest).toContain('skill: send-invoice');
    expect(manifest).toContain('imported_at:');
    expect(manifest).toContain('hash:');

    // Verify SKILL.md hash in manifest matches actual file
    const skillMdContent = await readFile(join(tempDir, 'SKILL.md'), 'utf-8');
    const expectedHash = sha256(skillMdContent);
    expect(manifest).toContain(expectedHash);

    // decorators.ts has decorator suggestions
    const decorators = await readFile(join(clawsDir, 'decorators.ts'), 'utf-8');
    expect(decorators).toContain('@Risk');
    expect(decorators).toContain('@Obo');

    // Result includes annotate result
    expect(result.annotateResult).toBeDefined();
    expect(result.annotateResult.name).toBe('send-invoice');
    expect(result.annotateResult.oboFindings.length).toBeGreaterThan(0);

    // Tier is TYPED (has handler)
    expect(result.tier).toBe('TYPED');

    // Duration tracked
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.durationMs).toBeLessThan(5000);
  });

  it('respects tier override', async () => {
    const result = await makerImport({
      skillDir: tempDir,
      tierOverride: 'VERIFIED',
    });

    expect(result.tier).toBe('VERIFIED');
    const governance = await readFile(join(result.clawsDir, 'governance.yaml'), 'utf-8');
    expect(governance).toContain('tier: VERIFIED');
  });

  it('creates governance for prompt-only skill (no handler) with DECLARED tier', async () => {
    // Create a prompt-only skill (no handler.ts)
    const promptDir = await mkdtemp(join(tmpdir(), 'claws-import-prompt-'));
    try {
      await writeFile(join(promptDir, 'SKILL.md'), [
        '---',
        'name: summarize-text',
        'description: Summarize text using LLM',
        '---',
        '',
        '# Summarize Text',
        '',
        'A prompt-only skill.',
      ].join('\n'), 'utf-8');

      const result = await makerImport({ skillDir: promptDir });

      // Should be capped at DECLARED (S02-F01)
      expect(result.tier).toBe('DECLARED');
      expect(result.annotateResult.suggestedTier).toBe('DECLARED');

      const governance = await readFile(join(result.clawsDir, 'governance.yaml'), 'utf-8');
      expect(governance).toContain('tier: DECLARED');
    } finally {
      await rm(promptDir, { recursive: true, force: true });
    }
  });
});

describe('import -> annotate -> verify governance structure complete', () => {
  it('post-import annotate produces consistent results with governance files', async () => {
    // Step 1: Import the legacy skill
    const importResult = await makerImport({ skillDir: tempDir });

    // Step 2: Re-annotate the same skill directory
    const annotateResult = await makerAnnotate({ skillDir: tempDir });

    // Annotate results should be consistent with import governance
    expect(annotateResult.name).toBe(importResult.name);
    expect(annotateResult.inferredRisk).toBe(importResult.annotateResult.inferredRisk);
    expect(annotateResult.suggestedTier).toBe(importResult.annotateResult.suggestedTier);

    // OBO findings should match
    expect(annotateResult.oboFindings.length).toBe(importResult.annotateResult.oboFindings.length);

    // Original files are still untouched
    const beforeHash = importResult.manifest.find(m => m.path === 'SKILL.md')!.hash;
    const currentContent = await readFile(join(tempDir, 'SKILL.md'), 'utf-8');
    expect(sha256(currentContent)).toBe(beforeHash);

    // .claws/ directory still intact
    const clawsEntries = await readdir(join(tempDir, '.claws'));
    expect(clawsEntries.sort()).toEqual(['decorators.ts', 'governance.yaml', 'manifest.yaml']);
  });
});
