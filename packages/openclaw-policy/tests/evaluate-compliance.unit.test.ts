import { describe, it, expect } from 'vitest';

import {
  evaluateCompliance,
} from '../src/ops/evaluate-compliance.js';
import type { Rubric, ComplianceEvaluationInput } from '../src/ops/types.js';
import { MINIMAL_IR, EMPTY_IR } from './ops-fixtures.js';

const SIGNING_KEY = 'secret-abc';
const KEY_ID = 'test-key';

function makeRubric(partial: Partial<Rubric>): Rubric {
  return {
    id: 'test-rubric',
    version: '1.0',
    framework: 'Test Framework',
    requirements: [],
    ...partial,
  };
}

function baseInput(override: Partial<ComplianceEvaluationInput> = {}): ComplianceEvaluationInput {
  return {
    snapshotId: 'sha256-snap',
    policyIR: MINIMAL_IR,
    ...override,
  };
}

describe('evaluateCompliance — SOC2 rubric', () => {
  it('passes when R5 tools have IRREVERSIBLE_EXTERNAL and governance rules exist', () => {
    const rubric = makeRubric({
      id: 'soc2-slim',
      framework: 'SOC2',
      requirements: [
        { id: 'CC8.1', title: 'Change control', kind: 'static', predicate: 'every-r5-has-irreversible-external' },
        { id: 'CC6.1', title: 'Logical access', kind: 'static', predicate: 'has-governance-rules' },
      ],
    });
    // Remove the bad R5 tool for this case
    const input = baseInput({
      policyIR: { ...MINIMAL_IR, tools: MINIMAL_IR.tools.filter((t) => t.name !== 'delete-db') },
    });
    const report = evaluateCompliance({ rubric, input, signingKey: SIGNING_KEY, keyId: KEY_ID });
    expect(report.summary.pass).toBe(2);
    expect(report.summary.fail).toBe(0);
    expect(report.signature.algo).toBe('hmac-sha256');
    expect(report.signature.key_id).toBe(KEY_ID);
    expect(report.signature.value).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('evaluateCompliance — HIPAA rubric', () => {
  it('fails when audit retention is below 365 days', () => {
    const rubric = makeRubric({
      id: 'hipaa-slim',
      framework: 'HIPAA',
      requirements: [
        { id: '164.316(b)(2)', title: 'Retention', kind: 'structural', predicate: 'audit-retention-1-year' },
      ],
    });
    const input = baseInput({
      auditManifest: { retentionDays: 90, algorithm: 'sha256', hasTamperSeal: true },
    });
    const report = evaluateCompliance({ rubric, input, signingKey: SIGNING_KEY, keyId: KEY_ID });
    expect(report.summary.fail).toBe(1);
    expect(report.results[0]!.gaps?.[0]).toContain('90d');
  });
});

describe('evaluateCompliance — EU AI Act rubric', () => {
  it('marks review-decisions dynamic check as not_applicable when no window given', () => {
    const rubric = makeRubric({
      id: 'eu-slim',
      framework: 'EU AI Act',
      requirements: [
        { id: 'Art.14', title: 'Human oversight', kind: 'dynamic', predicate: 'review-decisions-were-approved' },
      ],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput(),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.na).toBe(1);
    expect(report.results[0]!.status).toBe('not_applicable');
  });
});

describe('evaluateCompliance — NIST AI RMF rubric', () => {
  it('flags empty IR with zero governance rules + empty allowlist', () => {
    const rubric = makeRubric({
      id: 'nist-slim',
      framework: 'NIST AI RMF',
      requirements: [
        { id: 'GOVERN-1.1', title: 'Governance', kind: 'static', predicate: 'has-governance-rules' },
        { id: 'Art.13', title: 'Allowlist', kind: 'static', predicate: 'model-allowlist-nonempty' },
        { id: 'MAP-1.1', title: 'Bounds', kind: 'static', predicate: 'authority-bounds-declared' },
      ],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput({ policyIR: EMPTY_IR }),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.fail + report.summary.partial).toBeGreaterThanOrEqual(2);
    expect(report.summary.total).toBe(3);
  });

  it('unknown predicate resolves to not_applicable, never silent pass', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'X', title: 'unknown', kind: 'static', predicate: 'does-not-exist' },
        { id: 'Y', title: 'unknown structural', kind: 'structural', predicate: 'also-missing' },
        { id: 'Z', title: 'unknown dynamic', kind: 'dynamic', predicate: 'also-gone' },
      ],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput(),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.na).toBe(3);
    expect(report.summary.pass).toBe(0);
  });

  it('dynamic R5 check passes when all R5 events had externalApproval', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'r5dyn', title: 'R5 dyn', kind: 'dynamic', predicate: 'r5-decisions-had-external-approval' },
      ],
    });
    const input = baseInput({
      window: { from: '2026-01-01', to: '2026-01-31' },
      auditEvents: [
        { timestamp: '2026-01-02T10:00:00Z', ruleId: 'R5-send-email', outcome: 'approved', externalApproval: true },
      ],
    });
    const report = evaluateCompliance({ rubric, input, signingKey: SIGNING_KEY, keyId: KEY_ID });
    expect(report.summary.pass).toBe(1);
    expect(report.evaluatedWindow?.from).toBe('2026-01-01');
  });

  it('deny-rules check passes on populated SOUL', () => {
    const rubric = makeRubric({
      requirements: [{ id: 'd', title: 'deny', kind: 'static', predicate: 'has-deny-rules' }],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput(),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.pass).toBe(1);
  });

  it('structural tamper-seal check returns not_applicable without auditManifest', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'ts', title: 'tamper', kind: 'structural', predicate: 'audit-tamper-seal-present' },
      ],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput(),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.na).toBe(1);
  });

  it('r5-every-has-irreversible fails when any R5 tool lacks IRREVERSIBLE_EXTERNAL', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'r5', title: 'r5 invariant', kind: 'static', predicate: 'every-r5-has-irreversible-external' },
      ],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput(),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.fail).toBe(1);
    expect(report.results[0]!.gaps?.[0]).toContain('delete-db');
  });

  it('r5-every-has-irreversible returns not_applicable when no R5 tools', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'r5', title: 'r5 invariant', kind: 'static', predicate: 'every-r5-has-irreversible-external' },
      ],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput({ policyIR: EMPTY_IR }),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.na).toBe(1);
  });

  it('authority-bounds-declared marks partial on missing bounds', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'b', title: 'bounds', kind: 'static', predicate: 'authority-bounds-declared' },
      ],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput({ policyIR: EMPTY_IR }),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.partial).toBe(1);
  });

  it('audit tamper-seal pass when manifest has tamper seal', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'ts', title: 'tamper', kind: 'structural', predicate: 'audit-tamper-seal-present' },
      ],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput({ auditManifest: { retentionDays: 400, algorithm: 'sha256', hasTamperSeal: true } }),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.pass).toBe(1);
  });

  it('review-decisions dynamic returns partial when some reviews still pending', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'r', title: 'review', kind: 'dynamic', predicate: 'review-decisions-were-approved' },
      ],
    });
    const input = baseInput({
      window: { from: 'a', to: 'b' },
      auditEvents: [
        { timestamp: 't1', ruleId: 'R3-x', decision: 'review', requireApproval: true, outcome: 'pending' },
        { timestamp: 't2', ruleId: 'R3-y', decision: 'review', requireApproval: true, outcome: 'approved' },
      ],
    });
    const report = evaluateCompliance({ rubric, input, signingKey: SIGNING_KEY, keyId: KEY_ID });
    expect(report.summary.partial).toBe(1);
  });

  it('now() override is honoured for deterministic generatedAt', () => {
    const rubric = makeRubric({ requirements: [] });
    const report = evaluateCompliance({
      rubric,
      input: baseInput(),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
      now: () => new Date('2026-04-18T00:00:00Z'),
    });
    expect(report.generatedAt).toBe('2026-04-18T00:00:00.000Z');
  });

  it('r5 dynamic predicate fails on missing externalApproval', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'r5dyn', title: 'R5 dyn', kind: 'dynamic', predicate: 'r5-decisions-had-external-approval' },
      ],
    });
    const input = baseInput({
      window: { from: 'a', to: 'b' },
      auditEvents: [
        { timestamp: 't1', ruleId: 'R5-send', outcome: 'approved' /* no externalApproval */ },
      ],
    });
    const report = evaluateCompliance({ rubric, input, signingKey: SIGNING_KEY, keyId: KEY_ID });
    expect(report.summary.fail).toBe(1);
  });

  it('model-allowlist-nonempty fails on empty allowlist', () => {
    const rubric = makeRubric({
      requirements: [
        { id: 'al', title: 'al', kind: 'static', predicate: 'model-allowlist-nonempty' },
      ],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput({ policyIR: EMPTY_IR }),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.fail).toBe(1);
  });

  it('has-deny-rules fails on empty SOUL', () => {
    const rubric = makeRubric({
      requirements: [{ id: 'd', title: 'd', kind: 'static', predicate: 'has-deny-rules' }],
    });
    const report = evaluateCompliance({
      rubric,
      input: baseInput({ policyIR: EMPTY_IR }),
      signingKey: SIGNING_KEY,
      keyId: KEY_ID,
    });
    expect(report.summary.fail).toBe(1);
  });
});
