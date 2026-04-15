/**
 * L1 integration tests for the scaffold orchestrator.
 *
 * P29: Basic scaffold integration
 * P32: OBO detection integration + .gitignore generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  scaffoldSkill,
  RiskCapExceededError,
} from '@bic/claws-sdk/scaffold';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-scaffold-int-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

/**
 * Write a claws.json with the given trust tier.
 */
async function writeConfig(dir: string, trustTier: number): Promise<void> {
  await writeFile(
    join(dir, 'claws.json'),
    JSON.stringify({ trustTier }),
    'utf-8',
  );
}

describe('scaffold orchestrator integration', () => {
  it('scaffold on T2 workspace caps generated skill at R3', async () => {
    await writeConfig(tempDir, 2);

    // declared tier (R1) should succeed on T2
    const result = await scaffoldSkill(tempDir, 'my-skill', { tier: 'declared' });
    expect(result.maxRisk).toBe(3);
    expect(result.skillRisk).toBe(1);
    expect(result.trustTier).toBe(2);

    // Verify files exist on disk
    const yamlPath = join(tempDir, 'skills', 'my-skill', 'skill.yaml');
    const content = await readFile(yamlPath, 'utf-8');
    expect(content).toContain('name: my-skill');
    expect(content).toContain('risk: 1');
    expect(content).toContain('description: my-skill skill');
  });

  it('dependency check emits install instruction when skill-kit absent', async () => {
    await writeConfig(tempDir, 2);

    // No node_modules/@bic/claws-skill-kit exists
    const result = await scaffoldSkill(tempDir, 'dep-test', { tier: 'declared' });
    expect(result.dependency.installed).toBe(false);
    expect(result.dependency.instruction).toContain('npm install @bic/claws-skill-kit');
  });

  it('typed tier (R2) succeeds on T2 workspace', async () => {
    await writeConfig(tempDir, 2);

    const result = await scaffoldSkill(tempDir, 'typed-skill', { tier: 'typed' });
    expect(result.tier).toBe('typed');
    expect(result.skillRisk).toBe(2);
    expect(result.files).toContain('skill.yaml');
    expect(result.files).toContain('handler.ts');
  });

  it('verified tier (R3) succeeds on T2 workspace', async () => {
    await writeConfig(tempDir, 2);

    const result = await scaffoldSkill(tempDir, 'verified-skill', { tier: 'verified' });
    expect(result.tier).toBe('verified');
    expect(result.skillRisk).toBe(3);
    expect(result.maxRisk).toBe(3);
    // 4 template files + .gitignore
    expect(result.files).toContain('skill.yaml');
    expect(result.files).toContain('handler.ts');
    expect(result.files).toContain('handler.test.ts');
    expect(result.files).toContain('SUPPLY.md');
    expect(result.files).toContain('.gitignore');
  });

  it('blocks skill creation when already exists', async () => {
    await writeConfig(tempDir, 2);

    await scaffoldSkill(tempDir, 'exists-test', { tier: 'declared' });

    await expect(
      scaffoldSkill(tempDir, 'exists-test', { tier: 'declared' }),
    ).rejects.toThrow('already exists');
  });

  it('validates skill name', async () => {
    await writeConfig(tempDir, 2);

    await expect(
      scaffoldSkill(tempDir, 'Invalid_Name', { tier: 'declared' }),
    ).rejects.toThrow('lowercase');
  });

  it('scaffold OBO keyword skill and verify hint present in output', async () => {
    await writeConfig(tempDir, 2);

    const result = await scaffoldSkill(tempDir, 'send-invoice', { tier: 'typed' });
    expect(result.oboDetected).toBe(true);
    expect(result.oboHints.length).toBeGreaterThan(0);

    // Verify OBO hints are in the handler file on disk
    const handlerPath = join(tempDir, 'skills', 'send-invoice', 'handler.ts');
    const handler = await readFile(handlerPath, 'utf-8');
    expect(handler).toContain('// OBO:');
    expect(handler).toContain('send');
  });

  it('generates .gitignore with .claws/ entry', async () => {
    await writeConfig(tempDir, 2);

    const result = await scaffoldSkill(tempDir, 'gi-test', { tier: 'declared' });
    expect(result.files).toContain('.gitignore');

    const gitignorePath = join(tempDir, 'skills', 'gi-test', '.gitignore');
    const content = await readFile(gitignorePath, 'utf-8');
    expect(content).toContain('.claws/');
  });
});
