/**
 * L1 integration tests for badge enterprise policy.
 *
 * P32: enterprise policy + tier + badge pipeline (1),
 * fleet policy enforcement across tiers (1).
 *
 * These tests exercise the full integration between enterprise policy
 * evaluation, badge generation, and inconsistency detection.
 */

import { describe, it, expect } from 'vitest';

import {
  evaluateEnterprisePolicy,
  resolveDataSensitivity,
} from '../../src/maker/badge-policy.js';
import { generateBadgeMetadata } from '../../src/maker/badge.js';
import { detectInconsistencies } from '../../src/maker/badge-consistency.js';

describe('enterprise policy + tier + badge pipeline', () => {
  it('CONFIDENTIAL + DECLARED triggers both policy violation and badge inconsistency', () => {
    // Step 1: Enterprise policy evaluation
    const policyResult = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 3,
      dataLabels: ['CONFIDENTIAL'],
    });

    expect(policyResult.passed).toBe(false);
    expect(policyResult.violations).toHaveLength(1);
    expect(policyResult.violations[0].code).toBe('ENT-POLICY-001');

    // Step 2: Badge generation includes the BADGE-IC-002 inconsistency
    const badge = generateBadgeMetadata({
      tier: 'DECLARED',
      risk: 3,
      obo: false,
      oboScope: '',
      dataLabels: ['CONFIDENTIAL'],
      signatureStatus: 'unsigned',
    });

    const dataTierMismatch = badge.inconsistencies.find(i => i.code === 'BADGE-IC-002');
    expect(dataTierMismatch).toBeDefined();
    expect(dataTierMismatch!.severity).toBe('error');

    // Both systems flag the issue: policy enforcement blocks it,
    // badge inconsistency warns about it
    expect(policyResult.violations[0].message).toContain('CONFIDENTIAL');
    expect(dataTierMismatch!.message).toContain('CONFIDENTIAL');
  });

  it('RESTRICTED + DECLARED triggers policy violation, TYPED passes', () => {
    const failResult = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 4,
      dataLabels: ['RESTRICTED'],
    });

    expect(failResult.passed).toBe(false);
    expect(failResult.violations[0].code).toBe('ENT-POLICY-002');

    // Upgrade to TYPED — policy passes
    const passResult = evaluateEnterprisePolicy({
      tier: 'TYPED',
      risk: 4,
      dataLabels: ['RESTRICTED'],
    });

    expect(passResult.passed).toBe(true);

    // Badge metadata reflects TYPED tier correctly
    const badge = generateBadgeMetadata({
      tier: 'TYPED',
      risk: 4,
      obo: false,
      oboScope: '',
      dataLabels: ['RESTRICTED'],
      signatureStatus: 'signed',
    });

    expect(badge.tier).toBe('TYPED');
    expect(badge.qualifier).toBeNull(); // TYPED has no qualifier
    expect(badge.inconsistencies).toHaveLength(0);
  });

  it('highest sensitivity wins when multiple labels present', () => {
    const sensitivity = resolveDataSensitivity(['INTERNAL', 'CONFIDENTIAL', 'PUBLIC']);
    expect(sensitivity).toBe('CONFIDENTIAL');

    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 2,
      dataLabels: ['INTERNAL', 'CONFIDENTIAL', 'PUBLIC'],
    });

    expect(result.passed).toBe(false);
    expect(result.effectiveMinimumTier).toBe('TYPED');
  });

  it('combined: R1 + CONFIDENTIAL + DECLARED + OBO transact yields 2 policy + 2 badge inconsistencies', () => {
    // Enterprise policy
    const policyResult = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 1,
      dataLabels: ['CONFIDENTIAL'],
    });

    expect(policyResult.passed).toBe(false);
    expect(policyResult.violations).toHaveLength(1); // ENT-POLICY-001

    // Badge inconsistencies
    const inconsistencies = detectInconsistencies({
      tier: 'DECLARED',
      risk: 1,
      obo: true,
      oboScope: 'transact on behalf of user',
      dataLabels: ['CONFIDENTIAL'],
    });

    // BADGE-IC-001 (R1 + transact OBO) + BADGE-IC-002 (CONFIDENTIAL + DECLARED)
    expect(inconsistencies).toHaveLength(2);
    const codes = inconsistencies.map(i => i.code);
    expect(codes).toContain('BADGE-IC-001');
    expect(codes).toContain('BADGE-IC-002');
  });
});

