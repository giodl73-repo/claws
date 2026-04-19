/**
 * Cross-package conformance test — @bic/openclaw-policy and
 * @bic/openclaw-snap MUST produce byte-identical policyId for the same
 * PolicyIR. Both now delegate to `computeStrippedHash` in
 * @bic/openclaw-workspace/canonicalize; this test asserts that drift
 * between the two consumers is detected the moment either side stops
 * using the shared helper.
 *
 * Spec anchor: workspace.md §/canonicalize — "One canonicalizer, shared
 * across the family."
 */

import { describe, expect, it } from 'vitest';
import { computePolicyId as policyComputeId } from '@bic/openclaw-policy';
import type { PolicyIR } from '@bic/openclaw-policy';
import { computePolicyId as snapComputeId } from '../src/canonical.js';

function buildPolicyIR(): PolicyIR {
  return {
    version: '1',
    policyId: 'sha256-placeholder',
    canonicalizerVersion: '1.0.0',
    soul: {
      denyRules: [
        { id: 'd1', pattern: 'secret.*', reason: 'no leak', severity: 'block' },
      ],
      modelAllowlist: ['gpt-4o-mini'],
      tone: 'neutral',
    },
    user: {
      oboScope: ['user.read'],
      authorityBounds: [{ scope: 'org:x', grants: ['read'] }],
    },
    agents: {
      delegationMap: { a: ['b'] },
      architectureBoundaries: [{ from: 'a', to: 'b', kind: 'delegation' }],
    },
    tools: [
      { name: 'fetch', riskLevel: 2, capabilities: ['READ'] },
    ],
    skills: [
      {
        path: 'skills/greet',
        riskLevel: 1,
        sensitivity: 'INTERNAL',
        declaredCapabilities: ['READ'],
      },
    ],
    governance: {
      rules: [
        { id: 'g1', family: 'tone', predicate: 'true', level: 'warning' },
      ],
      sensitivityPropagation: [{ from: 'a', to: 'b', sensitivity: 'INTERNAL' }],
      governanceSurface: ['SOUL.md'],
    },
    identity: { name: 'Test' },
  };
}

describe('policyId conformance — policy ↔ snap must not drift', () => {
  it('produces byte-identical hashes for a realistic PolicyIR', () => {
    const ir = buildPolicyIR();
    const p = policyComputeId(ir);
    const s = snapComputeId(ir as unknown as Record<string, unknown>);
    expect(p).toBe(s);
    expect(p).toMatch(/^sha256-[A-Za-z0-9_-]+$/);
  });

  it('is invariant to the declared policyId / canonicalizerVersion fields', () => {
    const a = buildPolicyIR();
    const b = buildPolicyIR();
    (b as { policyId: string }).policyId = 'sha256-something-else';
    (b as { canonicalizerVersion: string }).canonicalizerVersion = '9.9.9';
    expect(policyComputeId(a)).toBe(policyComputeId(b));
    expect(snapComputeId(a as unknown as Record<string, unknown>)).toBe(
      snapComputeId(b as unknown as Record<string, unknown>),
    );
    expect(policyComputeId(a)).toBe(
      snapComputeId(b as unknown as Record<string, unknown>),
    );
  });
});
