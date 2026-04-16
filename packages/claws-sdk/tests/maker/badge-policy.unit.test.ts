/**
 * L0 unit tests for badge enterprise policy.
 *
 * P32: CONFIDENTIAL requires TYPED+ (1), RESTRICTED requires TYPED+ (1),
 * fleet policy blocks DECLARED for high-risk (1), YAML None/null disambiguated (1).
 */

import { describe, it, expect } from 'vitest';

import {
  evaluateEnterprisePolicy,
  resolveDataSensitivity,
  minimumTierForSensitivity,
  validateGovernanceTier,
  suggestClosestTier,
  suggestClosestEnum,
  validateDataSensitivity,
  disambiguateYamlNull,
} from '../../src/maker/badge-policy.js';

describe('CONFIDENTIAL data sensitivity requires TYPED+', () => {
  it('blocks DECLARED tier for CONFIDENTIAL data', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 3,
      dataLabels: ['CONFIDENTIAL'],
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].code).toBe('ENT-POLICY-001');
    expect(result.violations[0].severity).toBe('error');
    expect(result.violations[0].message).toContain('CONFIDENTIAL');
    expect(result.violations[0].message).toContain('DECLARED');
    expect(result.violations[0].suggestion).toContain('TYPED');
  });

  it('allows TYPED tier for CONFIDENTIAL data', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'TYPED',
      risk: 3,
      dataLabels: ['CONFIDENTIAL'],
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('allows VERIFIED tier for CONFIDENTIAL data', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'VERIFIED',
      risk: 4,
      dataLabels: ['CONFIDENTIAL'],
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('resolves CONFIDENTIAL sensitivity case-insensitively', () => {
    const sensitivity = resolveDataSensitivity(['confidential']);
    expect(sensitivity).toBe('CONFIDENTIAL');

    const min = minimumTierForSensitivity(sensitivity);
    expect(min).toBe('TYPED');
  });

  it('returns effective minimum tier TYPED for CONFIDENTIAL', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 1,
      dataLabels: ['CONFIDENTIAL'],
    });

    expect(result.effectiveMinimumTier).toBe('TYPED');
  });
});

describe('RESTRICTED data sensitivity requires TYPED+', () => {
  it('blocks DECLARED tier for RESTRICTED data', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 4,
      dataLabels: ['RESTRICTED'],
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].code).toBe('ENT-POLICY-002');
    expect(result.violations[0].severity).toBe('error');
    expect(result.violations[0].message).toContain('RESTRICTED');
    expect(result.violations[0].suggestion).toContain('TYPED');
  });

  it('allows TYPED tier for RESTRICTED data', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'TYPED',
      risk: 5,
      dataLabels: ['RESTRICTED'],
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('allows VERIFIED tier for RESTRICTED data', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'VERIFIED',
      risk: 5,
      dataLabels: ['RESTRICTED'],
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('resolves RESTRICTED as highest sensitivity', () => {
    const sensitivity = resolveDataSensitivity(['INTERNAL', 'RESTRICTED', 'CONFIDENTIAL']);
    expect(sensitivity).toBe('RESTRICTED');
  });

  it('returns effective minimum tier TYPED for RESTRICTED', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 1,
      dataLabels: ['RESTRICTED'],
    });

    expect(result.effectiveMinimumTier).toBe('TYPED');
  });
});

