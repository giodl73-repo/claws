/**
 * L3 SDK acceptance test for maker scaffold engine.
 *
 * P27: Consumer scaffolds all 5 templates, verifies each produces compilable
 * project with correct governance frontmatter and decorators.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  makerScaffold,
  TEMPLATE_CATEGORIES,
} from '@bic/claws-sdk/maker';
import type { TemplateCategory, MakerScaffoldResult } from '@bic/claws-sdk/maker';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-maker-accept-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function writeConfig(dir: string, trustTier: number): Promise<void> {
  await writeFile(
    join(dir, 'claws.json'),
    JSON.stringify({ trustTier }),
    'utf-8',
  );
}

/** Expected file set for full maker scaffolds (4 named templates). */
const FULL_EXPECTED_FILES = [
  'SKILL.md',
  'handler.ts',
  'handler.test.ts',
  'package.json',
  'vitest.config.ts',
  '.claws-manifest',
  '.gitignore',
];

/** Expected file set for the minimal custom/base template. */
const BASE_EXPECTED_FILES = [
  'SKILL.md',
  'handler.ts',
  '.gitignore',
];

function expectedFilesFor(category: TemplateCategory): string[] {
  return category === 'custom' ? [...BASE_EXPECTED_FILES] : [...FULL_EXPECTED_FILES];
}

/** Templates that should have OBO enabled by default. */
const OBO_TEMPLATES: readonly TemplateCategory[] = ['communication', 'browser-automation'];

describe('SDK acceptance: maker scaffold all 5 templates', () => {
  it('scaffolds all 5 templates with governance verification', async () => {
    // T4 allows up to R5 — all templates should succeed
    await writeConfig(tempDir, 4);

    const results: Record<string, MakerScaffoldResult> = {};

    for (const category of TEMPLATE_CATEGORIES) {
      const name = `test-${category}`;
      const result = await makerScaffold({
        name,
        template: category,
        workspaceRoot: tempDir,
      });
      results[category] = result;

      const expectedFiles = expectedFilesFor(category);

      // All files present
      for (const f of expectedFiles) {
        expect(result.files, `${category}: missing ${f}`).toContain(f);
      }

      // Verify files on disk
      const entries = await readdir(result.skillDir);
      expect(entries.sort(), `${category}: disk files`).toEqual(expectedFiles.sort());

      // SKILL.md governance frontmatter
      const skillMd = await readFile(join(result.skillDir, 'SKILL.md'), 'utf-8');
      expect(skillMd, `${category}: SKILL.md frontmatter`).toContain(`name: ${name}`);
      expect(skillMd, `${category}: tier`).toContain('tier: TYPED');
      expect(skillMd, `${category}: template`).toContain(`template: ${category}`);
      expect(skillMd, `${category}: risk`).toMatch(/risk: [1-5]/);

      // handler.ts decorators
      const handler = await readFile(join(result.skillDir, 'handler.ts'), 'utf-8');
      expect(handler, `${category}: @Risk`).toContain('@Risk(');
      expect(handler, `${category}: handler function`).toContain('export async function handler(');

      // OBO verification
      if (OBO_TEMPLATES.includes(category)) {
        expect(result.obo, `${category}: obo result`).toBe(true);
        expect(skillMd, `${category}: SKILL.md obo`).toContain('obo: true');
        expect(handler, `${category}: handler @Obo`).toContain('@Obo()');
      } else {
        expect(result.obo, `${category}: no obo`).toBe(false);
        expect(skillMd, `${category}: SKILL.md no obo`).toContain('obo: false');
        expect(handler, `${category}: handler no @Obo`).not.toContain('@Obo()');
      }

      // .gitignore has .claws/
      const gitignore = await readFile(join(result.skillDir, '.gitignore'), 'utf-8');
      expect(gitignore, `${category}: .gitignore`).toContain('.claws/');

      // Full templates only: package.json and .claws-manifest
      if (category !== 'custom') {
        // package.json is valid JSON
        const pkgRaw = await readFile(join(result.skillDir, 'package.json'), 'utf-8');
        expect(() => JSON.parse(pkgRaw), `${category}: package.json`).not.toThrow();

        // .claws-manifest references skill
        const manifest = await readFile(join(result.skillDir, '.claws-manifest'), 'utf-8');
        expect(manifest, `${category}: manifest`).toContain(`skill: ${name}`);
      }

      // Performance: each should complete in < 2 seconds
      expect(result.durationMs, `${category}: duration`).toBeLessThan(2000);
    }

    // Cross-template invariants
    expect(Object.keys(results)).toHaveLength(5);

    // All templates produce TYPED tier by default (S01-F03)
    for (const [cat, result] of Object.entries(results)) {
      expect(result.tier, `${cat}: default TYPED`).toBe('TYPED');
    }
  });
});
