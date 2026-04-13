/**
 * ScenarioRunner — replays SKILL.md scenarios against a skill handler
 * and compares declared vs actual behavior.
 *
 * @module @bic/claws-test/scenario/runner
 */

import type { ParsedScenario, ScenarioResult, BehaviorDelta } from '../types.js';

/**
 * A handler invocation result to compare against declared behavior.
 */
export interface HandlerResult {
  /** Tools actually used by the handler. */
  readonly toolsUsed: readonly string[];
  /** OBO domains actually accessed. */
  readonly oboAccessed: readonly string[];
  /** Whether the handler produced output. */
  readonly hasOutput: boolean;
  /** Error thrown by the handler, if any. */
  readonly error?: string;
}

/**
 * Skill handler adapter — wraps a skill handler for scenario replay.
 */
export interface SkillHandlerAdapter {
  /** Execute the handler with the given input and return observed behavior. */
  execute(input: string): Promise<HandlerResult>;
}

/**
 * Declared behavior extracted from a scenario's then clause.
 */
export interface DeclaredBehavior {
  /** Expected tools to be used. */
  readonly expectedTools?: readonly string[];
  /** Expected OBO domains. */
  readonly expectedObo?: readonly string[];
  /** Whether output is expected. */
  readonly expectsOutput?: boolean;
  /** Whether an error is expected. */
  readonly expectsError?: boolean;
}

/**
 * Parse declared behavior from a scenario's then clause.
 *
 * Extracts tool names, OBO domains, and output expectations
 * from natural language assertions.
 */
export function parseDeclaredBehavior(then: string): DeclaredBehavior {
  const behavior: {
    expectedTools?: string[];
    expectedObo?: string[];
    expectsOutput?: boolean;
    expectsError?: boolean;
  } = {};

  // Extract tool references: "uses tool-name", "calls tool-name", "invokes tool-name",
  // "executes tool-name", "runs tool-name", "triggers tool-name"
  // Verbs must be preceded by start-of-string or whitespace to avoid mid-word matches.
  const toolMatches = then.match(/(?:^|\s)(?:uses?|calls?|invokes?|executes?|runs?|triggers?)\s+(\S+)/gi);
  if (toolMatches) {
    behavior.expectedTools = toolMatches.map(m => {
      const parts = m.trim().split(/\s+/);
      return parts[parts.length - 1] ?? '';
    }).filter(Boolean);
  }

  // Extract OBO references: "accesses email", "acts on email", "reads email",
  // "writes to calendar", "queries database", "fetches records"
  // Verbs must be preceded by start-of-string or whitespace to avoid mid-word matches.
  const oboMatches = then.match(/(?:^|\s)(?:accesses?|acts?\s+on|reads?\s+from|reads?|writes?\s+to|writes?|queries|fetches|retrieves?)\s+(\S+)/gi);
  if (oboMatches) {
    behavior.expectedObo = oboMatches.map(m => {
      const parts = m.trim().split(/\s+/);
      return parts[parts.length - 1] ?? '';
    }).filter(Boolean);
  }

  // Output expectation: "returns ...", "outputs ...", "produces ...",
  // "responds with ...", "sends ...", "emits ...", "generates ..."
  if (/(?:returns?|outputs?|produces?|responds?\s+with|sends?|emits?|generates?)\s+/i.test(then)) {
    behavior.expectsOutput = true;
  }

  // Error expectation: "errors", "fails", "rejects", "throws", "denies", "blocks"
  if (/(?:errors?|fails?|rejects?|throws?|denies?|blocks?)\s+/i.test(then)) {
    behavior.expectsError = true;
  }

  return behavior;
}

/**
 * Compare declared behavior against actual handler result.
 * Returns behavior deltas where declared != actual.
 */
export function compareBehavior(
  declared: DeclaredBehavior,
  actual: HandlerResult,
): readonly BehaviorDelta[] {
  const deltas: BehaviorDelta[] = [];

  // Compare tools
  if (declared.expectedTools && declared.expectedTools.length > 0) {
    const expected = [...declared.expectedTools].sort().join(', ');
    const actualTools = [...actual.toolsUsed].sort().join(', ');
    if (expected !== actualTools) {
      deltas.push({
        field: 'tools',
        declared: expected,
        actual: actualTools || '(none)',
      });
    }
  }

  // Compare OBO
  if (declared.expectedObo && declared.expectedObo.length > 0) {
    const expected = [...declared.expectedObo].sort().join(', ');
    const actualObo = [...actual.oboAccessed].sort().join(', ');
    if (expected !== actualObo) {
      deltas.push({
        field: 'obo',
        declared: expected,
        actual: actualObo || '(none)',
      });
    }
  }

  // Compare output
  if (declared.expectsOutput !== undefined) {
    if (declared.expectsOutput !== actual.hasOutput) {
      deltas.push({
        field: 'output',
        declared: declared.expectsOutput ? 'expected' : 'not expected',
        actual: actual.hasOutput ? 'produced' : 'not produced',
      });
    }
  }

  // Compare error
  if (declared.expectsError !== undefined) {
    const hadError = actual.error !== undefined;
    if (declared.expectsError !== hadError) {
      deltas.push({
        field: 'error',
        declared: declared.expectsError ? 'expected' : 'not expected',
        actual: hadError ? `thrown: ${actual.error}` : 'none',
      });
    }
  }

  return deltas;
}

/**
 * Run a single scenario against a handler adapter.
 */
export async function runScenario(
  scenario: ParsedScenario,
  handler: SkillHandlerAdapter,
): Promise<ScenarioResult> {
  try {
    const declared = parseDeclaredBehavior(scenario.then);
    const actual = await handler.execute(scenario.when);
    const deltas = compareBehavior(declared, actual);
    const warnings: string[] = [];

    // Warn when a non-empty then-clause produces zero parsed expectations.
    // This means the scenario will pass vacuously regardless of handler behavior.
    const hasAnyExpectation =
      (declared.expectedTools && declared.expectedTools.length > 0) ||
      (declared.expectedObo && declared.expectedObo.length > 0) ||
      declared.expectsOutput !== undefined ||
      declared.expectsError !== undefined;

    if (scenario.then.trim().length > 0 && !hasAnyExpectation) {
      warnings.push(
        `Then-clause "${scenario.then}" produced zero parsed expectations — scenario passes vacuously`,
      );
    }

    return {
      name: scenario.name,
      pass: deltas.length === 0,
      deltas,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } catch (err) {
    return {
      name: scenario.name,
      pass: false,
      deltas: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Run all scenarios from a SKILL.md against a handler adapter.
 */
export async function runAllScenarios(
  scenarios: readonly ParsedScenario[],
  handler: SkillHandlerAdapter,
): Promise<readonly ScenarioResult[]> {
  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(scenario, handler));
  }
  return results;
}
