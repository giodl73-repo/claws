/**
 * Acceptance tests: loss-aware-emission series (5 scenarios)
 *
 * Validates loss-aware routing: 7-platform loss matrix, path enumerator,
 * --strict-loss for R5. Runs through compile-sim.
 *
 * Per-scenario reporting: each scenario gets its own it() block.
 *
 * @module claws-sdk/tests/accept/emit/loss
 */

import { describe, it, expect } from 'vitest';
import {
  discoverSeriesScenarios,
  runSingleScenario,
} from '../utils/manifest-runner.js';

const scenarios = discoverSeriesScenarios('loss-aware-emission');

describe('accept: loss-aware-emission', () => {
  it('discovers at least 5 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(5);
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
