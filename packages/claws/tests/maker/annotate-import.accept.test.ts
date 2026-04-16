/**
 * L3 CLI acceptance test for maker annotate + import.
 *
 * P28: `claws maker annotate` and `claws maker import` on ungoverned
 * fixture produce correct governance output with collect-all-errors reporting.
 *
 * Tests the SDK directly (no CLI binary) since the maker CLI command
 * surface is being built in a later pulse. Validates that the SDK
 * produces correct output for CLI rendering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm, cp, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

import {
  makerAnnotate,
  makerImport,
} from '@bic/claws-sdk/maker';

const FIXTURE_DIR = join(__dirname, '../../../claws-sdk/tests/fixtures/ungoverned-skill');

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-accept-annotate-'));
  await cp(FIXTURE_DIR, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

describe('CLI acceptance: claws maker annotate + import', () => {
  it('annotate produces renderable output with collect-all-errors reporting', async () => {
    const result = await makerAnnotate({ skillDir: tempDir });

    // CLI would render: skill name
    expect(result.name).toBe('send-invoice');

    // CLI would render: OBO findings table
    expect(result.oboFindings.length).toBeGreaterThan(0);
    for (const finding of result.oboFindings) {
      expect(finding.type).toBeTruthy();
      expect(finding.pattern).toBeTruthy();
      expect(finding.confidence).toBeGreaterThan(0);
      expect(finding.confidence).toBeLessThanOrEqual(1);
    }

    // CLI would render: risk badge
    expect(result.inferredRisk).toBeGreaterThanOrEqual(1);
    expect(result.inferredRisk).toBeLessThanOrEqual(5);

    // CLI would render: data labels list
    for (const label of result.dataLabels) {
      expect(label.label).toBeTruthy();
      expect(label.reason).toBeTruthy();
      expect(label.confidence).toBeGreaterThan(0);
    }

    // CLI would render: suggestions list (collect-all-errors)
    expect(result.suggestions.length).toBeGreaterThanOrEqual(2);
    for (const s of result.suggestions) {
      expect(['obo', 'risk', 'data-label', 'tier']).toContain(s.type);
      expect(s.message).toBeTruthy();
      expect(s.confidence).toBeGreaterThan(0);
    }

    // CLI would render: diagnostics panel (all errors collected)
    expect(result.diagnostics.length).toBeGreaterThan(0);
    for (const d of result.diagnostics) {
      expect(['info', 'warning', 'error']).toContain(d.severity);
      expect(d.message).toBeTruthy();
      expect(['obo', 'risk', 'data-label', 'tier', 'decorator']).toContain(d.source);
    }

    // CLI would render: decorator suggestions
    expect(result.decorators.length).toBeGreaterThan(0);
    for (const dec of result.decorators) {
      expect(dec.decorator).toMatch(/^@/);
    }
  });

  it('import produces renderable output with lossless verification', async () => {
    const origSkillHash = sha256(await readFile(join(tempDir, 'SKILL.md'), 'utf-8'));
    const origHandlerHash = sha256(await readFile(join(tempDir, 'handler.ts'), 'utf-8'));

    const result = await makerImport({ skillDir: tempDir });

    // CLI would render: skill name
    expect(result.name).toBe('send-invoice');

    // CLI would render: created files list
    expect(result.createdFiles).toHaveLength(3);
    expect(result.createdFiles).toContain('.claws/governance.yaml');
    expect(result.createdFiles).toContain('.claws/manifest.yaml');
    expect(result.createdFiles).toContain('.claws/decorators.ts');

    // CLI would render: original files (untouched)
    expect(result.originalFiles).toContain('SKILL.md');
    expect(result.originalFiles).toContain('handler.ts');

    // CLI would render: manifest entries with hashes
    expect(result.manifest.length).toBeGreaterThan(0);
    for (const entry of result.manifest) {
      expect(entry.path).toBeTruthy();
      expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(['skill-md', 'handler', 'config', 'other']).toContain(entry.role);
    }

    // CLI would render: governance tier
    expect(['DECLARED', 'TYPED', 'VERIFIED']).toContain(result.tier);

    // CLI would render: duration
    expect(result.durationMs).toBeGreaterThan(0);

    // Lossless verification (CLI would diff original vs post-import)
    expect(sha256(await readFile(join(tempDir, 'SKILL.md'), 'utf-8'))).toBe(origSkillHash);
    expect(sha256(await readFile(join(tempDir, 'handler.ts'), 'utf-8'))).toBe(origHandlerHash);

    // Files on disk match result
    const clawsEntries = await readdir(join(tempDir, '.claws'));
    expect(clawsEntries.sort()).toEqual(['decorators.ts', 'governance.yaml', 'manifest.yaml']);
  });
});
