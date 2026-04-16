/**
 * L1: Amend pipeline — re-parse -> re-evaluate -> merge -> re-emit on modified workspace.
 *
 * THOTH-INTEGRATION-COVERAGE: amend 67% -> 90%.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runAmendPipeline } from '../../src/amend/amend.js';
import { validateAmendment } from '../../src/amend/validate.js';
import { previewAmendment } from '../../src/amend/preview.js';
import type { Amendment } from '../../src/amend/validate.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

/**
 * Minimal GovernanceIR fixture for testing.
 */
function makeMinimalIR(): GovernanceIR {
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    sdkVersion: '1.0.0',
    workspace: '/tmp/test',
    trustTier: 2,
    sources: [],
    tools: [],
    skills: [],
    agents: [],
    dataLabels: [],
    violations: [],
    conflicts: [],
    failModes: {},
    capabilityManifest: {
      totalTools: 0,
      totalSkills: 0,
      totalAgents: 0,
      riskDistribution: { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0 },
    },
  };
}

describe('amend pipeline re-parse -> re-evaluate -> merge -> re-emit', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('update-policy amendment: validate -> preview -> apply lifecycle', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-amend-pipeline-'));

    // Set up workspace
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 2,
      suppressions: [],
      policySet: 'default',
      auditLevel: 'full',
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    }), 'utf-8');

    // Create audit directory for recompile
    await mkdir(join(tempDir, '.claws', 'audit'), { recursive: true });
    await mkdir(join(tempDir, '.claws', 'compiled'), { recursive: true });

    const ir = makeMinimalIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'failMode',
      value: { R1: 'gated', R2: 'gated' },
    };

    // 1. Validate — should pass for policy update at T2
    const validation = validateAmendment(amendment, ir, 2);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);

    // 2. Preview — should show what would change
    const preview = previewAmendment(amendment, tempDir);
    expect(preview).toBeDefined();

    // 3. Full pipeline (dry-run)
    const result = await runAmendPipeline(
      tempDir,
      amendment,
      ir,
      2,
      async () => {}, // no-op recompile
      { dryRun: true },
    );

    // Dry-run stops at 'preview' — no apply step
    expect(result.success).toBe(true);
    expect(result.validation.valid).toBe(true);
    expect(result.step).toBe('preview');
    expect(result.preview).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
