/**
 * L3: Consensus review-fix acceptance test — validates fixes for CP-2
 * findings flagged by all three reviewers (gateway-eng, platform-eng,
 * skill-author).
 *
 * C1: Policy template/doctor schema alignment
 * C2: Dotnet platform detection via glob markers
 * C3: Template configOverrides applied to claws.json
 *
 * @module claws-sdk/tests/accept/e2e/review-fixes-consensus
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

// ── Init module ──────────────────────────────────────────────────────
import { initWorkspace } from '../../../src/init/index.js';

// ── Doctor module ────────────────────────────────────────────────────
import {
  runDoctor,
  createDefaultChecks,
  checkPolicySyntax,
} from '../../../src/doctor/index.js';

// ── Amend module ─────────────────────────────────────────────────────
import { runAmendPipeline } from '../../../src/amend/index.js';
import type { Amendment } from '../../../src/amend/index.js';

// ── Platform detection ───────────────────────────────────────────────
import { detectWorkspacePlatform } from '../../../src/init/platform-detect.js';

// ── Types ────────────────────────────────────────────────────────────
import { CLAWS_CONFIG_FILE } from '../../../src/types/sidecar.js';
import type { GovernanceIR } from '../../../src/ir/governance-ir.js';

// ── Cleanup ──────────────────────────────────────────────────────────

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort
    }
  }
  tempDirs.length = 0;
});

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `claws-accept-review-${prefix}-`));
  tempDirs.push(dir);
  return dir;
}

function seedNodeWorkspace(dir: string): void {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'test-workspace', version: '1.0.0' }, null, 2),
    'utf-8',
  );
  writeFileSync(join(dir, 'SOUL.md'), '# Soul\nTest workspace.\n', 'utf-8');
}

function readConfig(dir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dir, CLAWS_CONFIG_FILE), 'utf-8'));
}

/**
 * Build a minimal GovernanceIR for amend pipeline tests.
 */
function buildMinimalIR(): GovernanceIR {
  return {
    capabilities: {
      tools: [],
      skills: [],
      resources: [],
      delegations: [],
    },
    analysis: {
      violations: [],
      summary: { total: 0, byLevel: {}, byRule: {} },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.0.0',
      compiledAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
    },
  };
}

// ── Acceptance Tests ─────────────────────────────────────────────────

describe('accept: review-fixes-consensus (CP-2 C1/C2/C3)', () => {
  // ── C1: Policy template/doctor schema alignment ────────────────────

  it('C1-a: init --template soc2 → doctor runs → ALL checks pass', async () => {
    const tempDir = createTempDir('c1a');
    seedNodeWorkspace(tempDir);

    await initWorkspace(tempDir, { template: 'soc2' });

    const checks = createDefaultChecks();
    const report = await runDoctor(tempDir, checks);

    expect(report.healthy).toBe(true);
    expect(report.summary.errors).toBe(0);

    // Policy-syntax specifically passes
    const policyCheck = report.checks.find((c) => c.checkId === 'policy-syntax');
    expect(policyCheck).toBeDefined();
    expect(policyCheck!.passed).toBe(true);
  }, 30_000);

  it('C1-b: init --template hipaa → doctor runs → ALL checks pass', async () => {
    const tempDir = createTempDir('c1b');
    seedNodeWorkspace(tempDir);

    await initWorkspace(tempDir, { template: 'hipaa' });

    const checks = createDefaultChecks();
    const report = await runDoctor(tempDir, checks);

    expect(report.healthy).toBe(true);
    expect(report.summary.errors).toBe(0);

    const policyCheck = report.checks.find((c) => c.checkId === 'policy-syntax');
    expect(policyCheck).toBeDefined();
    expect(policyCheck!.passed).toBe(true);
  }, 30_000);

  it('C1-c: init --template eu-ai-act → doctor runs → ALL checks pass', async () => {
    const tempDir = createTempDir('c1c');
    seedNodeWorkspace(tempDir);

    await initWorkspace(tempDir, { template: 'eu-ai-act' });

    const checks = createDefaultChecks();
    const report = await runDoctor(tempDir, checks);

    expect(report.healthy).toBe(true);
    expect(report.summary.errors).toBe(0);

    const policyCheck = report.checks.find((c) => c.checkId === 'policy-syntax');
    expect(policyCheck).toBeDefined();
    expect(policyCheck!.passed).toBe(true);
  }, 30_000);

  // ── C3: Template configOverrides applied ───────────────────────────

  it('C3-a: init --template soc2 → claws.json has trustTier:3', async () => {
    const tempDir = createTempDir('c3a');
    seedNodeWorkspace(tempDir);

    await initWorkspace(tempDir, { template: 'soc2' });

    const config = readConfig(tempDir);
    expect(config.trustTier).toBe(3);
    expect(config.complianceFramework).toBe('soc2');
  }, 30_000);

  it('C3-b: init --template hipaa → claws.json has trustTier:3', async () => {
    const tempDir = createTempDir('c3b');
    seedNodeWorkspace(tempDir);

    await initWorkspace(tempDir, { template: 'hipaa' });

    const config = readConfig(tempDir);
    expect(config.trustTier).toBe(3);
    expect(config.complianceFramework).toBe('hipaa');
  }, 30_000);

  // ── C2: Dotnet platform detection ──────────────────────────────────

  it('C2-a: workspace with *.csproj → platform detected as dotnet', async () => {
    const tempDir = createTempDir('c2a');
    writeFileSync(join(tempDir, 'MyApp.csproj'), '<Project />', 'utf-8');

    const result = await detectWorkspacePlatform(tempDir);

    expect(result.platform).toBe('dotnet');
    expect(result.markerFile).toBe('MyApp.csproj');
    expect(result.method).toContain('auto-detect');
  }, 30_000);

  it('C2-b: workspace with *.sln → platform detected as dotnet', async () => {
    const tempDir = createTempDir('c2b');
    writeFileSync(join(tempDir, 'MySolution.sln'), '', 'utf-8');

    const result = await detectWorkspacePlatform(tempDir);

    expect(result.platform).toBe('dotnet');
    expect(result.markerFile).toBe('MySolution.sln');
    expect(result.method).toContain('auto-detect');
  }, 30_000);

  // ── Regression: init → doctor → amend → doctor still passes ───────

  it('C1-d: init → doctor → amend update-policy → doctor still passes', async () => {
    const tempDir = createTempDir('c1d');
    seedNodeWorkspace(tempDir);

    // Init with soc2 template
    await initWorkspace(tempDir, { template: 'soc2' });

    // Doctor passes after init
    const checks = createDefaultChecks();
    const report1 = await runDoctor(tempDir, checks);
    expect(report1.healthy).toBe(true);

    // Run amend pipeline to update trust tier
    const ir = buildMinimalIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 4 },
    };
    const recompile = async () => ({ success: true });
    const amendResult = await runAmendPipeline(
      tempDir,
      amendment,
      ir,
      3, // current trust tier
      recompile,
    );
    expect(amendResult.success).toBe(true);

    // Doctor still passes after amendment
    const report2 = await runDoctor(tempDir, checks);
    expect(report2.healthy).toBe(true);
    expect(report2.summary.errors).toBe(0);
  }, 30_000);
});
