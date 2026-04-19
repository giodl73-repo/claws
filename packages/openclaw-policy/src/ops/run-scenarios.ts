/**
 * runScenarios — replay YAML-declared scenarios against a running mock
 * gateway (or a production endpoint speaking the same decision protocol).
 *
 * Each scenario has a `given` (the event to replay) and an `expect` (the
 * decision + audit shape the policy must produce). Results are a per-case
 * pass/fail with granular failure strings so CI logs are useful.
 *
 * @module @bic/openclaw-policy/ops/run-scenarios
 */

import type {
  ScenarioCase,
  ScenarioCaseResult,
  ScenarioRunOptions,
  ScenarioRunResult,
} from './types.js';

interface DecisionResponse {
  readonly decision: 'allow' | 'deny' | 'review' | 'modify';
  readonly requireApproval?: boolean;
  readonly audit?: { event: string; policyId?: string };
}

function snapshotName(c: ScenarioCase, idx: number): string {
  return c.name !== undefined && c.name.length > 0 ? c.name : `scenario-${idx}`;
}

async function dispatchCase(
  c: ScenarioCase,
  gatewayUrl: string,
  fetchImpl: typeof fetch,
): Promise<DecisionResponse> {
  const endpoint = c.given.tool_call !== undefined
    ? `${gatewayUrl}/v1/before_tool_call`
    : `${gatewayUrl}/v1/before_file_ingest`;
  const body = c.given.tool_call !== undefined ? c.given.tool_call : c.given.file_ingest;
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`gateway ${endpoint} returned ${res.status}`);
  }
  return (await res.json()) as DecisionResponse;
}

function evaluateExpectation(
  c: ScenarioCase,
  response: DecisionResponse,
): readonly string[] {
  const failures: string[] = [];
  if (response.decision !== c.expect.decision) {
    failures.push(`decision: expected ${c.expect.decision}, got ${response.decision}`);
  }
  if (c.expect.requireApproval !== undefined && response.requireApproval !== c.expect.requireApproval) {
    failures.push(`requireApproval: expected ${c.expect.requireApproval}, got ${response.requireApproval}`);
  }
  if (c.expect.audit !== undefined) {
    const auditResp = response.audit;
    if (auditResp === undefined) {
      failures.push('audit: expected audit record, got none');
    } else {
      if (auditResp.event !== c.expect.audit.event) {
        failures.push(`audit.event: expected ${c.expect.audit.event}, got ${auditResp.event}`);
      }
      const mustContain = c.expect.audit.policyId !== undefined ? c.expect.audit.policyId.must_contain : undefined;
      if (mustContain !== undefined) {
        const actual = auditResp.policyId !== undefined ? auditResp.policyId : '';
        if (!actual.includes(mustContain)) {
          failures.push(`audit.policyId: expected to contain "${mustContain}", got "${actual}"`);
        }
      }
    }
  }
  return failures;
}

export async function runScenarios(options: ScenarioRunOptions): Promise<ScenarioRunResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const cases: ScenarioCaseResult[] = [];

  for (let i = 0; i < options.cases.length; i++) {
    const c = options.cases[i]!;
    const name = snapshotName(c, i);
    try {
      const response = await dispatchCase(c, options.gatewayUrl, fetchImpl);
      const failures = evaluateExpectation(c, response);
      cases.push({
        name,
        snapshot: c.snapshot,
        passed: failures.length === 0,
        failures,
      });
    } catch (err) {
      cases.push({
        name,
        snapshot: c.snapshot,
        passed: false,
        failures: [err instanceof Error ? err.message : String(err)],
      });
    }
  }

  const passed = cases.filter((c) => c.passed).length;
  return {
    total: cases.length,
    passed,
    failed: cases.length - passed,
    cases,
  };
}

/**
 * Parse a minimal subset of YAML scenario documents — just enough for the
 * scenario fixture shape in policy.md §Behaviour tests. Arrays are declared
 * with `- ` items; nested maps use indentation. For richer YAML, consumers
 * should pass already-parsed `ScenarioCase[]`.
 */
export function parseScenarioYaml(yaml: string): readonly ScenarioCase[] {
  // Simple block parser: split on `---` separators, each document is one case.
  const docs = yaml.split(/^---\s*$/m).map((d) => d.trim()).filter((d) => d.length > 0);
  return docs.map((doc) => parseDoc(doc));
}

function parseDoc(doc: string): ScenarioCase {
  const root = parseBlock(doc.split('\n'), 0, 0).value as Record<string, unknown>;
  const snapshot = typeof root['snapshot'] === 'string' ? root['snapshot'] : String(root['snapshot']);
  const given = root['given'] as ScenarioCase['given'];
  const expect = root['expect'] as ScenarioCase['expect'];
  const name = root['name'];
  return typeof name === 'string' ? { snapshot, given, expect, name } : { snapshot, given, expect };
}

interface ParseFrame {
  readonly value: unknown;
  readonly nextLine: number;
}

function indentOf(line: string): number {
  let n = 0;
  while (n < line.length && line[n] === ' ') n++;
  return n;
}

function parseScalar(raw: string): unknown {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseBlock(lines: readonly string[], start: number, baseIndent: number): ParseFrame {
  const out: Record<string, unknown> = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    const indent = indentOf(line);
    if (indent < baseIndent) break;
    const content = line.trim();
    const colonIdx = content.indexOf(':');
    const key = content.slice(0, colonIdx).trim();
    const rest = content.slice(colonIdx + 1).trim();
    if (rest.length === 0) {
      const child = parseBlock(lines, i + 1, baseIndent + 2);
      out[key] = child.value;
      i = child.nextLine;
    } else {
      out[key] = parseScalar(rest);
      i++;
    }
  }
  return { value: out, nextLine: i };
}
