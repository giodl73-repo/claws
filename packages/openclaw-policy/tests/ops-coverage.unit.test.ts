/**
 * Targeted coverage tests for edge branches that aren't reached by the main
 * behavioural tests. Kept separate so the behavioural tests stay focused.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { append, createChainStore, type AuditEntry, type ChainStore } from '@bic/openclaw-guardrails/audit';

import { verifyAudit } from '../src/ops/verify-audit.js';
import { startMockGateway } from '../src/ops/mock-gateway.js';
import { runScenarios, parseScenarioYaml } from '../src/ops/run-scenarios.js';
import { loadRubric } from '../src/compliance/load-rubric.js';
import { evaluateCompliance } from '../src/ops/evaluate-compliance.js';
import type { MockGatewayHandle, ScenarioCase } from '../src/ops/types.js';
import { MINIMAL_IR } from './ops-fixtures.js';

const COVERAGE_HMAC_KEY = Buffer.alloc(32, 0x7a);

describe('verify-audit coverage', () => {
  it('handcrafted entry with bad hash reports invalid', () => {
    const r0: AuditEntry = {
      id: '00000000-0000-0000-0000-000000000001',
      timestamp: '2026-04-18T00:00:00Z',
      source: 's',
      action: 'a',
      target: 't',
      scope: 'policy:test',
      outcome: 'success',
      hash: 'abcd', // invalid hash
      previousHash: '0'.repeat(64),
    };
    const result = verifyAudit({ chain: [r0], hmacKey: COVERAGE_HMAC_KEY });
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(r0.id);
  });

  it('wrong hmac key reports invalid (timing-safe compare failure)', () => {
    let store: ChainStore = createChainStore();
    ({ store } = append(
      store,
      {
        timestamp: '2026-04-18T00:00:00Z',
        source: 's', actor: 'a', action: 'a', target: 't',
        scope: 'policy:test', outcome: 'success',
      },
      COVERAGE_HMAC_KEY,
    ));
    const result = verifyAudit({ chain: store.events, hmacKey: Buffer.alloc(32, 0xff) });
    expect(result.valid).toBe(false);
  });

  it('two-entry chain verifies end-to-end', () => {
    let store: ChainStore = createChainStore();
    ({ store } = append(
      store,
      {
        timestamp: '2026-04-18T00:00:00Z',
        source: 's', action: 'genesis', target: 't',
        scope: 'policy:test', outcome: 'success',
      },
      COVERAGE_HMAC_KEY,
    ));
    ({ store } = append(
      store,
      {
        timestamp: '2026-04-18T00:01:00Z',
        source: 's', action: 'tool_call', target: 't',
        scope: 'policy:test', outcome: 'success',
      },
      COVERAGE_HMAC_KEY,
    ));
    const result = verifyAudit({ chain: store.events, hmacKey: COVERAGE_HMAC_KEY });
    expect(result.valid).toBe(true);
    expect(result.length).toBe(2);
  });
});

describe('mock-gateway coverage', () => {
  let handle: MockGatewayHandle | undefined;
  afterEach(async () => {
    if (handle !== undefined) { await handle.close(); handle = undefined; }
  });

  it('GET /v1/health on custom host returns 200', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR, host: '127.0.0.1', port: 0 });
    const res = await fetch(`${handle.url}/v1/health`);
    expect(res.status).toBe(200);
  });

  it('POST file_ingest with invalid JSON returns 400', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_file_ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    expect(res.status).toBe(400);
  });

  it('unknown tool routes through review', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'unseen-tool', args: {} }),
    });
    const body = (await res.json()) as { decision: string };
    expect(body.decision).toBe('review');
  });

  it('PUT on tool_call path falls through to 404', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_tool_call`, { method: 'PUT' });
    expect(res.status).toBe(404);
  });

  it('ingest with no authority bounds declared allows path', async () => {
    const ir = { ...MINIMAL_IR, user: { ...MINIMAL_IR.user, authorityBounds: [] } };
    handle = await startMockGateway({ policyIR: ir });
    const res = await fetch(`${handle.url}/v1/before_file_ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/anywhere', content: 'x' }),
    });
    const body = (await res.json()) as { decision: string };
    expect(body.decision).toBe('allow');
  });

  it('deny pattern with invalid regex falls back to literal match', async () => {
    const ir = {
      ...MINIMAL_IR,
      soul: {
        ...MINIMAL_IR.soul,
        denyRules: [{ id: 'lit', pattern: '(unclosed[', reason: 'literal', severity: 'block' as const }],
      },
    };
    handle = await startMockGateway({ policyIR: ir });
    const res = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '(unclosed[', args: {} }),
    });
    const body = (await res.json()) as { decision: string };
    expect(body.decision).toBe('deny');
  });

  it('POST tool_call with empty body defaults to empty args', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    const res = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const body = (await res.json()) as { decision: string };
    expect(body.decision).toBe('review'); // unknown tool '' routes to review
  });
});

describe('run-scenarios coverage', () => {
  it('parseScenarioYaml tolerates multiple documents separated by ---', () => {
    const yaml = `
snapshot: sha256-a
given:
  tool_call:
    name: t1
expect:
  decision: allow
---
snapshot: sha256-b
given:
  tool_call:
    name: t2
expect:
  decision: deny
`;
    const cases = parseScenarioYaml(yaml);
    expect(cases).toHaveLength(2);
    expect(cases[1]!.expect.decision).toBe('deny');
  });

  it('parseScenarioYaml handles boolean, int, null, quoted scalars', () => {
    const yaml = `
snapshot: "sha256-q"
given:
  tool_call:
    name: t
expect:
  decision: allow
  requireApproval: false
`;
    const cases = parseScenarioYaml(yaml);
    expect(cases[0]!.snapshot).toBe('sha256-q');
    expect(cases[0]!.expect.requireApproval).toBe(false);
  });

  it('parseScenarioYaml tolerates comments and blank lines', () => {
    const yaml = `
# top-level comment
snapshot: sha256-c

given:
  tool_call:
    name: n
expect:
  decision: allow
`;
    const cases = parseScenarioYaml(yaml);
    expect(cases).toHaveLength(1);
  });

  it('file_ingest scenario dispatches to before_file_ingest endpoint', async () => {
    let capturedUrl = '';
    const cases: ScenarioCase[] = [
      {
        snapshot: 'sha256-fi',
        given: { file_ingest: { path: '/tmp/x', content: 'x' } },
        expect: { decision: 'allow' },
      },
    ];
    const fakeFetch = (async (url: string) => {
      capturedUrl = url;
      return { ok: true, status: 200, json: async () => ({ decision: 'allow' }) } as Response;
    }) as unknown as typeof fetch;
    const result = await runScenarios({ gatewayUrl: 'http://x', cases, fetchImpl: fakeFetch });
    expect(result.passed).toBe(1);
    expect(capturedUrl).toContain('before_file_ingest');
  });

  it('case without audit expectation matches decision only', async () => {
    const cases: ScenarioCase[] = [
      { snapshot: 's', given: { tool_call: { name: 't', args: {} } }, expect: { decision: 'allow' } },
    ];
    const f = (async () => ({
      ok: true, status: 200,
      json: async () => ({ decision: 'allow', audit: { event: 'x' } }),
    })) as unknown as typeof fetch;
    const result = await runScenarios({ gatewayUrl: 'http://x', cases, fetchImpl: f });
    expect(result.passed).toBe(1);
  });

  it('expected audit missing when response omits audit field', async () => {
    const cases: ScenarioCase[] = [
      {
        snapshot: 's',
        given: { tool_call: { name: 't', args: {} } },
        expect: { decision: 'allow', audit: { event: 'want' } },
      },
    ];
    const f = (async () => ({
      ok: true, status: 200,
      json: async () => ({ decision: 'allow' }),
    })) as unknown as typeof fetch;
    const result = await runScenarios({ gatewayUrl: 'http://x', cases, fetchImpl: f });
    expect(result.failed).toBe(1);
    expect(result.cases[0]!.failures[0]).toContain('got none');
  });

  it('requireApproval mismatch reported', async () => {
    const cases: ScenarioCase[] = [
      {
        snapshot: 's',
        given: { tool_call: { name: 't', args: {} } },
        expect: { decision: 'allow', requireApproval: true },
      },
    ];
    const f = (async () => ({
      ok: true, status: 200,
      json: async () => ({ decision: 'allow', requireApproval: false }),
    })) as unknown as typeof fetch;
    const result = await runScenarios({ gatewayUrl: 'http://x', cases, fetchImpl: f });
    expect(result.failed).toBe(1);
    expect(result.cases[0]!.failures[0]).toContain('requireApproval');
  });

  it('audit event mismatch reported', async () => {
    const cases: ScenarioCase[] = [
      {
        snapshot: 's',
        given: { tool_call: { name: 't', args: {} } },
        expect: { decision: 'allow', audit: { event: 'want' } },
      },
    ];
    const f = (async () => ({
      ok: true, status: 200,
      json: async () => ({ decision: 'allow', audit: { event: 'got' } }),
    })) as unknown as typeof fetch;
    const result = await runScenarios({ gatewayUrl: 'http://x', cases, fetchImpl: f });
    expect(result.failed).toBe(1);
    expect(result.cases[0]!.failures[0]).toContain('audit.event');
  });

  it('captures non-Error thrown value (string) via String()', async () => {
    const cases: ScenarioCase[] = [
      { snapshot: 's', given: { tool_call: { name: 't', args: {} } }, expect: { decision: 'allow' } },
    ];
    // Throw a non-Error (string) from fetch
    const badFetch = (async () => { throw 'gateway-down'; }) as unknown as typeof fetch;
    const result = await runScenarios({ gatewayUrl: 'http://x', cases, fetchImpl: badFetch });
    expect(result.failed).toBe(1);
    expect(result.cases[0]!.failures[0]).toBe('gateway-down');
  });

  it('parseScenarioYaml integer scalar', async () => {
    const { parseScenarioYaml } = await import('../src/ops/run-scenarios.js');
    const yaml = `
snapshot: sha
given:
  tool_call:
    name: t
    args:
      count: 42
expect:
  decision: allow
`;
    const cases = parseScenarioYaml(yaml);
    expect((cases[0]!.given.tool_call?.args as Record<string, unknown>).count).toBe(42);
  });

  it('parseScenarioYaml empty doc list when only whitespace', async () => {
    const { parseScenarioYaml } = await import('../src/ops/run-scenarios.js');
    expect(parseScenarioYaml('\n\n  \n')).toHaveLength(0);
  });

  it('case with custom name is preserved through run', async () => {
    const cases: ScenarioCase[] = [
      { name: 'my-case', snapshot: 's', given: { tool_call: { name: 't', args: {} } }, expect: { decision: 'allow' } },
    ];
    const f = (async () => ({ ok: true, status: 200, json: async () => ({ decision: 'allow' }) })) as unknown as typeof fetch;
    const result = await runScenarios({ gatewayUrl: 'http://x', cases, fetchImpl: f });
    expect(result.cases[0]!.name).toBe('my-case');
  });

  it('parses deeply indented nested keys', async () => {
    const { parseScenarioYaml } = await import('../src/ops/run-scenarios.js');
    const yaml = `
snapshot: sha256-deep
given:
  tool_call:
    name: deep-test
    args:
      x: "v"
expect:
  decision: review
  audit:
    event: some_event
    policyId:
      must_contain: "R5"
`;
    const cases = parseScenarioYaml(yaml);
    expect(cases[0]!.expect.audit?.policyId?.must_contain).toBe('R5');
  });
});

describe('load-rubric coverage', () => {
  const cleanup: string[] = [];
  afterEach(async () => {
    for (const d of cleanup) await rm(d, { recursive: true, force: true });
    cleanup.length = 0;
  });

  it('loads rubric from arbitrary path via { path }', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rubric-'));
    cleanup.push(dir);
    const p = join(dir, 'custom.yaml');
    await writeFile(p, 'id: custom\nversion: "1"\nframework: Custom\nrequirements:\n  - id: A\n    title: a\n    kind: static\n    predicate: has-deny-rules\n');
    const r = await loadRubric({ path: p });
    expect(r.id).toBe('custom');
    expect(r.requirements).toHaveLength(1);
  });

  it('ignores blank lines and comments in YAML', async () => {
    const { parseRubricYaml } = await import('../src/compliance/load-rubric.js');
    const y = `
# comment
id: x
version: "1"
framework: X
requirements:
  - id: A
    title: a
    kind: static
    predicate: has-deny-rules
`;
    const r = parseRubricYaml(y);
    expect(r.requirements).toHaveLength(1);
  });

  it('falls back to defaults when rubric YAML omits fields', async () => {
    const { parseRubricYaml } = await import('../src/compliance/load-rubric.js');
    const y = `
id: minimal
version: "1"
framework: M
requirements:
  - id: A
    title: a
    kind: static
    predicate: p
    description: desc here
  - id: B
`;
    const r = parseRubricYaml(y);
    expect(r.requirements[1]!.title).toBe('');
    expect(r.requirements[1]!.predicate).toBe('');
  });

  it('ignores garbage lines that do not match key:value pattern', async () => {
    const { parseRubricYaml } = await import('../src/compliance/load-rubric.js');
    const y = `
id: g
version: "1"
framework: G
not-a-colon-line
requirements:
  - id: A
    title: a
    kind: static
    predicate: p
    junkline
`;
    const r = parseRubricYaml(y);
    expect(r.id).toBe('g');
    expect(r.requirements).toHaveLength(1);
  });

  it('parses single-quoted strings', async () => {
    const { parseRubricYaml } = await import('../src/compliance/load-rubric.js');
    const y = `id: 'quoted-id'\nversion: '1.0'\nframework: F\nrequirements:\n  - id: A\n    title: 'a'\n    kind: static\n    predicate: p\n`;
    const r = parseRubricYaml(y);
    expect(r.id).toBe('quoted-id');
    expect(r.version).toBe('1.0');
  });
});

describe('evaluate-compliance coverage', () => {
  it('evidence paths render through renderer without crashing', () => {
    const rubric = {
      id: 'x', version: '1', framework: 'X',
      requirements: [
        { id: 'a', title: 'a', kind: 'static' as const, predicate: 'model-allowlist-nonempty' },
      ],
    };
    const report = evaluateCompliance({
      rubric,
      input: { snapshotId: 's', policyIR: MINIMAL_IR },
      signingKey: 'k', keyId: 'id',
    });
    expect(report.results[0]!.evidence).toHaveLength(1);
  });

  it('window passed through to report when supplied', () => {
    const rubric = { id: 'x', version: '1', framework: 'X', requirements: [] };
    const report = evaluateCompliance({
      rubric,
      input: { snapshotId: 's', policyIR: MINIMAL_IR, window: { from: 'a', to: 'b' } },
      signingKey: 'k', keyId: 'id',
    });
    expect(report.evaluatedWindow).toEqual({ from: 'a', to: 'b' });
  });

  it('r5 dynamic returns NA when events given but no window', () => {
    const rubric = {
      id: 'x', version: '1', framework: 'X',
      requirements: [
        { id: 'r5', title: 'r5', kind: 'dynamic' as const, predicate: 'r5-decisions-had-external-approval' },
      ],
    };
    const report = evaluateCompliance({
      rubric,
      input: {
        snapshotId: 's', policyIR: MINIMAL_IR,
        auditEvents: [{ timestamp: 't', ruleId: 'R5-x', outcome: 'ok' }],
      },
      signingKey: 'k', keyId: 'id',
    });
    expect(report.summary.na).toBe(1);
  });

  it('r5 dynamic returns NA when window+events but no R5 rule matches', () => {
    const rubric = {
      id: 'x', version: '1', framework: 'X',
      requirements: [
        { id: 'r5', title: 'r5', kind: 'dynamic' as const, predicate: 'r5-decisions-had-external-approval' },
      ],
    };
    const report = evaluateCompliance({
      rubric,
      input: {
        snapshotId: 's', policyIR: MINIMAL_IR,
        window: { from: 'a', to: 'b' },
        auditEvents: [{ timestamp: 't', ruleId: 'R1-x', outcome: 'ok' }],
      },
      signingKey: 'k', keyId: 'id',
    });
    expect(report.summary.na).toBe(1);
  });

  it('review-decisions dynamic returns NA when events empty', () => {
    const rubric = {
      id: 'x', version: '1', framework: 'X',
      requirements: [
        { id: 'r', title: 'r', kind: 'dynamic' as const, predicate: 'review-decisions-were-approved' },
      ],
    };
    const report = evaluateCompliance({
      rubric,
      input: { snapshotId: 's', policyIR: MINIMAL_IR, auditEvents: [] },
      signingKey: 'k', keyId: 'id',
    });
    expect(report.summary.na).toBe(1);
  });

  it('review-decisions dynamic passes when all reviews approved', () => {
    const rubric = {
      id: 'x', version: '1', framework: 'X',
      requirements: [
        { id: 'r', title: 'r', kind: 'dynamic' as const, predicate: 'review-decisions-were-approved' },
      ],
    };
    const report = evaluateCompliance({
      rubric,
      input: {
        snapshotId: 's', policyIR: MINIMAL_IR,
        auditEvents: [
          { timestamp: 't', ruleId: 'R3', decision: 'review', requireApproval: true, outcome: 'approved' },
        ],
      },
      signingKey: 'k', keyId: 'id',
    });
    expect(report.summary.pass).toBe(1);
  });
});
