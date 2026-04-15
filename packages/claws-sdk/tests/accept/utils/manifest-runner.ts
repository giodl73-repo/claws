/**
 * Manifest runner adapter — dispatches claws acceptance scenarios
 * to the correct runner type.
 *
 * Reads design/claws/scenarios/manifest.yaml and provides a dispatch
 * table for the 5 claws runner types.
 *
 * @module claws-sdk/tests/accept/utils/manifest-runner
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  discoverClawsScenarios,
  loadScenarioYaml,
  inferRunnerType,
  type ScenarioYaml,
  type ScenarioInfo,
} from './scenario-loader.js';

// ---------------------------------------------------------------------------
// Runner type definitions
// ---------------------------------------------------------------------------

export const CLAWS_RUNNER_TYPES = [
  'compile-sim',
  'pinch-sim',
  'emit-sim',
  'fleet-sim',
  'security-sim',
] as const;

export type ClawsRunnerType = (typeof CLAWS_RUNNER_TYPES)[number];

/**
 * Runner registration entry.
 */
export interface RunnerRegistration {
  /** Runner type name. */
  name: ClawsRunnerType;
  /** Whether this runner is a stub (not fully implemented). */
  stub: boolean;
  /** Execute the runner against a scenario. */
  execute: (scenarioDir: string, scenario: ScenarioYaml) => Promise<RunnerResult>;
}

/**
 * Result from a runner execution.
 */
export interface RunnerResult {
  /** Whether the scenario passed. */
  passed: boolean;
  /** Error details if failed. */
  error?: string;
  /** Diagnostic output for structured failure reporting. */
  diagnostics?: string[];
}

// ---------------------------------------------------------------------------
// Runner registry
// ---------------------------------------------------------------------------

// Lazy imports to avoid circular deps — runners import from utils
const runners = new Map<ClawsRunnerType, RunnerRegistration>();

function ensureRegistered(): void {
  if (runners.size > 0) return;

  // Register all 5 runner types
  runners.set('compile-sim', {
    name: 'compile-sim',
    stub: false,
    execute: async (dir, scenario) => {
      const { runCompileSim } = await import('../runners/compile-sim.js');
      return runCompileSim(dir, scenario);
    },
  });

  runners.set('pinch-sim', {
    name: 'pinch-sim',
    stub: false,
    execute: async (dir, scenario) => {
      const { runPinchSim } = await import('../runners/pinch-sim.js');
      return runPinchSim(dir, scenario);
    },
  });

  runners.set('emit-sim', {
    name: 'emit-sim',
    stub: false,
    execute: async (dir, scenario) => {
      const { runEmitSim } = await import('../runners/emit-sim.js');
      return runEmitSim(dir, scenario);
    },
  });

  runners.set('fleet-sim', {
    name: 'fleet-sim',
    stub: true,
    /* c8 ignore start -- fleet-sim is a stub; execute is never called (stub check returns first) */
    execute: async (_dir, _scenario) => {
      const { runFleetSim } = await import('../runners/fleet-sim.js');
      return runFleetSim(_dir, _scenario);
    },
    /* c8 ignore stop */
  });

  runners.set('security-sim', {
    name: 'security-sim',
    stub: false,
    execute: async (dir, scenario) => {
      const { runSecuritySim } = await import('../runners/security-sim.js');
      return runSecuritySim(dir, scenario);
    },
  });
}

/**
 * Get the runner registration for a given type.
 */
export function getRunnerForType(type: ClawsRunnerType): RunnerRegistration {
  ensureRegistered();
  const runner = runners.get(type);
  if (!runner) {
    throw new Error(`Unknown runner type: ${type}`);
  }
  return runner;
}

// ---------------------------------------------------------------------------
// Manifest loading
// ---------------------------------------------------------------------------

interface ManifestSeriesEntry {
  runners: string[];
  min: number;
  marker: string;
  spec: string;
  description: string;
}

interface ManifestYaml {
  series: Record<string, ManifestSeriesEntry>;
}

/**
 * Load the Ptah-scoped manifest from the accept test directory.
 */
function loadAcceptManifest(): ManifestYaml {
  const manifestPath = resolve(__dirname, '../scenarios/manifest.yaml');
  /* istanbul ignore next -- manifest.yaml always exists in the repo; guard for corrupted checkouts */
  if (!existsSync(manifestPath)) {
    throw new Error(`Accept manifest not found: ${manifestPath}`);
  }
  const content = readFileSync(manifestPath, 'utf-8');
  return parseYaml(content) as ManifestYaml;
}

/**
 * Result from running a single scenario through all its designated runners.
 */
export interface ScenarioRunResult {
  scenario: ScenarioInfo;
  results: Array<{
    runner: ClawsRunnerType;
    result: RunnerResult;
  }>;
  passed: boolean;
  skipped: boolean;
}

/**
 * Run all scenarios in a series through their manifest-designated runners.
 *
 * For each scenario in the series:
 * 1. Loads scenario.yaml
 * 2. Determines runner type(s) from manifest
 * 3. Runs each designated runner
 * 4. Collects results
 *
 * Returns an array of per-scenario results.
 */
