/**
 * L0 Unit: Fleet precedence resolution for requiresExternalApproval.
 *
 * 2 L0 tests:
 * 1. Fleet override R3→false overrides provider default
 * 2. R5 always true — ignores fleet override
 */

import { describe, it, expect } from 'vitest';
import {
  resolveApprovalGate,
  fromFleetOverride,
  type FleetApprovalOverride,
} from '../../src/governance/fleet-precedence.js';
import type { FleetOverride } from '../../src/governance/fleet-override-types.js';

describe('Unit: fleet precedence — resolveApprovalGate', () => {
  it('fleet override R3→false overrides provider default', () => {
    const overrides: FleetApprovalOverride[] = [
      {
        tool: 'write_file',
        allowAutoApprove: true,
        reason: 'Sandbox: write_file is safe in dev environment',
      },
    ];

    // R3 default is requiresExternalApproval: true
    const defaultResult = resolveApprovalGate(3, 'write_file');
    expect(defaultResult.requiresExternalApproval).toBe(true);
    expect(defaultResult.source).toBe('risk-default');

    // Fleet override permits auto-approve → false
    const overrideResult = resolveApprovalGate(3, 'write_file', overrides);
    expect(overrideResult.requiresExternalApproval).toBe(false);
    expect(overrideResult.source).toBe('fleet-override');
    expect(overrideResult.reason).toBe('Sandbox: write_file is safe in dev environment');

    // Non-overridden R3 tool still requires approval
    const otherResult = resolveApprovalGate(3, 'http_request', overrides);
    expect(otherResult.requiresExternalApproval).toBe(true);
    expect(otherResult.source).toBe('risk-default');
  });

  it('R5 always true — ignores fleet override', () => {
    const overrides: FleetApprovalOverride[] = [
      {
        tool: 'deploy_prod',
        allowAutoApprove: true, // Attempt to disable approval for R5
        reason: 'Should not apply — R5 is non-negotiable',
      },
    ];

    // R5 always requires external approval, regardless of fleet override
    const result = resolveApprovalGate(5, 'deploy_prod', overrides);
    expect(result.requiresExternalApproval).toBe(true);
    expect(result.source).toBe('r5-non-negotiable');
    expect(result.reason).toContain('non-negotiable');

    // R5 without any overrides also requires approval
    const noOverrideResult = resolveApprovalGate(5, 'deploy_prod');
    expect(noOverrideResult.requiresExternalApproval).toBe(true);
    expect(noOverrideResult.source).toBe('r5-non-negotiable');
  });

  it('R2 defaults to false (no approval needed)', () => {
    const result = resolveApprovalGate(2, 'read_file');
    expect(result.requiresExternalApproval).toBe(false);
    expect(result.source).toBe('risk-default');
  });

  it('R4 defaults to true (approval required)', () => {
    const result = resolveApprovalGate(4, 'execute_shell');
    expect(result.requiresExternalApproval).toBe(true);
    expect(result.source).toBe('risk-default');
  });

  it('server-scoped override only applies to matching server', () => {
    const overrides: FleetApprovalOverride[] = [
      {
        tool: 'write_file',
        server: 'fs-dev',
        allowAutoApprove: true,
        reason: 'Dev filesystem only',
      },
    ];

    // Matching server → override applies
    const devResult = resolveApprovalGate(3, 'write_file', overrides, 'fs-dev');
    expect(devResult.requiresExternalApproval).toBe(false);
    expect(devResult.source).toBe('fleet-override');

    // Non-matching server → default applies
    const prodResult = resolveApprovalGate(3, 'write_file', overrides, 'fs-prod');
    expect(prodResult.requiresExternalApproval).toBe(true);
    expect(prodResult.source).toBe('risk-default');
  });
});

describe('Unit: fromFleetOverride conversion', () => {
  it('converts FleetOverride to FleetApprovalOverride', () => {
    const fleetOverride: FleetOverride = {
      tool: 'write_file',
      server: 'fs-mcp',
      requires_approval: false,
      reason: 'Dev environment',
      authorizedBy: 'admin',
      authorizedAt: '2026-04-15T10:00:00.000Z',
    };

    const result = fromFleetOverride(fleetOverride);
    expect(result.tool).toBe('write_file');
    expect(result.server).toBe('fs-mcp');
    expect(result.allowAutoApprove).toBe(true); // inverse of requires_approval
    expect(result.reason).toBe('Dev environment');
  });
});
