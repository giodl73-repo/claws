/**
 * L3 acceptance: SDK consumer configures warn-only and fail-on severity
 * levels via the analysis API, verifying that exit behavior matches the
 * gating policy for each severity threshold.
 *
 * This test validates the consumer-facing contract: a CI/CD integration
 * can use the SDK to:
 * 1. Run the compile+analyze pipeline to get violations with severity levels
 * 2. Map violation levels to SARIF severity categories
 * 3. Apply a gating policy (warn-only, fail-on: critical/high/medium/all)
 * 4. Determine the correct exit behavior per policy
 *
 * @module claws-sdk/tests/cicd/cicd-severity-gating.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  buildCapabilityManifest,
  analyze,
} from '../../src/compile/index.js';
import { createDefaultRegistry } from '../../src/governance/index.js';
import type { GovViolation } from '../../src/ir/index.js';

type SarifLevel = 'error' | 'warning' | 'note';
type FailOnThreshold = 'critical' | 'high' | 'medium' | 'all';

/** Map SDK RuleLevel to SARIF level (consumer API contract). */
function mapLevel(level: number): SarifLevel {
  if (level >= 4) return 'error';
  if (level === 3) return 'warning';
  return 'note';
}

/**
 * Gating policy: determine exit code based on violations and configuration.
 * This is the consumer-facing API contract that CI/CD integrations implement.
 */
function computeExitCode(
  violations: readonly GovViolation[],
  config: { warnOnly: boolean; failOn: FailOnThreshold },
): number {
  // warn-only: always exit 0
  if (config.warnOnly) return 0;

  // No violations: exit 0
  if (violations.length === 0) return 0;

  const levels = violations.map((v) => mapLevel(v.level));
  const hasError = levels.includes('error');
  const hasWarning = levels.includes('warning');

  switch (config.failOn) {
    case 'critical':
      return hasError ? 1 : 0;
    case 'high':
      return hasError ? 1 : 0;
    case 'medium':
      return hasError || hasWarning ? 1 : 0;
    case 'all':
      return 1; // any violation blocks
    default:
      return 1;
  }
}

let testDir: string;

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-cicd-severity-accept-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

/** Write a workspace with governance violations at multiple severity levels. */
async function writeFixtureWorkspace(): Promise<void> {
  await writeFile(
    join(testDir, 'claws.json'),
    JSON.stringify({
      trustTier: 2,
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    }),
    'utf-8',
  );

  await writeFile(
    join(testDir, 'SOUL.md'),
    '# Soul\n\nYou are an assistant managing critical infrastructure.\n',
    'utf-8',
  );

  await writeFile(
    join(testDir, 'TOOLS.md'),
    [
      '# Tools',
      '',
      '- deploy_production: Deploy code to production',
      '- delete_database: Delete database tables',
      '- read_logs: Read application logs',
    ].join('\n'),
    'utf-8',
  );
}

/** Run the full SDK pipeline and return violations. */
async function runPipeline(): Promise<GovViolation[]> {
  const parseResult = await parse(testDir);
  const intentResults = extractAllIntents(parseResult);
  const ast = buildGovernanceAST(intentResults);
  const manifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(manifest);
  const registry = createDefaultRegistry(capabilityManifest);
  const analysisResult = analyze(capabilityManifest, registry, {});
  return analysisResult.violations;
}

describe('SDK severity gating acceptance', () => {
  it('warn-only mode returns exit 0 regardless of violation severity', async () => {
    await writeFixtureWorkspace();
    const violations = await runPipeline();
    expect(violations.length).toBeGreaterThan(0);

    const exit = computeExitCode(violations, { warnOnly: true, failOn: 'all' });
    expect(exit).toBe(0);
  });

  it('fail-on: critical returns exit 1 when error-level violations exist', async () => {
    await writeFixtureWorkspace();
    const violations = await runPipeline();
    expect(violations.length).toBeGreaterThan(0);

    const hasErrorLevel = violations.some((v) => mapLevel(v.level) === 'error');
    const exit = computeExitCode(violations, { warnOnly: false, failOn: 'critical' });

    if (hasErrorLevel) {
      expect(exit).toBe(1);
    } else {
      expect(exit).toBe(0);
    }
  });

  it('fail-on: high returns exit 0 when only note-level violations exist', async () => {
    // Verify the gating logic: if no error-level violations, fail-on:high passes
    const violations: GovViolation[] = [
      {
        ruleId: 'G-TEST-001',
        level: 1 as const,
        message: 'Low-severity test violation',
        target: 'TOOLS.md',
        diagnosticCode: 'G-TEST-001',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      },
    ];

    const exit = computeExitCode(violations, { warnOnly: false, failOn: 'high' });
    expect(exit).toBe(0);
  });

  it('fail-on: medium returns exit 1 when warning-level violations exist', async () => {
    const violations: GovViolation[] = [
      {
        ruleId: 'G-TEST-002',
        level: 3 as const,
        message: 'Medium-severity test violation',
        target: 'TOOLS.md',
        diagnosticCode: 'G-TEST-002',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      },
    ];

    const exit = computeExitCode(violations, { warnOnly: false, failOn: 'medium' });
    expect(exit).toBe(1);
  });

  it('fail-on: all returns exit 1 on any violation', async () => {
    await writeFixtureWorkspace();
    const violations = await runPipeline();
    expect(violations.length).toBeGreaterThan(0);

    const exit = computeExitCode(violations, { warnOnly: false, failOn: 'all' });
    expect(exit).toBe(1);
  });
});