export async function runFromManifest(
  seriesName: string,
  options?: { basePath?: string },
): Promise<ScenarioRunResult[]> {
  const manifest = loadAcceptManifest();
  const seriesConfig = manifest.series[seriesName];
  if (!seriesConfig) {
    throw new Error(
      `Series "${seriesName}" not found in accept manifest. ` +
      `Available: ${Object.keys(manifest.series).join(', ')}`,
    );
  }

  const basePath = options?.basePath ?? resolve(
    __dirname, '../../../../design/claws/scenarios',
  );

  const scenarios = discoverClawsScenarios({ basePath, series: seriesName });
  if (scenarios.length < seriesConfig.min) {
    throw new Error(
      `Series "${seriesName}" requires min ${seriesConfig.min} scenarios, ` +
      `found ${scenarios.length}`,
    );
  }

  const results: ScenarioRunResult[] = [];

  for (const scenarioInfo of scenarios) {
    const yaml = loadScenarioYaml(scenarioInfo.dir);
    /* istanbul ignore next -- all discovered scenarios have valid YAML; guard for corrupted fixtures */
    if (!yaml) {
      results.push({
        scenario: scenarioInfo,
        results: [],
        passed: false,
        skipped: false,
      });
      continue;
    }

    const runnerTypes = seriesConfig.runners as ClawsRunnerType[];
    const scenarioResults: ScenarioRunResult['results'] = [];
    let allPassed = true;
    let allSkipped = true;

    for (const runnerType of runnerTypes) {
      const runner = getRunnerForType(runnerType);

      // Fleet-sim is stub — mark as skipped
      // (stub and incompatible paths are covered via runSingleScenario tests;
      //  runFromManifest only reaches these with specific manifest configurations)
      /* istanbul ignore next -- stub path covered via runSingleScenario; only fires when manifest includes fleet-sim */
      if (runner.stub) {
        scenarioResults.push({
          runner: runnerType,
          result: { passed: true, diagnostics: [`SKIPPED: ${runnerType} is a stub`] },
        });
        continue;
      }

      // Check runner compatibility with this scenario
      /* istanbul ignore next -- compatibility path covered via runSingleScenario; only fires in multi-runner series */
      if (!isCompatible(runnerType, yaml)) {
        scenarioResults.push({
          runner: runnerType,
          result: { passed: true, diagnostics: [`SKIPPED: ${runnerType} not compatible with scenario`] },
        });
        continue;
      }

      allSkipped = false;
      const result = await runner.execute(scenarioInfo.dir, yaml);
      scenarioResults.push({ runner: runnerType, result });
      if (!result.passed) allPassed = false;
    }

    results.push({
      scenario: scenarioInfo,
      results: scenarioResults,
      passed: allPassed,
      skipped: allSkipped,
    });
  }

  return results;
}

/**
 * Discover scenarios for a series and return them with their manifest config.
 *
 * Used by per-scenario test generation: each test file calls this to get
 * the list of scenarios, then creates individual it() blocks.
 */
export function discoverSeriesScenarios(
  seriesName: string,
  options?: { basePath?: string },
): Array<{ info: ScenarioInfo; yaml: ScenarioYaml | null; runners: ClawsRunnerType[] }> {
  const manifest = loadAcceptManifest();
  const seriesConfig = manifest.series[seriesName];
  if (!seriesConfig) {
    throw new Error(
      `Series "${seriesName}" not found in accept manifest. ` +
      `Available: ${Object.keys(manifest.series).join(', ')}`,
    );
  }

  const basePath = options?.basePath ?? resolve(
    __dirname, '../../../../design/claws/scenarios',
  );

  const scenarios = discoverClawsScenarios({ basePath, series: seriesName });
  return scenarios.map(info => ({
    info,
    yaml: loadScenarioYaml(info.dir),
    runners: seriesConfig.runners as ClawsRunnerType[],
  }));
}

/**
 * Run a single scenario through a specific runner.
 */
export async function runSingleScenario(
  scenarioDir: string,
  yaml: ScenarioYaml,
  runnerType: ClawsRunnerType,
): Promise<RunnerResult> {
  const runner = getRunnerForType(runnerType);

  if (runner.stub) {
    return { passed: true, diagnostics: [`SKIPPED: ${runnerType} is a stub`] };
  }

  if (!isCompatible(runnerType, yaml)) {
    return { passed: true, diagnostics: [`SKIPPED: ${runnerType} not compatible with scenario`] };
  }

  return runner.execute(scenarioDir, yaml);
}

/**
 * Check if a runner type is compatible with a scenario's expect block.
 */
export function isCompatible(type: ClawsRunnerType, scenario: ScenarioYaml): boolean {
  const expect = scenario.expect;
  switch (type) {
    case 'compile-sim':
      return expect.governance_ir !== undefined
        || expect.violations !== undefined
        || expect.artifacts !== undefined;
    case 'pinch-sim':
      return expect.rules_applied !== undefined
        || expect.pass !== undefined;
    case 'emit-sim':
      return expect.artifacts !== undefined
        || expect.plugin_hooks !== undefined
        || expect.skill_content !== undefined
        || expect.approvals !== undefined;
    case 'fleet-sim':
      return expect.workspaces !== undefined;
    case 'security-sim':
      return expect.attack_class !== undefined
        || expect.defense_layer !== undefined
        || expect.blocked !== undefined;
    default:
      return false;
  }
}
