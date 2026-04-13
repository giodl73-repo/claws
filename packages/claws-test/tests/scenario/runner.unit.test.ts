/**
 * L0: ScenarioRunner — replay scenarios, compare declared vs actual behavior.
 */

import { describe, it, expect } from 'vitest';
import {
  parseDeclaredBehavior,
  compareBehavior,
  runScenario,
  runAllScenarios,
} from '../../src/scenario/runner.js';
import type { HandlerResult, SkillHandlerAdapter } from '../../src/scenario/runner.js';
import type { ParsedScenario } from '../../src/types.js';

describe('parseDeclaredBehavior', () => {
  it('extracts tool references from then clause', () => {
    const behavior = parseDeclaredBehavior('uses file-read and calls web-search');
    expect(behavior.expectedTools).toContain('file-read');
    expect(behavior.expectedTools).toContain('web-search');
  });

  it('extracts OBO domain references', () => {
    const behavior = parseDeclaredBehavior('accesses email');
    expect(behavior.expectedObo).toContain('email');
  });

  it('detects output expectation', () => {
    const behavior = parseDeclaredBehavior('returns the file content');
    expect(behavior.expectsOutput).toBe(true);
  });

  it('detects error expectation', () => {
    const behavior = parseDeclaredBehavior('fails with authentication error');
    expect(behavior.expectsError).toBe(true);
  });

  it('extracts tool references from expanded verbs', () => {
    const behavior = parseDeclaredBehavior('invokes shell-exec and triggers webhook-notifier');
    expect(behavior.expectedTools).toContain('shell-exec');
    expect(behavior.expectedTools).toContain('webhook-notifier');
  });

  it('extracts OBO references from expanded verbs', () => {
    const behavior = parseDeclaredBehavior('reads inbox and writes to calendar');
    expect(behavior.expectedObo).toContain('inbox');
    expect(behavior.expectedObo).toContain('calendar');
  });

  it('detects output from expanded verbs', () => {
    const behavior = parseDeclaredBehavior('produces a JSON report');
    expect(behavior.expectsOutput).toBe(true);
  });

  it('detects error from expanded verbs', () => {
    const behavior = parseDeclaredBehavior('denies access to the resource');
    expect(behavior.expectsError).toBe(true);
  });
});

describe('compareBehavior', () => {
  it('returns empty deltas when declared matches actual', () => {
    const declared = { expectedTools: ['file-read'] };
    const actual: HandlerResult = {
      toolsUsed: ['file-read'],
      oboAccessed: [],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(0);
  });

  it('returns delta when tool usage differs', () => {
    const declared = { expectedTools: ['file-read'] };
    const actual: HandlerResult = {
      toolsUsed: ['web-search'],
      oboAccessed: [],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.field).toBe('tools');
    expect(deltas[0]!.declared).toBe('file-read');
    expect(deltas[0]!.actual).toBe('web-search');
  });

  it('returns delta when OBO access differs', () => {
    const declared = { expectedObo: ['email'] };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: ['calendar'],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.field).toBe('obo');
    expect(deltas[0]!.declared).toBe('email');
    expect(deltas[0]!.actual).toBe('calendar');
  });

  it('returns "(none)" when actual tools are empty but expected are set', () => {
    const declared = { expectedTools: ['file-read'] };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: [],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.actual).toBe('(none)');
  });

  it('returns "(none)" when actual OBO is empty but expected are set', () => {
    const declared = { expectedObo: ['email'] };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: [],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.field).toBe('obo');
    expect(deltas[0]!.actual).toBe('(none)');
  });

  it('returns delta when output expectation mismatches (expected but not produced)', () => {
    const declared = { expectsOutput: true };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: [],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.field).toBe('output');
    expect(deltas[0]!.declared).toBe('expected');
    expect(deltas[0]!.actual).toBe('not produced');
  });

  it('returns delta when output is not expected but produced', () => {
    const declared = { expectsOutput: false };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: [],
      hasOutput: true,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.field).toBe('output');
    expect(deltas[0]!.declared).toBe('not expected');
    expect(deltas[0]!.actual).toBe('produced');
  });

  it('no output delta when expectation matches actual', () => {
    const declared = { expectsOutput: true };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: [],
      hasOutput: true,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(0);
  });

  it('returns delta when error is expected but not thrown', () => {
    const declared = { expectsError: true };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: [],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.field).toBe('error');
    expect(deltas[0]!.declared).toBe('expected');
    expect(deltas[0]!.actual).toBe('none');
  });

  it('returns delta when error is not expected but thrown', () => {
    const declared = { expectsError: false };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: [],
      hasOutput: false,
      error: 'something broke',
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.field).toBe('error');
    expect(deltas[0]!.declared).toBe('not expected');
    expect(deltas[0]!.actual).toBe('thrown: something broke');
  });

  it('no error delta when expectation matches actual', () => {
    const declared = { expectsError: true };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: [],
      hasOutput: false,
      error: 'some error',
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(0);
  });

  it('skips tool comparison when expectedTools is undefined', () => {
    const declared = {};
    const actual: HandlerResult = {
      toolsUsed: ['anything'],
      oboAccessed: [],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(0);
  });

  it('skips tool comparison when expectedTools is empty', () => {
    const declared = { expectedTools: [] as string[] };
    const actual: HandlerResult = {
      toolsUsed: ['anything'],
      oboAccessed: [],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(0);
  });

  it('skips OBO comparison when expectedObo is empty', () => {
    const declared = { expectedObo: [] as string[] };
    const actual: HandlerResult = {
      toolsUsed: [],
      oboAccessed: ['anything'],
      hasOutput: false,
    };

    const deltas = compareBehavior(declared, actual);
    expect(deltas).toHaveLength(0);
  });
});

