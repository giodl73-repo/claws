/**
 * L0: Fleet policy enforcement — blocks DECLARED tier, allows VERIFIED.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateFleetPolicy,
  readFleetPublishPolicy,
  defaultFleetPublishPolicy,
} from '../../src/publish/fleet-policy.js';
import type { FleetPublishPolicy } from '../../src/publish/fleet-policy.js';

describe('evaluateFleetPolicy', () => {
  const restrictive: FleetPublishPolicy = {
    requireVerifiedPublish: true,
    allowDeclaredDryRun: true,
  };

  const permissive: FleetPublishPolicy = {
    requireVerifiedPublish: false,
    allowDeclaredDryRun: true,
  };

  it('blocks DECLARED tier when requireVerifiedPublish is true', () => {
    const result = evaluateFleetPolicy('declared', restrictive, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('blocked');
  });

  it('allows VERIFIED tier regardless of policy', () => {
    const result = evaluateFleetPolicy('verified', restrictive, false);
    expect(result.allowed).toBe(true);
  });

  it('allows TYPED tier regardless of policy', () => {
    const result = evaluateFleetPolicy('typed', restrictive, false);
    expect(result.allowed).toBe(true);
  });

  it('allows DECLARED tier when requireVerifiedPublish is false', () => {
    const result = evaluateFleetPolicy('declared', permissive, false);
    expect(result.allowed).toBe(true);
  });

  it('allows DECLARED dry-run when allowDeclaredDryRun is true', () => {
    const result = evaluateFleetPolicy('declared', restrictive, true);
    expect(result.allowed).toBe(true);
    expect(result.dryRunBypass).toBe(true);
  });

  it('blocks DECLARED dry-run when allowDeclaredDryRun is false', () => {
    const noDryRun: FleetPublishPolicy = {
      requireVerifiedPublish: true,
      allowDeclaredDryRun: false,
    };
    const result = evaluateFleetPolicy('declared', noDryRun, true);
    expect(result.allowed).toBe(false);
  });

  it('normalizes tier to lowercase', () => {
    const result = evaluateFleetPolicy('VERIFIED', restrictive, false);
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('verified');
  });
});

describe('readFleetPublishPolicy', () => {
  it('returns defaults when config is undefined', () => {
    const policy = readFleetPublishPolicy(undefined);
    expect(policy.requireVerifiedPublish).toBe(false);
    expect(policy.allowDeclaredDryRun).toBe(true);
  });

  it('merges partial config with defaults', () => {
    const policy = readFleetPublishPolicy({ requireVerifiedPublish: true });
    expect(policy.requireVerifiedPublish).toBe(true);
    expect(policy.allowDeclaredDryRun).toBe(true);
  });
});

describe('defaultFleetPublishPolicy', () => {
  it('returns permissive defaults', () => {
    const policy = defaultFleetPublishPolicy();
    expect(policy.requireVerifiedPublish).toBe(false);
    expect(policy.allowDeclaredDryRun).toBe(true);
  });
});
