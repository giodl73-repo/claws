/**
 * Acceptance tests: cross-file-conflicts series (7 scenarios)
 *
 * Validates 7 cross-file conflict categories: DENY-vs-TOOL,
 * TRUST-ESCALATION, OBO-WITHOUT-ELICIT, etc. Runs through compile-sim.
 *
 * Per-scenario reporting: each scenario gets its own it() block.
 *
 * @module claws-sdk/tests/accept/compile/conflicts
 */

import { describe, it, expect } from 'vitest';
import {
  discoverSeriesScenarios,
  runSingleScenario,
} from '../utils/manifest-runner.js';

const scenarios = discoverSeriesScenarios('cross-file-conflicts');

describe('accept: cross-file-conflicts', () => {
  it('discovers at least 7 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(7);
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
