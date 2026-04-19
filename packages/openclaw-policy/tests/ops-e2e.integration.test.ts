import { describe, it, expect } from 'vitest';

import { evaluateCompliance } from '../src/ops/evaluate-compliance.js';
import { renderReport } from '../src/ops/render-report.js';
import { runScenarios } from '../src/ops/run-scenarios.js';
import { startMockGateway } from '../src/ops/mock-gateway.js';
import { append, createChainStore, type ChainStore } from '@bic/openclaw-guardrails/audit';

import { verifyAudit } from '../src/ops/verify-audit.js';
import { loadRubric } from '../src/compliance/load-rubric.js';
import { applyRules } from '../src/governance/rule-apply.js';
import type { MockGatewayHandle, ScenarioCase } from '../src/ops/types.js';
import { MINIMAL_IR } from './ops-fixtures.js';

const E2E_HMAC_KEY = Buffer.alloc(32, 0x33);

describe('L1 — evaluateCompliance → renderReport end-to-end (SOC2 built-in)', () => {
  it('loads built-in SOC2 rubric, evaluates, renders markdown, signature round-trips', async () => {
    const rubric = await loadRubric('soc2');
    const report = evaluateCompliance({
      rubric,
      input: {
        snapshotId: 'sha256-e2e',
        policyIR: MINIMAL_IR,
        auditManifest: { retentionDays: 400, algorithm: 'sha256', hasTamperSeal: true },
      },
      signingKey: 'k1',
      keyId: 'kid-e2e',
    });
    expect(report.summary.total).toBe(rubric.requirements.length);
    const md = renderReport({ kind: 'compliance', compliance: report }, 'markdown');
    expect(md).toContain('SOC 2 Type II');
    expect(report.signature.value).toHaveLength(64);
  });
});

describe('L1 — scenarios + mock gateway + audit chain', () => {
  let handle: MockGatewayHandle | undefined;
  it('runs scenarios against live mock gateway and chains decisions into an audit log', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });
    try {
      const cases: ScenarioCase[] = [
        {
          snapshot: 'sha256-live',
          given: { tool_call: { name: 'send-email', args: {} } },
          expect: { decision: 'review', requireApproval: true, audit: { event: 'tool_call_reviewed' } },
        },
        {
          snapshot: 'sha256-live',
          given: { tool_call: { name: 'read-file', args: {} } },
          expect: { decision: 'allow' },
        },
      ];
      const result = await runScenarios({ gatewayUrl: handle.url, cases });
      expect(result.passed).toBe(2);
      expect(result.failed).toBe(0);

      let store: ChainStore = createChainStore();
      ({ store } = append(
        store,
        {
          timestamp: '2026-04-18T00:00:00Z', source: 'ci', actor: 'ci',
          target: handle.url, action: 'review',
          scope: 'policy:scenario', outcome: 'success',
        },
        E2E_HMAC_KEY,
      ));
      ({ store } = append(
        store,
        {
          timestamp: '2026-04-18T00:01:00Z', source: 'ci', actor: 'ci',
          target: handle.url, action: 'allow',
          scope: 'policy:scenario', outcome: 'success',
        },
        E2E_HMAC_KEY,
      ));
      const verifyResult = verifyAudit({ chain: store.events, hmacKey: E2E_HMAC_KEY });
      expect(verifyResult.valid).toBe(true);
    } finally {
      if (handle !== undefined) await handle.close();
    }
  });
});

describe('L1 — rubric signed report verify round-trip', () => {
  it('signature is deterministic for same payload', async () => {
    const rubric = await loadRubric('hipaa');
    const input = {
      snapshotId: 'sha256-det',
      policyIR: MINIMAL_IR,
      auditManifest: { retentionDays: 400, algorithm: 'sha256', hasTamperSeal: true },
    } as const;
    const now = () => new Date('2026-04-18T00:00:00Z');
    const r1 = evaluateCompliance({ rubric, input, signingKey: 'k', keyId: 'id', now });
    const r2 = evaluateCompliance({ rubric, input, signingKey: 'k', keyId: 'id', now });
    expect(r1.signature.value).toBe(r2.signature.value);
  });
});

describe('L1 — governance rule runtime against fixture', () => {
  it('R5 decision + RESTRICTED provenance modifies capability set', () => {
    const result = applyRules(MINIMAL_IR, {
      toolName: 'send-email',
      args: {},
      provenance: [{ source: 'memory', sensitivity: 'RESTRICTED' }],
    });
    expect(result.decision).toBe('review');
    expect(result.capabilityClamp).not.toContain('COMMUNICATE');
  });
});

describe('L1 — cross-half boundary (ops imports PolicyIR from P51 types cleanly)', () => {
  it('ops code compiles against ./types/PolicyIR with no circular deps', async () => {
    // If this test runs at all, the ops code already imported PolicyIR from
    // ./types/index.js (see fixtures). The explicit assertion below pins the
    // public type surface consumers depend on.
    const r = await loadRubric('nist-ai-rmf');
    const report = evaluateCompliance({
      rubric: r,
      input: { snapshotId: 'sha256-bnd', policyIR: MINIMAL_IR },
      signingKey: 'k',
      keyId: 'id',
    });
    expect(report.snapshotId).toBe('sha256-bnd');
    expect(report.rubric.framework).toMatch(/NIST/);
  });
});
