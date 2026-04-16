/**
 * L3 CLI acceptance test for maker scaffold.
 *
 * P27: `claws maker scaffold` with each template flag produces complete
 * project directory with pinch-clean output.
 *
 * Tests the SDK directly (no CLI binary) since the maker CLI command
 * surface is being built in a later pulse. Validates that the SDK
 * produces correct output for each template category.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  makerScaffold,
  TEMPLATE_CATEGORIES,
} from '@bic/claws-sdk/maker';
import type { TemplateCategory } from '@bic/claws-sdk/maker';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-maker-accept-'));
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

const EXPECTED_FILES = [
  'SKILL.md',
  'handler.ts',
  'package.json',
  'vitest.config.ts',
  '.claws-manifest',
  '.gitignore',
];

describe('CLI acceptance: claws maker scaffold', () => {
  it('each template produces complete project directory with pinch-clean output', async () => {
    await writeConfig(tempDir, 4);

    for (const category of TEMPLATE_CATEGORIES) {
      const name = `cli-${category}`;
      const result = await makerScaffold({
        name,
        template: category,
        workspaceRoot: tempDir,
      });

      // Complete project directory
      const entries = await readdir(result.skillDir);
      expect(entries.sort(), `${category}: all files`).toEqual(EXPECTED_FILES.sort());

      // Pinch-clean validation: SKILL.md has valid frontmatter
      const skillMd = await readFile(join(result.skillDir, 'SKILL.md'), 'utf-8');
      expect(skillMd, `${category}: frontmatter start`).toMatch(/^---\n/);
      expect(skillMd, `${category}: frontmatter end`).toMatch(/\n---\n/);
      expect(skillMd, `${category}: name`).toContain(`name: ${name}`);
      expect(skillMd, `${category}: tier`).toContain('tier: TYPED');

      // Pinch-clean validation: handler.ts has balanced braces
      const handler = await readFile(join(result.skillDir, 'handler.ts'), 'utf-8');
      const opens = (handler.match(/{/g) ?? []).length;
      const closes = (handler.match(/}/g) ?? []).length;
      expect(opens, `${category}: balanced braces`).toBe(closes);

      // Pinch-clean validation: package.json is valid JSON
      const pkgRaw = await readFile(join(result.skillDir, 'package.json'), 'utf-8');
      expect(() => JSON.parse(pkgRaw), `${category}: valid JSON`).not.toThrow();

      // Pinch-clean validation: .gitignore includes .claws/
      const gitignore = await readFile(join(result.skillDir, '.gitignore'), 'utf-8');
      expect(gitignore, `${category}: .claws in gitignore`).toContain('.claws/');

      // Performance
      expect(result.durationMs, `${category}: < 2s`).toBeLessThan(2000);
    }
  });
});