describe('fleet policy enforcement across tiers', () => {
  it('DECLARED blocked at all high-risk levels when fleet requires TYPED', () => {
    for (const risk of [4, 5] as const) {
      const result = evaluateEnterprisePolicy({
        tier: 'DECLARED',
        risk,
        dataLabels: ['INTERNAL'],
        fleetPolicy: {
          riskTierMinimums: [
            { minRisk: 4, minimumTier: 'TYPED' },
          ],
          requireSigning: false,
        },
      });

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.code === 'ENT-POLICY-003')).toBe(true);
    }
  });

  it('TYPED passes at R4 but fails at R5 when fleet requires VERIFIED for R5', () => {
    const r4Result = evaluateEnterprisePolicy({
      tier: 'TYPED',
      risk: 4,
      dataLabels: ['INTERNAL'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 5, minimumTier: 'VERIFIED' },
        ],
        requireSigning: false,
      },
    });

    expect(r4Result.passed).toBe(true);

    const r5Result = evaluateEnterprisePolicy({
      tier: 'TYPED',
      risk: 5,
      dataLabels: ['INTERNAL'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 5, minimumTier: 'VERIFIED' },
        ],
        requireSigning: false,
      },
    });

    expect(r5Result.passed).toBe(false);
    expect(r5Result.violations[0].code).toBe('ENT-POLICY-003');
    expect(r5Result.violations[0].message).toContain('VERIFIED');
  });

  it('multiple fleet rules — cascading enforcement from R3 to R5', () => {
    const policy = {
      riskTierMinimums: [
        { minRisk: 3 as const, minimumTier: 'TYPED' as const },
        { minRisk: 5 as const, minimumTier: 'VERIFIED' as const },
      ],
      requireSigning: false,
    };

    // R2 DECLARED — no fleet rule applies
    const r2 = evaluateEnterprisePolicy({
      tier: 'DECLARED', risk: 2, dataLabels: ['PUBLIC'], fleetPolicy: policy,
    });
    expect(r2.passed).toBe(true);

    // R3 DECLARED — fleet requires TYPED
    const r3 = evaluateEnterprisePolicy({
      tier: 'DECLARED', risk: 3, dataLabels: ['PUBLIC'], fleetPolicy: policy,
    });
    expect(r3.passed).toBe(false);

    // R3 TYPED — fleet met
    const r3t = evaluateEnterprisePolicy({
      tier: 'TYPED', risk: 3, dataLabels: ['PUBLIC'], fleetPolicy: policy,
    });
    expect(r3t.passed).toBe(true);

    // R5 TYPED — fleet requires VERIFIED for R5
    const r5t = evaluateEnterprisePolicy({
      tier: 'TYPED', risk: 5, dataLabels: ['PUBLIC'], fleetPolicy: policy,
    });
    expect(r5t.passed).toBe(false);
    // Two violations: R3+ requires TYPED (already met), R5+ requires VERIFIED (not met)
    expect(r5t.violations.some(v => v.message.includes('VERIFIED'))).toBe(true);

    // R5 VERIFIED — all fleet rules met
    const r5v = evaluateEnterprisePolicy({
      tier: 'VERIFIED', risk: 5, dataLabels: ['PUBLIC'], fleetPolicy: policy,
    });
    expect(r5v.passed).toBe(true);
  });

  it('fleet policy + data sensitivity combine — both enforced', () => {
    const result = evaluateEnterprisePolicy({
      tier: 'DECLARED',
      risk: 4,
      dataLabels: ['RESTRICTED'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 4, minimumTier: 'VERIFIED' },
        ],
        requireSigning: false,
      },
    });

    expect(result.passed).toBe(false);
    // ENT-POLICY-002 (RESTRICTED + DECLARED) + ENT-POLICY-003 (fleet R4+ VERIFIED)
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
    const codes = result.violations.map(v => v.code);
    expect(codes).toContain('ENT-POLICY-002');
    expect(codes).toContain('ENT-POLICY-003');

    // Effective minimum is VERIFIED (higher than TYPED from data sensitivity)
    expect(result.effectiveMinimumTier).toBe('VERIFIED');
  });

  it('badge metadata reflects passing policy — no inconsistencies', () => {
    const policyResult = evaluateEnterprisePolicy({
      tier: 'VERIFIED',
      risk: 5,
      dataLabels: ['RESTRICTED'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 4, minimumTier: 'VERIFIED' },
        ],
        requireSigning: false,
      },
    });

    expect(policyResult.passed).toBe(true);

    const badge = generateBadgeMetadata({
      tier: 'VERIFIED',
      risk: 5,
      obo: false,
      oboScope: '',
      dataLabels: ['RESTRICTED'],
      signatureStatus: 'signed',
    });

    expect(badge.tier).toBe('VERIFIED');
    expect(badge.qualifier).toBe('verified');
    expect(badge.inconsistencies).toHaveLength(0);
  });
});
