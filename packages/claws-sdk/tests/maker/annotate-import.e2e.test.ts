/**
 * L2 e2e test for maker annotate + import on ungoverned fixture skill.
 *
 * P28: full pipeline — annotate detects capabilities, import creates .claws/,
 * original files preserved, governance complete.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, readdir, rm, cp, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

import { makerAnnotate } from '../../src/maker/annotate.js';
import { makerImport } from '../../src/maker/import.js';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'ungoverned-skill');

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-e2e-annotate-import-'));
  await cp(FIXTURE_DIR, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

describe('annotate + import e2e on ungoverned fixture skill', () => {
  it('full pipeline: annotate -> import -> verify governance complete', async () => {
    // Snapshot original files before any operations
    const origSkillMd = await readFile(join(tempDir, 'SKILL.md'), 'utf-8');
    const origHandler = await readFile(join(tempDir, 'handler.ts'), 'utf-8');
    const origSkillMdHash = sha256(origSkillMd);
    const origHandlerHash = sha256(origHandler);
    const origEntries = (await readdir(tempDir)).sort();

    // Step 1: Annotate — analyze capabilities
    const annotateResult = await makerAnnotate({ skillDir: tempDir });

    // Annotate detects skill name
    expect(annotateResult.name).toBe('send-invoice');

    // Annotate detects OBO (send-email in fixture)
    expect(annotateResult.oboFindings.length).toBeGreaterThan(0);
    expect(annotateResult.oboFindings.some(f => f.type === 'email')).toBe(true);

    // Annotate infers risk >= R2 (send-email + fetch)
    expect(annotateResult.inferredRisk).toBeGreaterThanOrEqual(2);

    // Annotate suggests data labels (PII, financial from fixture content)
    expect(annotateResult.dataLabels.length).toBeGreaterThan(0);

    // Annotate produces decorator suggestions
    expect(annotateResult.decorators.length).toBeGreaterThan(0);
    expect(annotateResult.decorators.some(d => d.decorator === '@Risk')).toBe(true);
    expect(annotateResult.decorators.some(d => d.decorator === '@Obo')).toBe(true);

    // Annotate collects all diagnostics (no early exit)
    expect(annotateResult.diagnostics.length).toBeGreaterThan(3);

    // Annotate suggests TYPED tier (has handler)
    expect(annotateResult.suggestedTier).toBe('TYPED');

    // Step 2: Import — create .claws/ governance directory
    const importResult = await makerImport({ skillDir: tempDir });

    // Import creates .claws/ directory
    const clawsDir = join(tempDir, '.claws');
    const clawsStat = await stat(clawsDir);
    expect(clawsStat.isDirectory()).toBe(true);

    // All 3 governance files created
    expect(importResult.createdFiles).toHaveLength(3);
    expect(importResult.createdFiles).toContain('.claws/governance.yaml');
    expect(importResult.createdFiles).toContain('.claws/manifest.yaml');
    expect(importResult.createdFiles).toContain('.claws/decorators.ts');

    // governance.yaml reflects annotate results
    const governance = await readFile(join(clawsDir, 'governance.yaml'), 'utf-8');
    expect(governance).toContain('name: send-invoice');
    expect(governance).toContain('obo: true');
    expect(governance).toContain('risk: R');
    expect(governance).toContain('tier:');

    // manifest.yaml tracks original file hashes
    const manifest = await readFile(join(clawsDir, 'manifest.yaml'), 'utf-8');
    expect(manifest).toContain(origSkillMdHash);
    expect(manifest).toContain(origHandlerHash);

    // decorators.ts has suggestions
    const decorators = await readFile(join(clawsDir, 'decorators.ts'), 'utf-8');
    expect(decorators).toContain('@Risk');
    expect(decorators).toContain('@Obo');

    // Step 3: Verify lossless architecture — original files untouched
    const postSkillMd = await readFile(join(tempDir, 'SKILL.md'), 'utf-8');
    const postHandler = await readFile(join(tempDir, 'handler.ts'), 'utf-8');
    expect(sha256(postSkillMd)).toBe(origSkillMdHash);
    expect(sha256(postHandler)).toBe(origHandlerHash);

    // Only .claws/ was added
    const postEntries = (await readdir(tempDir)).sort();
    const addedEntries = postEntries.filter(e => !origEntries.includes(e));
    expect(addedEntries).toEqual(['.claws']);

    // Import result records all original files
    expect(importResult.originalFiles).toContain('SKILL.md');
    expect(importResult.originalFiles).toContain('handler.ts');

    // Performance check
    expect(importResult.durationMs).toBeLessThan(5000);
    expect(annotateResult.durationMs).toBeLessThan(2000);
  });
});
