/**
 * Acceptance tests: compile-pipeline series (8 scenarios)
 *
 * Validates the full compilation pipeline: parse 9 files, extract intents,
 * analyze rules, emit artifacts. Runs through compile-sim runner.
 *
 * Per-scenario reporting: each scenario gets its own it() block.
 *
 * @module claws-sdk/tests/accept/compile/pipeline
 */

import { describe, it, expect } from 'vitest';
import {
  discoverSeriesScenarios,
  runSingleScenario,
} from '../utils/manifest-runner.js';

const scenarios = discoverSeriesScenarios('compile-pipeline');

describe('accept: compile-pipeline', () => {
  it('discovers at least 8 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(8);
  });

  for (const { info, yaml, runners } of scenarios) {
    const scenarioLabel = `S${String(info.id).padStart(2, '0')}-${info.name}`;

    it(scenarioLabel, async () => {
      if (!yaml) {
        expect.fail(`No scenario.yaml in ${info.dir}`);
        return;
      }
      for (const runner of runners) {
        const result = await runSingleScenario(info.dir, yaml, runner);
        if (!result.passed) {
          expect.fail(
            `${runner}: ${result.error}\n${(result.diagnostics ?? []).join('\n')}`,
          );
        }
      }
    }, 30_000);
  }
});
