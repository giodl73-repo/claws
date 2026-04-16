/**
 * L3 CLI acceptance test for badge enterprise policy.
 *
 * P32: `claws badge` with enterprise fleet policy enforces minimum tiers
 * per data sensitivity and reports policy violations with actionable suggestions.
 *
 * Tests the SDK directly (same pattern as P29/P31 CLI accept tests) since
 * the maker CLI command surface is the thin adapter.
 */

import { describe, it, expect } from 'vitest';

import {
  evaluateEnterprisePolicy,
  validateGovernanceTier,
  validateDataSensitivity,
  suggestClosestTier,
  disambiguateYamlNull,
  generateBadgeMetadata,
} from '@bic/claws-sdk/maker';
import type {
  EnterpriseFleetPolicy,
} from '@bic/claws-sdk/maker';

describe('CLI acceptance: claws badge with enterprise fleet policy', () => {
  it('enforces minimum tiers per data sensitivity and reports violations', () => {
    // CLI scenario: `claws badge --fleet-policy fleet.yaml --skill my-confidential-skill`
    // Fleet policy requires TYPED for R3+, VERIFIED for R5
    const policy: EnterpriseFleetPolicy = {
      riskTierMinimums: [
        { minRisk: 3, minimumTier: 'TYPED' },
        { minRisk: 5, minimumTier: 'VERIFIED' },
      ],
      requireSigning: true,
    };

    // CONFIDENTIAL skill at R3 with DECLARED tier — should fail on both
    // data sensitivity (ENT-POLICY-001) and fleet policy (ENT-POLICY-003)
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 3,
      dataLabels: ['CONFIDENTIAL'],
      fleetPolicy: policy,
    });

    // CLI would render: FAIL - 2 policy violations
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);

    // CLI would render violation table:
    // | Code           | Severity | Message                                    | Suggestion              |
    // | ENT-POLICY-001 | error    | CONFIDENTIAL requires TYPED+               | Upgrade to TYPED        |
    // | ENT-POLICY-003 | error    | Fleet requires TYPED for R3+               | Upgrade to TYPED        |
    const codes = result.violations.map(v => v.code);
    expect(codes).toContain('ENT-POLICY-001');
    expect(codes).toContain('ENT-POLICY-003');

    // Every violation has an actionable suggestion
    for (const v of result.violations) {
      expect(v.suggestion).toBeTruthy();
      expect(v.suggestion.length).toBeGreaterThan(0);
    }

    // CLI would render: effective minimum tier = TYPED
    expect(result.effectiveMinimumTier).toBe('TYPED');
  });

  it('reports fleet-policy-only violation for non-sensitive high-risk skills', () => {
    const policy: EnterpriseFleetPolicy = {
      riskTierMinimums: [
        { minRisk: 4, minimumTier: 'VERIFIED' },
      ],
      requireSigning: false,
    };

    // PUBLIC data, R4, TYPED — fleet policy requires VERIFIED
    const result = evaluateEnterprisePolicy({
      tier: 'TYPED',
      risk: 4,
      dataLabels: ['PUBLIC'],
      fleetPolicy: policy,
    });

    // CLI would render: FAIL - 1 fleet policy violation
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].code).toBe('ENT-POLICY-003');
    expect(result.violations[0].message).toContain('VERIFIED');
    expect(result.violations[0].message).toContain('R4');
  });

  it('validates enum inputs with closest-value suggestions for CLI error messages', () => {
    // CLI scenario: user types `claws badge --tier DECLRED`
    const tierError = validateGovernanceTier('DECLRED');

    // CLI would render: Error: Invalid governance tier 'DECLRED'. Did you mean 'DECLARED'?
    expect(tierError).toBeDefined();
    expect(tierError).toContain('DECLRED');
    expect(tierError).toContain('DECLARED');
    expect(tierError).toContain('Did you mean');

    // CLI scenario: user types `claws badge --sensitivity CONFIDENTAL`
    const sensitivityError = validateDataSensitivity('CONFIDENTAL');

    expect(sensitivityError).toBeDefined();
    expect(sensitivityError).toContain('CONFIDENTIAL');

    // Valid inputs produce no error
    expect(validateGovernanceTier('VERIFIED')).toBeUndefined();
    expect(validateDataSensitivity('RESTRICTED')).toBeUndefined();

    // Closest-tier for common typos
    expect(suggestClosestTier('TYPD')).toBe('TYPED');
    expect(suggestClosestTier('VERIFED')).toBe('VERIFIED');
  });

  it('handles YAML None/null disambiguation in CLI badge evaluation', () => {
    // CLI scenario: YAML config has `tier: None` (bare, parsed as null)
    const tierField = disambiguateYamlNull(null, 'tier');

    // CLI would render: Warning: tier resolved to null —
    // if you intended "None", quote it: tier: "None"
    expect(tierField.disambiguated).toBe(true);
    expect(tierField.resolvedValue).toBeNull();
    expect(tierField.warning).toBeDefined();
    expect(tierField.warning).toContain('tier');

    // CLI scenario: YAML config has `tier: "None"` (quoted string)
    const quotedField = disambiguateYamlNull('None', 'tier');
    expect(quotedField.disambiguated).toBe(false);
    expect(quotedField.resolvedValue).toBe('None');
    expect(quotedField.warning).toBeUndefined();

    // CLI scenario: valid tier value passes through
    const validField = disambiguateYamlNull('TYPED', 'tier');
    expect(validField.resolvedValue).toBe('TYPED');
  });

  it('generates correct badge metadata for skills that pass enterprise policy', () => {
    // CLI scenario: `claws badge --tier VERIFIED --risk 5 --data RESTRICTED`
    const policy: EnterpriseFleetPolicy = {
      riskTierMinimums: [
        { minRisk: 5, minimumTier: 'VERIFIED' },
      ],
      requireSigning: false,
    };

    const policyResult = evaluateEnterprisePolicy({
      tier: 'VERIFIED',
      risk: 5,
      dataLabels: ['RESTRICTED'],
      fleetPolicy: policy,
    });

    expect(policyResult.passed).toBe(true);

    // CLI renders badge metadata for display
    const badge = generateBadgeMetadata({
      tier: 'VERIFIED',
      risk: 5,
      obo: false,
      oboScope: '',
      dataLabels: ['RESTRICTED'],
      signatureStatus: 'signed',
      staleness: 'current',
    });

    // CLI would render: VERIFIED (verified) | R5 | RESTRICTED | signed | current
    expect(badge.tier).toBe('VERIFIED');
    expect(badge.qualifier).toBe('verified');
    expect(badge.risk).toBe(5);
    expect(badge.staleness).toBe('current');
    expect(badge.supplyChain.signed).toBe(true);
    expect(badge.inconsistencies).toHaveLength(0);
  });
});
