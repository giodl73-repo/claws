/**
 * Acceptance tests: lossless-roundtrip series (5 scenarios)
 *
 * Validates round-trip fidelity: parse -> IR -> emit preserves original
 * workspace byte-for-byte. Runs through compile-sim.
 *
 * Per-scenario reporting: each scenario gets its own it() block.
 *
 * @module claws-sdk/tests/accept/compile/roundtrip
 */

import { describe, it, expect } from 'vitest';
import {
  discoverSeriesScenarios,
  runSingleScenario,
} from '../utils/manifest-runner.js';

const scenarios = discoverSeriesScenarios('lossless-roundtrip');

describe('accept: lossless-roundtrip', () => {
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
