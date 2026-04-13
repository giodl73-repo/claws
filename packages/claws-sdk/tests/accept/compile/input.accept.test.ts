/**
 * Acceptance tests: input-resolver series (6 scenarios)
 *
 * Validates InputResolver integration: 9-file default, package governance,
 * URL policies, provenance. Runs through compile-sim.
 *
 * Per-scenario reporting: each scenario gets its own it() block.
 *
 * @module claws-sdk/tests/accept/compile/input
 */

import { describe, it, expect } from 'vitest';
import {
  discoverSeriesScenarios,
  runSingleScenario,
} from '../utils/manifest-runner.js';

const scenarios = discoverSeriesScenarios('input-resolver');

describe('accept: input-resolver', () => {
  it('discovers at least 6 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(6);
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
