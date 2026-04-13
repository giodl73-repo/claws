/**
 * L0: GovernanceHost interface contract validation.
 *
 * 1 unit test:
 * 1. GovernanceHost interface has exactly 6 facets
 */

import { describe, it, expect } from 'vitest';
import {
  GOVERNANCE_HOST_FACETS,
  type GovernanceHost,
} from '../../src/adapter/governance-host.js';

describe('GovernanceHost', () => {
  it('has exactly 6 facets', () => {
    expect(GOVERNANCE_HOST_FACETS).toHaveLength(6);
    expect(GOVERNANCE_HOST_FACETS).toEqual([
      'evaluatePolicy',
      'emitAuditEvent',
      'getConfig',
      'resolveToolRisk',
      'checkElicitation',
      'reportDiagnostic',
    ]);
  });

  it('facet names match GovernanceHost interface keys', () => {
    // Type-level check: create a mock that must satisfy GovernanceHost.
    // If any facet name is wrong, this will fail to compile.
    const mock: GovernanceHost = {
      evaluatePolicy: async () => ({
        allowed: true,
        blockReason: null,
        ruleId: 'test',
        auditMeta: {},
      }),
      emitAuditEvent: () => {},
      getConfig: <T>(_key: string, defaultValue: T) => defaultValue,
      resolveToolRisk: () => undefined,
      checkElicitation: async () => false,
      reportDiagnostic: () => {},
    };

    // Verify all 6 facets are callable
    for (const facet of GOVERNANCE_HOST_FACETS) {
      expect(typeof mock[facet]).toBe('function');
    }
  });

  it('facet list is frozen (immutable at runtime)', () => {
    // as const should make the array readonly
    expect(Object.isFrozen(GOVERNANCE_HOST_FACETS)).toBe(true);
  });
});
