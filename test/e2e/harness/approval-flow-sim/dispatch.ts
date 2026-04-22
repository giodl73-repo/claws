/**
 * test/e2e/harness/approval-flow-sim/dispatch — `defineApprovalFlow` factory.
 *
 * Scenario files call `defineApprovalFlow(scenario)` at module top-level;
 * the factory emits a vitest `it()` block whose body invokes the runner.
 * That way every SC-01..SC-27 test file is a thin declaration rather than
 * a box of vitest boilerplate, and the runner owns harness lifecycle in a
 * single place.
 *
 * The `it` binding is injected via parameter so this module stays
 * importable outside of vitest (the unit test below uses a stub to
 * observe what the dispatcher registers without standing up a suite).
 *
 * @module test/e2e/harness/approval-flow-sim/dispatch
 */
import { it as vitestIt } from 'vitest';
import { runApprovalFlow, type RunApprovalFlowOptions } from './run.ts';
import type { ApprovalFlowScenario } from './types.ts';

/** Minimum shape of vitest's `it` we need. */
export type ItFn = (name: string, fn: () => Promise<void>) => void;

export function defineApprovalFlow(
  scenario: ApprovalFlowScenario,
  options: RunApprovalFlowOptions = {},
  itImpl: ItFn = vitestIt as unknown as ItFn,
): void {
  itImpl(scenario.name, async () => {
    await runApprovalFlow(scenario, options);
  });
}
