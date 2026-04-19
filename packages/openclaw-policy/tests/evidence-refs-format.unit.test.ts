/**
 * Regression: every `oc_uri` evidence ref produced by evaluateCompliance must
 * round-trip through `parseOcPath` (i.e., be a valid oc:// path built by
 * `formatOcPath`). Closes policy-md L31 directive: policy packages must use
 * the workspace `/path` formatter, not raw string concatenation.
 */
import { describe, it, expect } from 'vitest';
import { isValidOcPath, parseOcPath } from '@bic/openclaw-workspace/path';

import { evaluateCompliance } from '../src/ops/evaluate-compliance.js';
import type { Rubric } from '../src/ops/types.js';
import { MINIMAL_IR } from './ops-fixtures.js';

const FULL_RUBRIC: Rubric = {
  id: 'test-rubric',
  version: '1.0',
  framework: 'Test Framework',
  requirements: [
    { id: 'R1', title: 'R5 has irreversible-external', kind: 'static', predicate: 'every-r5-has-irreversible-external' },
    { id: 'R2', title: 'Has deny rules', kind: 'static', predicate: 'has-deny-rules' },
    { id: 'R3', title: 'Model allowlist nonempty', kind: 'static', predicate: 'model-allowlist-nonempty' },
    { id: 'R4', title: 'Has governance rules', kind: 'static', predicate: 'has-governance-rules' },
    { id: 'R5', title: 'Authority bounds declared', kind: 'static', predicate: 'authority-bounds-declared' },
    { id: 'R6', title: 'Audit retention', kind: 'structural', predicate: 'audit-retention-1-year' },
    { id: 'R7', title: 'Audit tamper seal', kind: 'structural', predicate: 'audit-tamper-seal-present' },
  ],
};

// Extended IR where every R5 tool has IRREVERSIBLE_EXTERNAL — so the R5
// predicate passes and emits per-tool evidence.
const PASSING_IR = {
  ...MINIMAL_IR,
  tools: MINIMAL_IR.tools.map((t) =>
    t.riskLevel === 5 && !t.capabilities.includes('IRREVERSIBLE_EXTERNAL')
      ? { ...t, capabilities: [...t.capabilities, 'IRREVERSIBLE_EXTERNAL' as const] }
      : t,
  ),
};

describe('evaluateCompliance — evidence refs use formatOcPath', () => {
  it('every oc_uri evidence ref across 7 sites is a valid oc:// path', () => {
    const report = evaluateCompliance({
      rubric: FULL_RUBRIC,
      input: {
        snapshotId: 'sha256-evref',
        policyIR: PASSING_IR,
        auditManifest: { retentionDays: 400, algorithm: 'sha256', hasTamperSeal: true },
      },
      signingKey: 'k',
      keyId: 'id',
    });
    const ocRefs = report.results.flatMap((r) => r.evidence.filter((e) => e.type === 'oc_uri'));
    expect(ocRefs.length).toBeGreaterThanOrEqual(7);
    for (const e of ocRefs) {
      expect(isValidOcPath(e.ref)).toBe(true);
    }
  });

  it('policy/tool/<name> ref parses with expected segments', () => {
    const report = evaluateCompliance({
      rubric: { ...FULL_RUBRIC, requirements: [FULL_RUBRIC.requirements[0]!] },
      input: { snapshotId: 's', policyIR: PASSING_IR },
      signingKey: 'k',
      keyId: 'id',
    });
    const refs = report.results[0]!.evidence.map((e) => parseOcPath(e.ref));
    expect(refs.length).toBeGreaterThan(0);
    for (const p of refs) {
      expect(p.file).toBe('policy');
      expect(p.section).toBe('tool');
      expect(p.item).toBeDefined();
    }
  });

  it('policy/soul/deny/<id> ref parses with field = rule id', () => {
    const report = evaluateCompliance({
      rubric: { ...FULL_RUBRIC, requirements: [FULL_RUBRIC.requirements[1]!] },
      input: { snapshotId: 's', policyIR: MINIMAL_IR },
      signingKey: 'k',
      keyId: 'id',
    });
    const refs = report.results[0]!.evidence.map((e) => parseOcPath(e.ref));
    for (const p of refs) {
      expect(p.file).toBe('policy');
      expect(p.section).toBe('soul');
      expect(p.item).toBe('deny');
      expect(p.field).toBeDefined();
    }
  });

  it('audit/manifest refs drop the embedded value (URI is a pointer)', () => {
    const report = evaluateCompliance({
      rubric: {
        ...FULL_RUBRIC,
        requirements: [FULL_RUBRIC.requirements[5]!, FULL_RUBRIC.requirements[6]!],
      },
      input: {
        snapshotId: 's',
        policyIR: MINIMAL_IR,
        auditManifest: { retentionDays: 400, algorithm: 'sha256', hasTamperSeal: true },
      },
      signingKey: 'k',
      keyId: 'id',
    });
    const refs = report.results.flatMap((r) => r.evidence.map((e) => e.ref));
    expect(refs.length).toBeGreaterThanOrEqual(2);
    for (const ref of refs) {
      expect(ref).not.toMatch(/=\d/);
      expect(ref).not.toMatch(/=true/);
      const parsed = parseOcPath(ref);
      expect(parsed.file).toBe('audit');
      expect(parsed.section).toBe('manifest');
    }
  });
});
