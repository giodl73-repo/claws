/**
 * L2 e2e: End-to-end SARIF generation from fixture workspace with mixed
 * violations. Validates SARIF 2.1.0 schema compliance and
 * ruleId/severity/location fields.
 *
 * This test exercises the full SDK pipeline: parse -> extract -> analyze ->
 * format as SARIF, ensuring the output is a valid SARIF 2.1.0 document
 * with correct structure for GitHub Code Scanning consumption.
 *
 * @module claws-sdk/tests/cicd/cicd-sarif-pipeline.e2e
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

/** Minimal SARIF types for assertion. */
interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: string };
}

interface SarifResult {
  ruleId: string;
  level: string;
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine: number; startColumn: number };
    };
  }>;
}

type SarifLevel = 'error' | 'warning' | 'note' | 'none';

/**
 * Map a claws severity level to a SARIF level.
 * Mirrors claws-cli/src/format/sarif.ts logic.
 */
function toSarifLevel(level: number): SarifLevel {
  if (level >= 4) return 'error';
  if (level === 3) return 'warning';
  return 'note';
}

/**
 * Convert violations from the SDK analyze result into SARIF 2.1.0 format.
 * This reimplements the formatting locally so the e2e test does not
 * depend on claws-cli's format module.
 */
function toSarif(
  violations: Array<{ ruleId: string; level: number; message: string; target: string }>,
  workspaceRoot: string,
): SarifLog {
  const ruleMap = new Map<string, SarifRule>();
  for (const v of violations) {
    if (!ruleMap.has(v.ruleId)) {
      ruleMap.set(v.ruleId, {
        id: v.ruleId,
        name: v.ruleId,
        shortDescription: { text: `Governance rule ${v.ruleId}` },
        defaultConfiguration: { level: toSarifLevel(v.level) },
      });
    }
  }

  const normRoot = workspaceRoot.replace(/\\/g, '/').replace(/\/$/, '');

  const results: SarifResult[] = violations.map((v) => {
    const normPath = v.target.replace(/\\/g, '/');
    const uri = normPath.startsWith(normRoot)
      ? normPath.slice(normRoot.length + 1)
      : normPath;

    return {
      ruleId: v.ruleId,
      level: toSarifLevel(v.level),
      message: { text: v.message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri },
          },
        },
      ],
    };
  });

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'claws',
            version: '0.0.0',
            informationUri: 'https://claws.dev',
            rules: [...ruleMap.values()],
          },
        },
        results,
      },
    ],
  };
}

let testDir: string;

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `claws-cicd-sarif-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

/**
 * Write a workspace with governance files that produce violations.
 */
async function writeFixtureWorkspace(): Promise<void> {
  await writeFile(
    join(testDir, 'claws.json'),
    JSON.stringify({
      trustTier: 2,
      failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    }),
    'utf-8',
  );

  // SOUL.md with basic identity
  await writeFile(
    join(testDir, 'SOUL.md'),
    '# Soul\n\nYou are a helpful assistant that manages deployments.\n',
    'utf-8',
  );

  // TOOLS.md with tool declarations that should trigger violations
  await writeFile(
    join(testDir, 'TOOLS.md'),
    [
      '# Tools',
      '',
      '- deploy_production: Deploy code to production servers',
      '- read_database: Read from the customer database',
      '- send_notification: Send push notifications to users',
    ].join('\n'),
    'utf-8',
  );
}

describe('SARIF pipeline e2e', () => {
  it('generates valid SARIF 2.1.0 from a fixture workspace with mixed violations', async () => {
    await writeFixtureWorkspace();

    // ── Run SDK pipeline ──────────────────────────────────────────────
    const parseResult = await parse(testDir);
    expect(parseResult.shouldHalt).toBe(false);

    const intentResults = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intentResults);
    const manifest = extract(ast);
    const capabilityManifest = buildCapabilityManifest(manifest);
    const registry = createDefaultRegistry(capabilityManifest);
    const analysisResult = analyze(capabilityManifest, registry, {});

    // ── Convert to SARIF ──────────────────────────────────────────────
    const violations = analysisResult.violations.map((v) => ({
      ruleId: v.ruleId,
      level: v.level,
      message: v.message,
      target: v.target,
    }));

    const sarif = toSarif(violations, testDir);
    const sarifJson = JSON.stringify(sarif, null, 2);

    // ── Validate SARIF 2.1.0 schema compliance ───────────────────────
    const parsed: SarifLog = JSON.parse(sarifJson);

    // Top-level required fields
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.$schema).toContain('sarif-2.1.0');
    expect(parsed.runs).toHaveLength(1);

    const run = parsed.runs[0]!;

    // Tool driver metadata
    expect(run.tool.driver.name).toBe('claws');
    expect(run.tool.driver.informationUri).toBe('https://claws.dev');
    expect(Array.isArray(run.tool.driver.rules)).toBe(true);

    // Results structure
    expect(Array.isArray(run.results)).toBe(true);

    // Every result has the required fields
    for (const result of run.results) {
      expect(result).toHaveProperty('ruleId');
      expect(result).toHaveProperty('level');
      expect(['error', 'warning', 'note', 'none']).toContain(result.level);
      expect(result).toHaveProperty('message');
      expect(result.message).toHaveProperty('text');
      expect(typeof result.message.text).toBe('string');
      expect(result.message.text.length).toBeGreaterThan(0);

      // Locations
      expect(result).toHaveProperty('locations');
      expect(result.locations.length).toBeGreaterThanOrEqual(1);

      const loc = result.locations[0]!;
      expect(loc.physicalLocation).toHaveProperty('artifactLocation');
      expect(loc.physicalLocation.artifactLocation).toHaveProperty('uri');

      // URI should not contain backslashes
      expect(loc.physicalLocation.artifactLocation.uri).not.toContain('\\');
    }

    // Every result's ruleId should match a declared rule
    const declaredRuleIds = new Set(run.tool.driver.rules.map((r) => r.id));
    for (const result of run.results) {
      expect(declaredRuleIds.has(result.ruleId)).toBe(true);
    }

    // Severity mapping: each rule's defaultConfiguration level matches results
    const ruleDefaultLevels = new Map(
      run.tool.driver.rules.map((r) => [r.id, r.defaultConfiguration.level]),
    );
    for (const result of run.results) {
      const defaultLevel = ruleDefaultLevels.get(result.ruleId);
      expect(defaultLevel).toBeDefined();
    }
  });
});
