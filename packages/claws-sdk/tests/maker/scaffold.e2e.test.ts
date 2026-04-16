/**
 * L2 e2e test for maker scaffold engine.
 *
 * P27: scaffold communication template, verify all files present, pinch-clean.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { makerScaffold } from '@bic/claws-sdk/maker';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-maker-e2e-'));
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

describe('maker scaffold e2e', () => {
  it('scaffold communication template end-to-end: all files present, pinch-clean', async () => {
    await writeConfig(tempDir, 3);

    const result = await makerScaffold({
      name: 'notify-user',
      template: 'communication',
      workspaceRoot: tempDir,
    });

    // Verify result shape
    expect(result.name).toBe('notify-user');
    expect(result.template).toBe('communication');
    expect(result.risk).toBe(3);
    expect(result.tier).toBe('TYPED');
    expect(result.obo).toBe(true);
    expect(result.trustTier).toBe(3);
    expect(result.durationMs).toBeLessThan(2000);

    // All 7 expected files (includes handler.test.ts from CM-07)
    const expectedFiles = [
      'SKILL.md',
      'handler.ts',
      'handler.test.ts',
      'package.json',
      'vitest.config.ts',
      '.claws-manifest',
      '.gitignore',
    ];
    for (const f of expectedFiles) {
      expect(result.files).toContain(f);
    }

    // Verify files exist on disk and are non-empty
    const entries = await readdir(result.skillDir);
    expect(entries.sort()).toEqual(expectedFiles.sort());

    for (const f of expectedFiles) {
      const s = await stat(join(result.skillDir, f));
      expect(s.size).toBeGreaterThan(0);
    }

    // Pinch-clean validation:
    // 1. SKILL.md has valid YAML frontmatter (---...---)
    const skillMd = await readFile(join(result.skillDir, 'SKILL.md'), 'utf-8');
    expect(skillMd).toMatch(/^---\n/);
    expect(skillMd).toMatch(/\n---\n/);

    // 2. SKILL.md frontmatter contains all required governance fields
    expect(skillMd).toContain('name: notify-user');
    expect(skillMd).toContain('template: communication');
    expect(skillMd).toContain('tier: TYPED');
    expect(skillMd).toContain('risk: 3');
    expect(skillMd).toContain('trust_tier: 3');
    expect(skillMd).toContain('obo: true');
    expect(skillMd).toContain('obo_scope:');
    expect(skillMd).toContain('data_labels:');

    // 3. handler.ts is syntactically valid (matching braces)
    const handler = await readFile(join(result.skillDir, 'handler.ts'), 'utf-8');
    const opens = (handler.match(/{/g) ?? []).length;
    const closes = (handler.match(/}/g) ?? []).length;
    expect(opens).toBe(closes);

    // 4. handler.ts has governance decorators
    expect(handler).toContain('@Obo()');
    expect(handler).toContain('@Risk(');
    expect(handler).toContain('export async function handler(');

    // 5. package.json is valid JSON
    const pkgRaw = await readFile(join(result.skillDir, 'package.json'), 'utf-8');
    expect(() => JSON.parse(pkgRaw)).not.toThrow();

    // 6. .gitignore includes .claws/
    const gitignore = await readFile(join(result.skillDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claws/');

    // 7. .claws-manifest references skill name
    const manifest = await readFile(join(result.skillDir, '.claws-manifest'), 'utf-8');
    expect(manifest).toContain('skill: notify-user');
  });
});
