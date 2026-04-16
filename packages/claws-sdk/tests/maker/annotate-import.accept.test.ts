/**
 * L3 SDK acceptance test for maker annotate + import.
 *
 * P28: Consumer annotates an ungoverned skill, verifies OBO detection,
 * risk inference, and data labels; imports legacy skill and verifies
 * .claws/ structure without original file modification.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm, cp, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

import {
  makerAnnotate,
  detectOboCapabilities,
  inferRiskLevel,
  suggestDataLabels,
  makerImport,
} from '@bic/claws-sdk/maker';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'ungoverned-skill');

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-accept-annotate-import-'));
  await cp(FIXTURE_DIR, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

describe('SDK acceptance: annotate OBO/risk/labels + import lossless', () => {
  it('full consumer workflow: annotate -> verify -> import -> verify lossless', async () => {
    // Snapshot originals
    const origSkillMd = await readFile(join(tempDir, 'SKILL.md'), 'utf-8');
    const origHandler = await readFile(join(tempDir, 'handler.ts'), 'utf-8');
    const origSkillHash = sha256(origSkillMd);
    const origHandlerHash = sha256(origHandler);

    // ── Phase 1: Annotate ───────────────────────────────────────────
    const annotateResult = await makerAnnotate({ skillDir: tempDir });

    // Name
    expect(annotateResult.name).toBe('send-invoice');

    // OBO detection: email type
    expect(annotateResult.oboFindings.length).toBeGreaterThan(0);
    expect(annotateResult.oboFindings.some(f => f.type === 'email')).toBe(true);

    // Risk inference: R2+ (send-email + fetch + readFile)
    expect(annotateResult.inferredRisk).toBeGreaterThanOrEqual(2);

    // Data labels: should include PII-related and communication
    expect(annotateResult.dataLabels.length).toBeGreaterThan(0);

    // Decorator suggestions: @Risk and @Obo
    expect(annotateResult.decorators.some(d => d.decorator === '@Risk')).toBe(true);
    expect(annotateResult.decorators.some(d => d.decorator === '@Obo')).toBe(true);

    // Collect-all-errors: diagnostics from multiple sources
    const diagSources = new Set(annotateResult.diagnostics.map(d => d.source));
    expect(diagSources.size).toBeGreaterThanOrEqual(3);

    // Suggestions complete
    expect(annotateResult.suggestions.some(s => s.type === 'obo')).toBe(true);
    expect(annotateResult.suggestions.some(s => s.type === 'risk')).toBe(true);
    expect(annotateResult.suggestions.some(s => s.type === 'tier')).toBe(true);

    // Tier: TYPED (has handler)
    expect(annotateResult.suggestedTier).toBe('TYPED');

    // ── Phase 2: Import ─────────────────────────────────────────────
    const importResult = await makerImport({ skillDir: tempDir });

    // .claws/ created with 3 files
    const clawsDir = join(tempDir, '.claws');
    expect((await stat(clawsDir)).isDirectory()).toBe(true);
    expect(importResult.createdFiles).toHaveLength(3);

    // governance.yaml has OBO and risk
    const governance = await readFile(join(clawsDir, 'governance.yaml'), 'utf-8');
    expect(governance).toContain('name: send-invoice');
    expect(governance).toContain('obo: true');
    expect(governance).toContain('risk: R');

    // manifest.yaml tracks original hashes
    const manifest = await readFile(join(clawsDir, 'manifest.yaml'), 'utf-8');
    expect(manifest).toContain(origSkillHash);
    expect(manifest).toContain(origHandlerHash);

    // decorators.ts has suggestions
    const decorators = await readFile(join(clawsDir, 'decorators.ts'), 'utf-8');
    expect(decorators).toContain('@Risk');
    expect(decorators).toContain('@Obo');

    // ── Phase 3: Lossless Verification ──────────────────────────────
    // Original files byte-identical
    expect(sha256(await readFile(join(tempDir, 'SKILL.md'), 'utf-8'))).toBe(origSkillHash);
    expect(sha256(await readFile(join(tempDir, 'handler.ts'), 'utf-8'))).toBe(origHandlerHash);

    // Only .claws/ was added
    const entries = await readdir(tempDir);
    const nonOriginal = entries.filter(e => e === '.claws');
    expect(nonOriginal).toHaveLength(1);

    // ── Performance ─────────────────────────────────────────────────
    expect(annotateResult.durationMs).toBeLessThan(2000);
    expect(importResult.durationMs).toBeLessThan(5000);
  });

  it('standalone API functions work correctly for SDK consumers', () => {
    // detectOboCapabilities
    const oboFindings = detectOboCapabilities('send-email tool with post-message support');
    expect(oboFindings.some(f => f.type === 'email')).toBe(true);
    expect(oboFindings.some(f => f.type === 'social')).toBe(true);

    // inferRiskLevel
    expect(inferRiskLevel('send-email to external users')).toBeGreaterThanOrEqual(2);
    expect(inferRiskLevel('search documents')).toBe(1);

    // suggestDataLabels
    const labels = suggestDataLabels('handles PII and credit-card data');
    expect(labels.some(l => l.label === 'pii')).toBe(true);
    expect(labels.some(l => l.label === 'financial')).toBe(true);
  });
});
