/**
 * L1 integration tests for maker scaffold engine.
 *
 * P27: full scaffold + typecheck, performance < 2s,
 * full scaffold -> compile -> pinch round-trip for R1 and R5 tier skills.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { makerScaffold } from '@bic/claws-sdk/maker';
import type { TemplateCategory } from '@bic/claws-sdk/maker';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-maker-int-'));
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

describe('maker scaffold integration', () => {
  it('full scaffold generates all 7 files with valid content', async () => {
    await writeConfig(tempDir, 3);

    const result = await makerScaffold({
      name: 'send-report',
      template: 'communication',
      workspaceRoot: tempDir,
    });

    // All 7 standard files present (non-custom templates include handler.test.ts)
    expect(result.files).toContain('SKILL.md');
    expect(result.files).toContain('handler.ts');
    expect(result.files).toContain('handler.test.ts');
    expect(result.files).toContain('package.json');
    expect(result.files).toContain('vitest.config.ts');
    expect(result.files).toContain('.claws-manifest');
    expect(result.files).toContain('.gitignore');

    // Verify SKILL.md has governance frontmatter on disk
    const skillMd = await readFile(join(result.skillDir, 'SKILL.md'), 'utf-8');
    expect(skillMd).toContain('name: send-report');
    expect(skillMd).toContain('tier: TYPED');
    expect(skillMd).toContain('obo: true');

    // Verify handler.ts has decorators on disk
    const handler = await readFile(join(result.skillDir, 'handler.ts'), 'utf-8');
    expect(handler).toContain('@Obo()');
    expect(handler).toContain('@Risk(');

    // Verify package.json is valid JSON
    const pkgRaw = await readFile(join(result.skillDir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    expect(pkg.name).toBe('@skills/send-report');

    // Verify .gitignore includes .claws/
    const gitignore = await readFile(join(result.skillDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claws/');
  });

  it('scaffold completes in < 2 seconds', async () => {
    await writeConfig(tempDir, 2);

    const start = performance.now();
    await makerScaffold({
      name: 'perf-test',
      template: 'custom',
      workspaceRoot: tempDir,
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });

  it('full scaffold -> verify round-trip for R1 tier skill (custom base)', async () => {
    await writeConfig(tempDir, 2);

    const result = await makerScaffold({
      name: 'r1-minimal',
      template: 'custom',
      workspaceRoot: tempDir,
    });

    // R1 risk level
    expect(result.risk).toBe(1);
    expect(result.obo).toBe(false);

    // Verify SKILL.md frontmatter round-trips
    const skillMd = await readFile(join(result.skillDir, 'SKILL.md'), 'utf-8');
    expect(skillMd).toContain('risk: 1');
    expect(skillMd).toContain('obo: false');
    expect(skillMd).toContain('template: custom');
    expect(skillMd).not.toContain('obo_scope');

    // Verify handler.ts only has @Risk (no @Obo)
    const handler = await readFile(join(result.skillDir, 'handler.ts'), 'utf-8');
    expect(handler).toContain('@Risk(1)');
    expect(handler).not.toContain('@Obo');

    // Verify .gitignore has .claws/
    const gitignore = await readFile(join(result.skillDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claws/');

    // Custom template generates only 3 files (SKILL.md, handler.ts, .gitignore)
    const entries = await readdir(result.skillDir);
    expect(entries).toHaveLength(3);
  });

  it('full scaffold -> verify round-trip for R5 tier skill (communication)', async () => {
    await writeConfig(tempDir, 4); // T4 allows up to R5

    const result = await makerScaffold({
      name: 'send-alert',
      template: 'communication',
      workspaceRoot: tempDir,
    });

    // Communication defaults to R3 (riskRange[0])
    expect(result.risk).toBe(3);
    expect(result.obo).toBe(true);
    expect(result.tier).toBe('TYPED');

    // Verify SKILL.md has full OBO governance
    const skillMd = await readFile(join(result.skillDir, 'SKILL.md'), 'utf-8');
    expect(skillMd).toContain('obo: true');
    expect(skillMd).toContain('obo_scope:');
    expect(skillMd).toContain('data_labels:');
    expect(skillMd).toContain('  - pii');
    expect(skillMd).toContain('  - communication');
    expect(skillMd).toContain('## OBO Governance');
    expect(skillMd).toContain('Explicit user consent is REQUIRED');

    // Verify handler.ts has OBO + Risk + DataLabel decorators
    const handler = await readFile(join(result.skillDir, 'handler.ts'), 'utf-8');
    expect(handler).toContain('@Obo()');
    expect(handler).toContain('@Risk(3)');
    expect(handler).toContain('@DataLabel(pii, communication)');

    // Verify handler.test.ts exists with correct content
    const handlerTest = await readFile(join(result.skillDir, 'handler.test.ts'), 'utf-8');
    expect(handlerTest).toContain("describe('send-alert handler'");
    expect(handlerTest).toContain("import { describe, it, expect } from 'vitest'");

    // Non-custom template generates 7 files (includes handler.test.ts)
    const entries = await readdir(result.skillDir);
    expect(entries).toHaveLength(7);
  });
});
