/**
 * L3 acceptance: fleet policy publish gate (S12/fleet-ops).
 *
 * Validates fleet policy enforcement in the publish pipeline:
 * - requireVerifiedPublish blocks DECLARED-tier skills
 * - VERIFIED-tier skills always pass regardless of policy
 * - dry-run bypass for DECLARED tier when allowDeclaredDryRun is true
 * - permissive policy allows DECLARED-tier publish
 *
 * @module claws-sdk/tests/accept/scenarios/fleet-policy-publish-gate
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateFleetPolicy,
  readFleetPublishPolicy,
} from '../../../src/publish/fleet-policy.js';
import type { FleetPublishPolicy } from '../../../src/publish/fleet-policy.js';

describe('accept: fleet policy publish gate (S12/fleet-ops)', () => {

  // ── Scenario 1: DECLARED-tier blocked by requireVerifiedPublish ────

  it('DECLARED-tier skill is BLOCKED when requireVerifiedPublish is true', () => {
    const policy = readFleetPublishPolicy({ requireVerifiedPublish: true });
    expect(policy.requireVerifiedPublish).toBe(true);

    const result = evaluateFleetPolicy('declared', policy, false);

    expect(result.allowed).toBe(false);
    expect(result.dryRunBypass).toBe(false);
    expect(result.tier).toBe('declared');
    expect(result.reason).toContain('blocked');
    expect(result.reason).toContain('DECLARED');
    expect(result.policy).toStrictEqual(policy);
  });

  // ── Scenario 2: VERIFIED-tier always allowed ──────────────────────

  it('VERIFIED-tier skill is ALLOWED regardless of requireVerifiedPublish', () => {
    const policy = readFleetPublishPolicy({ requireVerifiedPublish: true });

    const result = evaluateFleetPolicy('verified', policy, false);

    expect(result.allowed).toBe(true);
    expect(result.dryRunBypass).toBe(false);
    expect(result.tier).toBe('verified');
    expect(result.reason).toContain('verified');
    expect(result.reason).toContain('allowed');
  });

  // ── Scenario 3: DECLARED dry-run bypass ───────────────────────────

  it('DECLARED-tier dry-run produces feedback without blocking when allowDeclaredDryRun is true', () => {
    const policy = readFleetPublishPolicy({
      requireVerifiedPublish: true,
      allowDeclaredDryRun: true,
    });

    const result = evaluateFleetPolicy('declared', policy, true);

    expect(result.allowed).toBe(true);
    expect(result.dryRunBypass).toBe(true);
    expect(result.tier).toBe('declared');
    expect(result.reason).toContain('dry-run');
    expect(result.policy).toStrictEqual(policy);
  });

  // ── Scenario 4: Permissive policy allows DECLARED publish ─────────

  it('DECLARED-tier skill succeeds when requireVerifiedPublish is false', () => {
    const policy = readFleetPublishPolicy({ requireVerifiedPublish: false });
    expect(policy.requireVerifiedPublish).toBe(false);

    const result = evaluateFleetPolicy('declared', policy, false);

    expect(result.allowed).toBe(true);
    expect(result.dryRunBypass).toBe(false);
    expect(result.tier).toBe('declared');
    expect(result.reason).toContain('DECLARED');
    expect(result.reason).toContain('allowed');
  });

  // ── End-to-end: full policy lifecycle through config → evaluate ────

  it('end-to-end: config-driven policy transitions across all tiers', () => {
    // Phase 1: Restrictive policy from config
    const restrictive = readFleetPublishPolicy({ requireVerifiedPublish: true });

    const declaredBlocked = evaluateFleetPolicy('declared', restrictive, false);
    const verifiedAllowed = evaluateFleetPolicy('verified', restrictive, false);
    const typedAllowed = evaluateFleetPolicy('typed', restrictive, false);

    expect(declaredBlocked.allowed).toBe(false);
    expect(verifiedAllowed.allowed).toBe(true);
    expect(typedAllowed.allowed).toBe(true);

    // Phase 2: Dry-run bypass for DECLARED
    const dryRunResult = evaluateFleetPolicy('declared', restrictive, true);
    expect(dryRunResult.allowed).toBe(true);
    expect(dryRunResult.dryRunBypass).toBe(true);

    // Phase 3: Relax policy — DECLARED now allowed
    const permissive = readFleetPublishPolicy({ requireVerifiedPublish: false });
    const declaredNowAllowed = evaluateFleetPolicy('declared', permissive, false);
    expect(declaredNowAllowed.allowed).toBe(true);
    expect(declaredNowAllowed.dryRunBypass).toBe(false);

    // Phase 4: Dry-run disabled — DECLARED blocked with no bypass
    const noDryRun: FleetPublishPolicy = {
      requireVerifiedPublish: true,
      allowDeclaredDryRun: false,
    };
    const dryRunBlocked = evaluateFleetPolicy('declared', noDryRun, true);
    expect(dryRunBlocked.allowed).toBe(false);
    expect(dryRunBlocked.dryRunBypass).toBe(false);
  });

  // ── Case normalization ────────────────────────────────────────────

  it('tier comparison is case-insensitive', () => {
    const policy = readFleetPublishPolicy({ requireVerifiedPublish: true });

    const upper = evaluateFleetPolicy('DECLARED', policy, false);
    const mixed = evaluateFleetPolicy('Declared', policy, false);
    const lower = evaluateFleetPolicy('declared', policy, false);

    expect(upper.allowed).toBe(false);
    expect(mixed.allowed).toBe(false);
    expect(lower.allowed).toBe(false);

    // All normalize to 'declared'
    expect(upper.tier).toBe('declared');
    expect(mixed.tier).toBe('declared');
    expect(lower.tier).toBe('declared');
  });
});
