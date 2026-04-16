/**
 * L3 SDK acceptance test for badge enterprise policy.
 *
 * P32: consumer enforces enterprise tier policy on CONFIDENTIAL/RESTRICTED skills,
 * verifies DECLARED blocked for high-risk, closest-value enum suggestions,
 * and YAML None/null disambiguation.
 *
 * Validates the SDK surface from a consumer perspective — how an enterprise
 * SDK consumer would integrate enterprise policy enforcement into their workflow.
 */

import { describe, it, expect } from 'vitest';

import {
  evaluateEnterprisePolicy,
  validateGovernanceTier,
  validateDataSensitivity,
  suggestClosestTier,
  suggestClosestSensitivity,
  disambiguateYamlNull,
  generateBadgeMetadata,
  detectInconsistencies,
} from '@bic/claws-sdk/maker';
import type {
  EnterpriseFleetPolicy,
  EnterprisePolicyResult,
  PolicyViolation,
} from '@bic/claws-sdk/maker';

describe('SDK acceptance: enterprise tier policy enforcement', () => {
  it('enforces enterprise tier policy on CONFIDENTIAL skills', () => {
    // Consumer scenario: enterprise security team evaluates a skill
    // that handles confidential data with DECLARED governance
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 3,
      dataLabels: ['CONFIDENTIAL'],
    });

    // Enterprise policy blocks DECLARED for CONFIDENTIAL
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);

    const violation: PolicyViolation = result.violations[0];
    expect(violation.code).toBe('ENT-POLICY-001');
    expect(violation.severity).toBe('error');
    expect(violation.suggestion).toContain('TYPED');

    // Badge inconsistency also catches this
    const inconsistencies = detectInconsistencies({
      tier: 'DECLARED',
      risk: 3,
      obo: false,
      oboScope: '',
      dataLabels: ['CONFIDENTIAL'],
    });
    expect(inconsistencies.some(i => i.code === 'BADGE-IC-002')).toBe(true);
  });

  it('enforces enterprise tier policy on RESTRICTED skills', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 5,
      dataLabels: ['RESTRICTED'],
    });

    expect(result.passed).toBe(false);
    expect(result.violations[0].code).toBe('ENT-POLICY-002');

    // Upgrade to TYPED — passes
    const upgraded = evaluateEnterprisePolicy({
      tier: 'TYPED',
      risk: 5,
      dataLabels: ['RESTRICTED'],
    });
    expect(upgraded.passed).toBe(true);
  });

  it('verifies DECLARED blocked for high-risk via fleet policy', () => {
    const policy: EnterpriseFleetPolicy = {
      riskTierMinimums: [
        { minRisk: 4, minimumTier: 'TYPED' },
        { minRisk: 5, minimumTier: 'VERIFIED' },
      ],
      requireSigning: false,
    };

    // R4 DECLARED — blocked (fleet requires TYPED)
    const r4: EnterprisePolicyResult = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 4,
      dataLabels: ['INTERNAL'],
      fleetPolicy: policy,
    });
    expect(r4.passed).toBe(false);
    expect(r4.violations.some(v => v.code === 'ENT-POLICY-003')).toBe(true);

    // R5 TYPED — blocked (fleet requires VERIFIED for R5)
    const r5: EnterprisePolicyResult = evaluateEnterprisePolicy({
      tier: 'TYPED',
      risk: 5,
      dataLabels: ['INTERNAL'],
      fleetPolicy: policy,
    });
    expect(r5.passed).toBe(false);

    // R5 VERIFIED — passes all fleet requirements
    const r5v: EnterprisePolicyResult = evaluateEnterprisePolicy({
      tier: 'VERIFIED',
      risk: 5,
      dataLabels: ['INTERNAL'],
      fleetPolicy: policy,
    });
    expect(r5v.passed).toBe(true);
  });

  it('provides closest-value enum suggestions for invalid tiers', () => {
    // Typo: "DECLRED" → suggests "DECLARED"
    const tierError = validateGovernanceTier('DECLRED');
    expect(tierError).toBeDefined();
    expect(tierError).toContain('DECLARED');
    expect(tierError).toContain('Did you mean');

    // Typo: "VERIFID" → suggests "VERIFIED"
    expect(suggestClosestTier('VERIFID')).toBe('VERIFIED');

    // Valid tier — no error
    expect(validateGovernanceTier('TYPED')).toBeUndefined();

    // Invalid sensitivity: "CONFIDENTAL" → suggests "CONFIDENTIAL"
    const sensitivityError = validateDataSensitivity('CONFIDENTAL');
    expect(sensitivityError).toBeDefined();
    expect(sensitivityError).toContain('CONFIDENTIAL');

    expect(suggestClosestSensitivity('RESTRCTED')).toBe('RESTRICTED');

    // Completely wrong value — no suggestion
    expect(suggestClosestTier('XYZZZZ')).toBeUndefined();
  });

  it('disambiguates YAML None/null in governance fields', () => {
    // Scenario: YAML parser returns null for bare `None`
    const nullResult = disambiguateYamlNull(null, 'tier');
    expect(nullResult.disambiguated).toBe(true);
    expect(nullResult.resolvedValue).toBeNull();
    expect(nullResult.warning).toContain('None');
    expect(nullResult.warning).toContain('quote');

    // Scenario: Quoted "None" string preserved correctly
    const stringResult = disambiguateYamlNull('None', 'tier');
    expect(stringResult.disambiguated).toBe(false);
    expect(stringResult.resolvedValue).toBe('None');
    expect(stringResult.warning).toBeUndefined();

    // Scenario: Normal string value — no disambiguation needed
    const normalResult = disambiguateYamlNull('VERIFIED', 'tier');
    expect(normalResult.disambiguated).toBe(false);
    expect(normalResult.resolvedValue).toBe('VERIFIED');

    // Badge metadata works correctly with resolved values
    const badge = generateBadgeMetadata({
      tier: 'VERIFIED',
      risk: 3,
      obo: false,
      oboScope: '',
      dataLabels: ['CONFIDENTIAL'],
      signatureStatus: 'signed',
    });

    expect(badge.tier).toBe('VERIFIED');
    expect(badge.qualifier).toBe('verified');
    expect(badge.inconsistencies).toHaveLength(0);
  });
});
