/**
 * Acceptance tests: fail-mode series (6 scenarios)
 *
 * Validates FailMode<R> enforcement: R5 always closed, R1-R2 configurable,
 * crash behavior. Dispatches to BOTH pinch-sim and security-sim runners.
 *
 * Per-scenario reporting: each scenario gets its own it() block.
 *
 * @module claws-sdk/tests/accept/check/fail-mode
 */

import { describe, it, expect } from 'vitest';
import {
  discoverSeriesScenarios,
  runSingleScenario,
} from '../utils/manifest-runner.js';

/**
 * Known-failing fail-mode scenarios — SECURITY-BLOCKED.
 * R5 fail-closed requires runtime enforcement (CL-03), deferred to Anubis.
 */
const KNOWN_FAILURES: Record<string, string> = {
  'hook-crash-r5': 'SECURITY-BLOCKED — R5 fail-closed requires runtime enforcement (CL-03), deferred to Anubis',
  'hook-timeout-r5': 'SECURITY-BLOCKED — R5 fail-closed requires runtime enforcement (CL-03), deferred to Anubis',
};

const scenarios = discoverSeriesScenarios('fail-mode');

describe('accept: fail-mode', () => {
  it('discovers at least 6 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(6);
  });

  for (const { info, yaml, runners } of scenarios) {
    const scenarioLabel = `S${String(info.id).padStart(2, '0')}-${info.name}`;
    const failReason = KNOWN_FAILURES[info.name];

    if (failReason) {
      it.fails(`${scenarioLabel} [KNOWN: ${failReason}]`, async () => {
        if (!yaml) throw new Error(`No scenario.yaml in ${info.dir}`);
        for (const runner of runners) {
          const result = await runSingleScenario(info.dir, yaml, runner);
          if (!result.passed) {
            throw new Error(result.error ?? 'scenario failed');
          }
        }
      }, 30_000);
    } else {
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
  }
});