describe('runScenario', () => {
  it('replays a scenario and returns declared-vs-actual delta', async () => {
    const scenario: ParsedScenario = {
      name: 'Test scenario',
      given: 'user is authenticated',
      when: 'user requests data',
      then: 'uses file-read and returns the data',
    };

    const handler: SkillHandlerAdapter = {
      async execute(_input: string): Promise<HandlerResult> {
        return {
          toolsUsed: ['file-read'],
          oboAccessed: [],
          hasOutput: true,
        };
      },
    };

    const result = await runScenario(scenario, handler);
    expect(result.name).toBe('Test scenario');
    expect(result.pass).toBe(true);
    expect(result.deltas).toHaveLength(0);
  });

  it('detects behavior mismatch', async () => {
    const scenario: ParsedScenario = {
      name: 'Mismatch scenario',
      given: 'user is authenticated',
      when: 'user requests data',
      then: 'uses file-read',
    };

    const handler: SkillHandlerAdapter = {
      async execute(_input: string): Promise<HandlerResult> {
        return {
          toolsUsed: ['web-search'],
          oboAccessed: [],
          hasOutput: false,
        };
      },
    };

    const result = await runScenario(scenario, handler);
    expect(result.pass).toBe(false);
    expect(result.deltas.length).toBeGreaterThan(0);
  });

  it('emits warning when then-clause produces zero parsed expectations', async () => {
    const scenario: ParsedScenario = {
      name: 'Vacuous scenario',
      given: 'user is logged in',
      when: 'user does something',
      then: 'the system is in a valid state',
    };

    const handler: SkillHandlerAdapter = {
      async execute(_input: string): Promise<HandlerResult> {
        return {
          toolsUsed: ['anything'],
          oboAccessed: ['anything'],
          hasOutput: true,
        };
      },
    };

    const result = await runScenario(scenario, handler);
    expect(result.pass).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThan(0);
    expect(result.warnings![0]).toContain('zero parsed expectations');
  });

  it('handles handler errors gracefully', async () => {
    const scenario: ParsedScenario = {
      name: 'Error scenario',
      given: 'something',
      when: 'something else',
      then: 'something happens',
    };

    const handler: SkillHandlerAdapter = {
      async execute(_input: string): Promise<HandlerResult> {
        throw new Error('Handler crashed');
      },
    };

    const result = await runScenario(scenario, handler);
    expect(result.pass).toBe(false);
    expect(result.error).toBe('Handler crashed');
  });

  it('handles non-Error thrown values gracefully', async () => {
    const scenario: ParsedScenario = {
      name: 'String throw scenario',
      given: 'something',
      when: 'something else',
      then: 'something happens',
    };

    const handler: SkillHandlerAdapter = {
      async execute(_input: string): Promise<HandlerResult> {
        throw 'plain string error';
      },
    };

    const result = await runScenario(scenario, handler);
    expect(result.pass).toBe(false);
    expect(result.error).toBe('plain string error');
  });
});

describe('runAllScenarios', () => {
  it('runs all scenarios and returns results for each', async () => {
    const scenarios: ParsedScenario[] = [
      { name: 'Scenario A', given: 'ctx', when: 'action', then: 'uses file-read' },
      { name: 'Scenario B', given: 'ctx', when: 'action', then: 'uses web-search' },
    ];

    const handler: SkillHandlerAdapter = {
      async execute(_input: string): Promise<HandlerResult> {
        return {
          toolsUsed: ['file-read'],
          oboAccessed: [],
          hasOutput: false,
        };
      },
    };

    const results = await runAllScenarios(scenarios, handler);
    expect(results).toHaveLength(2);
    expect(results[0]!.name).toBe('Scenario A');
    expect(results[0]!.pass).toBe(true);
    expect(results[1]!.name).toBe('Scenario B');
    expect(results[1]!.pass).toBe(false);
  });

  it('returns empty array for empty scenarios list', async () => {
    const handler: SkillHandlerAdapter = {
      async execute(_input: string): Promise<HandlerResult> {
        return { toolsUsed: [], oboAccessed: [], hasOutput: false };
      },
    };

    const results = await runAllScenarios([], handler);
    expect(results).toHaveLength(0);
  });
});
