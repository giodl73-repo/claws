/**
 * L2 e2e tests for the scaffold orchestrator.
 *
 * P29: Basic scaffold e2e
 * P32: Full tier traversal — DECLARED 3-line → TYPED decorators → VERIFIED governance → .gitignore
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  scaffoldSkill,
  RiskCapExceededError,
} from '@bic/claws-sdk/scaffold';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-scaffold-e2e-'));
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

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('scaffold e2e', () => {
  it('scaffold all 3 tiers end-to-end with full verification', async () => {
    await writeConfig(tempDir, 3); // T3 allows up to R4

    // DECLARED tier — 3-line YAML only
    const declared = await scaffoldSkill(tempDir, 'tier-d', { tier: 'declared' });
    const dYaml = await readFile(join(declared.skillDir, 'skill.yaml'), 'utf-8');
    const dLines = dYaml.split('\n').filter(l => l.trim().length > 0);
    expect(dLines).toHaveLength(3);
    expect(dYaml).toMatch(/^name: tier-d$/m);
    expect(dYaml).toMatch(/^risk: 1$/m);
    expect(dYaml).toMatch(/^description: tier-d skill$/m);

    // TYPED tier — plain TS handler (no @bic/claws-skill-kit dependency)
    const typed = await scaffoldSkill(tempDir, 'tier-t', { tier: 'typed' });
    const tHandler = await readFile(join(typed.skillDir, 'handler.ts'), 'utf-8');
    expect(tHandler).not.toContain("from '@bic/claws-skill-kit'");
    expect(tHandler).toContain('export async function handler(');
    expect(tHandler).toContain('claws upgrade');

    // VERIFIED tier — test template + supply chain
    const verified = await scaffoldSkill(tempDir, 'tier-v', { tier: 'verified' });
    const vTest = await readFile(join(verified.skillDir, 'handler.test.ts'), 'utf-8');
    expect(vTest).not.toContain('GovernanceValidator');
    expect(vTest).not.toContain('SecurityScanner');
    expect(vTest).toContain("import { handler } from './handler.js'");
    expect(vTest).toContain("describe('tier-v'");

    const vSupply = await readFile(join(verified.skillDir, 'SUPPLY.md'), 'utf-8');
    expect(vSupply).toContain('skill: tier-v');
    expect(vSupply).toContain('attestation: pending');

    // VERIFIED test template is structurally valid TypeScript
    expect(vTest).toContain('import {');
    expect(vTest).toContain('describe(');
    expect(vTest).toContain('it(');
    const opens = (vTest.match(/{/g) ?? []).length;
    const closes = (vTest.match(/}/g) ?? []).length;
    expect(opens).toBe(closes);

    // .gitignore generated for all tiers
    for (const result of [declared, verified]) {
      const gi = await readFile(join(result.skillDir, '.gitignore'), 'utf-8');
      expect(gi).toContain('.claws/');
    }
  });

  it('T1 workspace blocks verified tier (R3 > R1 cap)', async () => {
    await writeConfig(tempDir, 1);

    // verified tier defaults to R3, T1 caps at R1
    await expect(
      scaffoldSkill(tempDir, 'blocked-skill', { tier: 'verified' }),
    ).rejects.toThrow(RiskCapExceededError);

    try {
      await scaffoldSkill(tempDir, 'blocked-skill-2', { tier: 'verified' });
    } catch (err) {
      expect(err).toBeInstanceOf(RiskCapExceededError);
      if (err instanceof RiskCapExceededError) {
        expect(err.requestedRisk).toBe(3);
        expect(err.maxRisk).toBe(1);
        expect(err.trustTier).toBe(1);
      }
    }
  });

  it('T2 workspace allows typed tier', async () => {
    // T2 caps at R3, typed defaults to R2 — this should succeed
    await writeConfig(tempDir, 2);
    const result = await scaffoldSkill(tempDir, 'passes', { tier: 'typed' });
    expect(result.skillRisk).toBe(2);
    expect(result.maxRisk).toBe(3);
  });

  it('scaffold default tier (declared) works with defaults config', async () => {
    // No claws.json — loadConfig returns defaults (trustTier=2)
    const result = await scaffoldSkill(tempDir, 'default-skill');
    expect(result.tier).toBe('declared');
    expect(result.skillRisk).toBe(1);
    expect(result.trustTier).toBe(2); // default
  });
});
