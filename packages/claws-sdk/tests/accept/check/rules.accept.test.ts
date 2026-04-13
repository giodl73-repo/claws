/**
 * Acceptance tests: governance-rules series (12 scenarios)
 *
 * Validates all 29 governance rules: R1-R5 classification, A2A,
 * injection, elicitation, supply chain. Runs through pinch-sim.
 *
 * Per-scenario reporting: each scenario gets its own it() block.
 * Known-failing scenarios use it.fails() with reason strings.
 *
 * @module claws-sdk/tests/accept/check/rules
 */

import { describe, it, expect } from 'vitest';
import {
  discoverSeriesScenarios,
  runSingleScenario,
} from '../utils/manifest-runner.js';

/**
 * Known-failing governance-rules scenarios — rule implementation gaps
 * deferred to Anubis wave (CL-02 governance depth).
 */
const KNOWN_FAILURES: Record<string, string> = {
  'g-perm-capability': 'G-PERM-01 checks OBO+risk mismatch, not workspace capability matrix (Anubis CL-02)',
  'g-data-sensitivity': 'G-DATA rules need workspace-extracted sensitivity ceiling (Anubis CL-02)',
  'g-a2a-trust': 'G-A2A-TRUST checks escalation, not missing trust declarations (Anubis CL-02)',
  'g-input-isolation': 'G-INPUT rules don\'t detect injection patterns in single-tool setups (Anubis CL-02)',
  'g-context-memory': 'G-CONTEXT rules only fire on multi-agent setups (Anubis CL-02)',
  'g-output-pii': 'G-OUTPUT rules don\'t detect PII patterns (Anubis CL-02)',
  'g-elicit-timeout': 'TIMEOUT checks explicit allow, not absence of timeout config (Anubis CL-02)',
};

const scenarios = discoverSeriesScenarios('governance-rules');

describe('accept: governance-rules', () => {
  it('discovers at least 12 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(12);
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
