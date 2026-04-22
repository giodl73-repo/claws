/**
 * Scenario loader — discovers and parses claws acceptance scenarios.
 *
 * Reuses the discover algorithm from compiler-sdk but overrides:
 * - marker: scenario.yaml (not 20+program.yaml)
 * - basePath: docs/scenarios/ (not design/astro/scenarios/)
 *
 * Validates scenario.yaml with Zod against the claws ScenarioYaml shape.
 *
 * @module claws-sdk/tests/accept/utils/scenario-loader
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/**
 * Claws-repo-root docs/scenarios/ — the authoritative location for all
 * 331 scenarios across 30 series. Shared by harness.accept.test.ts and
 * manifest-runner.ts so a future docs/ reorg (e.g. per-package doc trees
 * in pulses 73.7/73.8 / 74.5/74.6) is a one-line change here.
 */
export const SCENARIOS_BASE_DIR = resolve(
  __dirname, '../../../../..', 'docs', 'scenarios',
);

// ---------------------------------------------------------------------------
// Zod schemas for scenario.yaml validation
// ---------------------------------------------------------------------------

// Scenario expect blocks are highly variable across series. Use permissive
// schemas to avoid false-negative Zod rejections — the runners handle
// structural assertions at runtime.
// Note: z.record(z.any()) crashes in Zod 4 — use z.record(z.string(), z.unknown())
const ExpectSchema = z.record(z.string(), z.unknown());

const FindingSchema = z.object({
  id: z.string(),
  severity: z.string(),
  description: z.string(),
  spec_impact: z.string().optional(),
  pitfall: z.string().optional().nullable(),
}).passthrough();

const ScenarioYamlSchema = z.object({
  name: z.string(),
  series: z.string(),
  version: z.number().optional(),
  specs: z.array(z.string()).optional(),
  description: z.string().optional(),
  expect: ExpectSchema,
  simulate: z.record(z.string(), z.unknown()).optional(),
  problem: z.string().optional(),
  findings: z.array(FindingSchema).optional(),
}).passthrough();

export type ScenarioYaml = z.infer<typeof ScenarioYamlSchema>;

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export interface ScenarioInfo {
  id: number;
  name: string;
  dir: string;
  series: string;
}

export interface DiscoverOptions {
  /** Base path containing series directories. */
  basePath: string;
  /** Optional: restrict to a single series. */
  series?: string;
}

/**
 * Discover claws scenario directories.
 *
 * Finds directories matching S##-{name} that contain scenario.yaml.
 * If series is provided, only discovers within that series directory.
 * Otherwise discovers across all series directories.
 */
export function discoverClawsScenarios(options: DiscoverOptions): ScenarioInfo[] {
  const { basePath, series } = options;

  if (!existsSync(basePath)) return [];

  const seriesDirs = series
    ? [series]
    : readdirSync(basePath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

  const scenarios: ScenarioInfo[] = [];

  for (const seriesName of seriesDirs) {
    const seriesDir = join(basePath, seriesName);
    if (!existsSync(seriesDir)) continue;

    let entries;
    try {
      entries = readdirSync(seriesDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Match S##-name pattern
      const match = entry.name.match(/^S(\d+)-(.+)$/);
      if (!match) continue;

      const dir = join(seriesDir, entry.name);
      const markerPath = join(dir, 'scenario.yaml');
      if (!existsSync(markerPath)) continue;

      scenarios.push({
        id: parseInt(match[1]!, 10),
        name: match[2]!,
        dir,
        series: seriesName,
      });
    }
  }

  return scenarios.sort((a, b) => {
    // Sort by series then by id
    const seriesCompare = a.series.localeCompare(b.series);
    if (seriesCompare !== 0) return seriesCompare;
    return a.id - b.id;
  });
}

/**
 * Load and validate a scenario.yaml from a scenario directory.
 *
 * Returns the parsed and validated ScenarioYaml, or null if the file
 * doesn't exist or fails validation.
 */
export function loadScenarioYaml(scenarioDir: string): ScenarioYaml | null {
  const yamlPath = join(scenarioDir, 'scenario.yaml');
  if (!existsSync(yamlPath)) return null;

  try {
    const content = readFileSync(yamlPath, 'utf-8');
    const raw = parseYaml(content);
    const result = ScenarioYamlSchema.safeParse(raw);
    if (!result.success) {
      console.warn(
        `[scenario-loader] Validation failed for ${yamlPath}: ${result.error.message}`,
      );
      return null;
    }
    return result.data;
  } catch (e) {
    console.warn(
      `[scenario-loader] Failed to parse ${yamlPath}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}

/**
 * Determine which runner type a scenario expects, based on the expect block.
 */
export function inferRunnerType(scenario: ScenarioYaml): string {
  const expect = scenario.expect;

  // security-sim: has attack_class or defense_layer
  if (expect.attack_class !== undefined || expect.defense_layer !== undefined) {
    return 'security-sim';
  }

  // fleet-sim: has workspaces
  if (expect.workspaces !== undefined) {
    return 'fleet-sim';
  }

  // emit-sim: has artifacts with plugin_hooks or skill_content
  if (expect.plugin_hooks !== undefined || expect.skill_content !== undefined || expect.approvals !== undefined) {
    return 'emit-sim';
  }

  // pinch-sim: has rules_applied or pass
  if (expect.rules_applied !== undefined || expect.pass !== undefined) {
    return 'pinch-sim';
  }

  // compile-sim: has governance_ir
  if (expect.governance_ir !== undefined) {
    return 'compile-sim';
  }

  // Default: compile-sim
  return 'compile-sim';
}
