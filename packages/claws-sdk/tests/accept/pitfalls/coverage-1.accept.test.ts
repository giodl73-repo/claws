/**
 * Acceptance tests: pitfall-coverage-1 series (10 scenarios)
 *
 * Validates pitfall edge cases from the first scenario round (P-051
 * through P-070). Dispatches to compile-sim, pinch-sim, and emit-sim.
 *
 * Per-scenario reporting: each scenario gets its own it() block.
 *
 * @module claws-sdk/tests/accept/pitfalls/coverage-1
 */

import { describe, it, expect } from 'vitest';
import {
  discoverSeriesScenarios,
  runSingleScenario,
} from '../utils/manifest-runner.js';

const scenarios = discoverSeriesScenarios('pitfall-coverage-1');

describe('accept: pitfall-coverage-1', () => {
  it('discovers at least 10 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(10);
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