describe('fleet policy blocks DECLARED for high-risk', () => {
  it('blocks DECLARED for R4+ when fleet policy requires TYPED', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 4,
      dataLabels: ['INTERNAL'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 4, minimumTier: 'TYPED' },
        ],
        requireSigning: false,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].code).toBe('ENT-POLICY-003');
    expect(result.violations[0].message).toContain('TYPED');
    expect(result.violations[0].message).toContain('R4');
    expect(result.violations[0].message).toContain('DECLARED');
  });

  it('blocks DECLARED for R5 when fleet policy requires VERIFIED', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 5,
      dataLabels: ['PUBLIC'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 5, minimumTier: 'VERIFIED' },
        ],
        requireSigning: false,
      },
    });

    expect(result.passed).toBe(false);
    const v = result.violations.find(v => v.code === 'ENT-POLICY-003');
    expect(v).toBeDefined();
    expect(v!.message).toContain('VERIFIED');
  });

  it('allows TYPED for R4+ when fleet policy requires TYPED', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'TYPED',
      risk: 4,
      dataLabels: ['INTERNAL'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 4, minimumTier: 'TYPED' },
        ],
        requireSigning: false,
      },
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('does not apply fleet rule to lower risk skills', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 2,
      dataLabels: ['INTERNAL'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 4, minimumTier: 'VERIFIED' },
        ],
        requireSigning: false,
      },
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('accumulates both data-sensitivity and fleet-policy violations', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 4,
      dataLabels: ['CONFIDENTIAL'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 4, minimumTier: 'TYPED' },
        ],
        requireSigning: false,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
    const codes = result.violations.map(v => v.code);
    expect(codes).toContain('ENT-POLICY-001');
    expect(codes).toContain('ENT-POLICY-003');
  });

  it('sets effective minimum to highest fleet requirement', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'VERIFIED',
      risk: 5,
      dataLabels: ['PUBLIC'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 3, minimumTier: 'TYPED' },
          { minRisk: 5, minimumTier: 'VERIFIED' },
        ],
        requireSigning: false,
      },
    });

    expect(result.effectiveMinimumTier).toBe('VERIFIED');
  });
});

describe('YAML None/null disambiguated', () => {
  it('resolves explicit string value without disambiguation', () => {
    const result = disambiguateYamlNull('TYPED', 'tier');

    expect(result.disambiguated).toBe(false);
    expect(result.resolvedValue).toBe('TYPED');
    expect(result.warning).toBeUndefined();
  });

  it('resolves quoted "None" string without disambiguation', () => {
    const result = disambiguateYamlNull('None', 'tier');

    expect(result.disambiguated).toBe(false);
    expect(result.resolvedValue).toBe('None');
    expect(result.warning).toBeUndefined();
  });

  it('disambiguates null value with warning about bare None', () => {
    const result = disambiguateYamlNull(null, 'tier');

    expect(result.disambiguated).toBe(true);
    expect(result.resolvedValue).toBeNull();
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('tier');
    expect(result.warning).toContain('None');
    expect(result.warning).toContain('quote');
  });

  it('disambiguates undefined as null with warning', () => {
    const result = disambiguateYamlNull(undefined, 'sensitivity');

    expect(result.disambiguated).toBe(true);
    expect(result.resolvedValue).toBeNull();
    expect(result.warning).toContain('sensitivity');
  });

  it('passes through numeric values as string', () => {
    const result = disambiguateYamlNull(42, 'risk');

    expect(result.disambiguated).toBe(false);
    expect(result.resolvedValue).toBe('42');
    expect(result.warning).toBeUndefined();
  });

  it('validates governance tier with closest-value suggestion', () => {
    const error = validateGovernanceTier('DECLRED');
    expect(error).toBeDefined();
    expect(error).toContain('DECLARED');
    expect(error).toContain('Did you mean');

    const valid = validateGovernanceTier('TYPED');
    expect(valid).toBeUndefined();
  });

  it('suggests closest tier for typos', () => {
    expect(suggestClosestTier('TYPD')).toBe('TYPED');
    expect(suggestClosestTier('VERIFED')).toBe('VERIFIED');
    expect(suggestClosestTier('DECLARD')).toBe('DECLARED');
  });

  it('returns undefined for unrecognizable values', () => {
    expect(suggestClosestTier('XYZABC')).toBeUndefined();
  });

  it('suggests closest enum value using generic function', () => {
    const values = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];
    expect(suggestClosestEnum('PUBLI', values)).toBe('PUBLIC');
    expect(suggestClosestEnum('INTERNL', values)).toBe('INTERNAL');
  });

  it('validates data sensitivity with suggestion', () => {
    const error = validateDataSensitivity('CONFIDENTAL');
    expect(error).toBeDefined();
    expect(error).toContain('CONFIDENTIAL');
    expect(error).toContain('Did you mean');
  });
});
