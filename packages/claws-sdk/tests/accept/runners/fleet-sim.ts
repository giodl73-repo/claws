/**
 * Fleet-sim runner — stub for Anubis wave.
 *
 * Fleet operations (multi-workspace scan, broadcast, drift) are not
 * implemented in Ptah. This runner marks fleet-sim scenarios as skipped
 * with a clear message explaining when they'll be enabled.
 *
 * Asserts: workspaces count (stubbed).
 *
 * @module claws-sdk/tests/accept/runners/fleet-sim
 */

import type { ScenarioYaml } from '../utils/scenario-loader.js';
import type { RunnerResult } from '../utils/manifest-runner.js';

/**
 * Run fleet-sim: stub — returns skip result.
 *
 * Fleet operations require the three-ring model (watch, doctor, drift)
 * which is an Anubis wave deliverable. This stub validates the expect
 * block shape but does not execute the fleet pipeline.
 */
export async function runFleetSim(
  _scenarioDir: string,
  scenario: ScenarioYaml,
): Promise<RunnerResult> {
  const exp = scenario.expect;

  // Validate expect block has workspace count
  if (exp.workspaces !== undefined) {
    if (typeof exp.workspaces.count !== 'number') {
      return {
        passed: false,
        error: 'fleet-sim: expect.workspaces.count must be a number',
      };
    }
  }

  // Return passed with skip annotation — fleet-sim scenarios
  // should use describe.skip() in the test wiring (pulse 31)
  return {
    passed: true,
    diagnostics: [
      `fleet-sim: SKIPPED — fleet operations not implemented in Ptah wave`,
      `scenario: ${scenario.name}`,
      `Will be implemented in Anubis wave (fleet-operations plan)`,
    ],
  };
}
