/**
 * L3 acceptance test for scaffold.
 *
 * P29: Verifies `claws new skill` at each default tier on T1-T4 workspaces
 * P32: Tier scaffold acceptance with OBO, risk cap, governance test, .gitignore
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  scaffoldSkill,
  RiskCapExceededError,
  maxRiskForTier,
  extractMajor,
} from '@bic/claws-sdk/scaffold';
import type { SkillTemplateTier } from '@bic/claws-sdk/scaffold';
import { COMPILER_VERSION } from '#src/compile/version.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-scaffold-accept-'));
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

describe('scaffold acceptance', () => {
  const tiers: readonly SkillTemplateTier[] = ['declared', 'typed', 'verified'];
  const trustTiers = [1, 2, 3, 4] as const;
  const riskMap: Record<number, number> = { 1: 1, 2: 3, 3: 4, 4: 5 };
  const templateRisk: Record<string, number> = { declared: 1, typed: 2, verified: 3 };

  it('validates trust-tier -> risk-cap mapping for T1-T4', () => {
    expect(maxRiskForTier(1)).toBe(1);
    expect(maxRiskForTier(2)).toBe(3);
    expect(maxRiskForTier(3)).toBe(4);
    expect(maxRiskForTier(4)).toBe(5);
  });

  it('scaffolds each template tier on compatible workspaces', async () => {
    for (const tt of trustTiers) {
      const maxRisk = riskMap[tt]!;

      for (const tier of tiers) {
        const risk = templateRisk[tier]!;

        // Create a fresh temp workspace for each combination
        const wsDir = await mkdtemp(join(tmpdir(), `claws-accept-T${tt}-${tier}-`));
        try {
          await writeConfig(wsDir, tt);

          if (risk > maxRisk) {
            // Should be blocked
            await expect(
              scaffoldSkill(wsDir, `skill-${tier}`, { tier }),
            ).rejects.toThrow(RiskCapExceededError);
          } else {
            // Should succeed
            const result = await scaffoldSkill(wsDir, `skill-${tier}`, { tier });
            expect(result.tier).toBe(tier);
            expect(result.skillRisk).toBe(risk);
            expect(result.maxRisk).toBe(maxRisk);
            expect(result.trustTier).toBe(tt);

            // Verify generated manifest is valid YAML-like content
            const manifest = await readFile(
              join(result.skillDir, 'skill.yaml'),
              'utf-8',
            );
            expect(manifest).toContain(`name: skill-${tier}`);
            expect(manifest).toContain(`risk: ${risk}`);
            // declared tier has only 3 lines (name, risk, description); others have tier field
            if (tier !== 'declared') {
              expect(manifest).toContain(`tier: ${tier}`);
            }
          }
        } finally {
          await rm(wsDir, { recursive: true, force: true });
        }
      }
    }
  });

  it('dependency check: missing skill-kit emits install instruction', async () => {
    await writeConfig(tempDir, 2);

    const result = await scaffoldSkill(tempDir, 'dep-skill');
    expect(result.dependency.installed).toBe(false);
    expect(result.dependency.instruction).toContain('npm install @bic/claws-skill-kit');
  });

  it('dependency check: mismatched skill-kit emits version warning', async () => {
    await writeConfig(tempDir, 2);

    // Install a mismatched version
    const pkgDir = join(tempDir, 'node_modules', '@claws', 'skill-kit');
    await mkdir(pkgDir, { recursive: true });
    const mismatchMajor = extractMajor(COMPILER_VERSION) + 1;
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@bic/claws-skill-kit', version: `${mismatchMajor}.0.0` }),
      'utf-8',
    );

    const result = await scaffoldSkill(tempDir, 'dep-mismatch');
    expect(result.dependency.installed).toBe(true);
    expect(result.dependency.versionAligned).toBe(false);
    expect(result.dependency.instruction).toContain('version mismatch');
  });

  it('tier scaffold acceptance: send-invoice at VERIFIED on T2', async () => {
    await writeConfig(tempDir, 2);

    const result = await scaffoldSkill(tempDir, 'send-invoice', { tier: 'verified' });

    // OBO hint injected
    expect(result.oboDetected).toBe(true);
    const handler = await readFile(join(result.skillDir, 'handler.ts'), 'utf-8');
    expect(handler).toContain('// OBO:');

    // Risk capped at R3
    expect(result.maxRisk).toBe(3);
    expect(result.skillRisk).toBe(3);

    // Plain assertions test template present (no @bic/claws-skill-kit dependency)
    const test = await readFile(join(result.skillDir, 'handler.test.ts'), 'utf-8');
    expect(test).toContain("import { handler } from './handler.js'");
    expect(test).toContain('claws upgrade');

    // .gitignore present
    const gitignore = await readFile(join(result.skillDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claws/');
  });
});
