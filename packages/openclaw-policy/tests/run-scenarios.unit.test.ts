import { describe, it, expect } from 'vitest';

import { runScenarios, parseScenarioYaml } from '../src/ops/run-scenarios.js';
import type { ScenarioCase } from '../src/ops/types.js';

function makeFetch(
  responses: ReadonlyArray<Record<string, unknown>>,
): typeof fetch {
  let idx = 0;
  return (async (_url: string, _init: RequestInit) => {
    const body = responses[idx++] ?? { decision: 'allow' };
    return {
      ok: true,
      status: 200,
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
}

describe('runScenarios — YAML parse', () => {
  it('parses a single scenario document', () => {
    const yaml = `
snapshot: sha256-abc
given:
  tool_call:
    name: send-email
expect:
  decision: review
  requireApproval: true
`;
    const cases = parseScenarioYaml(yaml);
    expect(cases).toHaveLength(1);
    expect(cases[0]!.snapshot).toBe('sha256-abc');
    expect(cases[0]!.expect.decision).toBe('review');
    expect(cases[0]!.expect.requireApproval).toBe(true);
  });
});

describe('runScenarios — case execution', () => {
  it('runs a case and matches decision', async () => {
    const cases: ScenarioCase[] = [
      {
        snapshot: 'sha256-a',
        given: { tool_call: { name: 'send-email', args: {} } },
        expect: { decision: 'review', requireApproval: true, audit: { event: 'tool_call_reviewed' } },
      },
    ];
    const result = await runScenarios({
      gatewayUrl: 'http://localhost:0',
      cases,
      fetchImpl: makeFetch([
        { decision: 'review', requireApproval: true, audit: { event: 'tool_call_reviewed' } },
      ]),
    });
    expect(result.total).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.cases[0]!.passed).toBe(true);
  });
});

describe('runScenarios — assertion failure', () => {
  it('reports decision mismatch as a failure string', async () => {
    const cases: ScenarioCase[] = [
      {
        snapshot: 'sha256-a',
        given: { tool_call: { name: 'x', args: {} } },
        expect: { decision: 'deny' },
      },
    ];
    const result = await runScenarios({
      gatewayUrl: 'http://localhost:0',
      cases,
      fetchImpl: makeFetch([{ decision: 'allow' }]),
    });
    expect(result.failed).toBe(1);
    expect(result.cases[0]!.failures[0]).toContain('expected deny, got allow');
  });
});

describe('runScenarios — snapshot pin', () => {
  it('preserves snapshot id on each case result', async () => {
    const cases: ScenarioCase[] = [
      { snapshot: 'sha256-first', given: { tool_call: { name: 'x', args: {} } }, expect: { decision: 'allow' } },
      { snapshot: 'sha256-second', given: { tool_call: { name: 'y', args: {} } }, expect: { decision: 'allow' } },
    ];
    const result = await runScenarios({
      gatewayUrl: 'http://localhost:0',
      cases,
      fetchImpl: makeFetch([{ decision: 'allow' }, { decision: 'allow' }]),
    });
    expect(result.cases[0]!.snapshot).toBe('sha256-first');
    expect(result.cases[1]!.snapshot).toBe('sha256-second');
  });

  it('captures thrown gateway errors as case failures', async () => {
    const cases: ScenarioCase[] = [
      { snapshot: 'sha256-x', given: { tool_call: { name: 'x', args: {} } }, expect: { decision: 'allow' } },
    ];
    const failingFetch = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    const result = await runScenarios({ gatewayUrl: 'http://localhost:0', cases, fetchImpl: failingFetch });
    expect(result.failed).toBe(1);
    expect(result.cases[0]!.failures[0]).toContain('network down');
  });

  it('checks audit.policyId must_contain substring', async () => {
    const cases: ScenarioCase[] = [
      {
        snapshot: 'sha256-a',
        given: { tool_call: { name: 'send-email', args: {} } },
        expect: {
          decision: 'review',
          audit: { event: 'tool_call_reviewed', policyId: { must_contain: 'R5-send-email' } },
        },
      },
    ];
    const hitting = await runScenarios({
      gatewayUrl: 'http://localhost:0',
      cases,
      fetchImpl: makeFetch([
        { decision: 'review', audit: { event: 'tool_call_reviewed', policyId: 'sha256-xyz:R5-send-email' } },
      ]),
    });
    expect(hitting.passed).toBe(1);
    const missing = await runScenarios({
      gatewayUrl: 'http://localhost:0',
      cases,
      fetchImpl: makeFetch([
        { decision: 'review', audit: { event: 'tool_call_reviewed', policyId: 'sha256-xyz' } },
      ]),
    });
    expect(missing.failed).toBe(1);
    expect(missing.cases[0]!.failures[0]).toContain('R5-send-email');
  });

  it('fails with message when gateway returns non-ok http status', async () => {
    const cases: ScenarioCase[] = [
      { snapshot: 'sha256-x', given: { tool_call: { name: 'x', args: {} } }, expect: { decision: 'allow' } },
    ];
    const badFetch = (async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const result = await runScenarios({ gatewayUrl: 'http://localhost:0', cases, fetchImpl: badFetch });
    expect(result.failed).toBe(1);
    expect(result.cases[0]!.failures[0]).toContain('503');
  });
});
