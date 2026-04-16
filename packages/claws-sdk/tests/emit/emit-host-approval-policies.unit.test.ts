/**
 * L0: host-approval-policies.json emitter — risk-level mapping,
 * fleet overrides, R5 non-negotiable constraint, unknown tool fail-closed.
 *
 * 4 unit tests:
 * 1. R2 (low) → requires_approval: false
 * 2. R3 (medium) → requires_approval: true
 * 3. R5 (critical) → requires_approval: true (non-negotiable, no fleet override)
 * 4. Fleet override R3 → false produces audit entry
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  resolvePolicy,
  type EmitHostApprovalPoliciesOptions,
} from '../../src/emit/emit-host-approval-policies.js';
import type { HostApprovalPoliciesDocument, HostApprovalPolicy } from '../../src/emit/host-approval-policy-types.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

describe('emitHostApprovalPolicies', () => {
  it('R2 (low) tools have requires_approval: false', () => {
    const ir = minimalGovernanceIR();
    const result = emitHostApprovalPolicies(ir);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // read_file is 'low' risk (R2)
    const readFilePolicy = doc.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'read_file',
    );
    expect(readFilePolicy, 'Missing policy for read_file').toBeDefined();
    expect(readFilePolicy!.requires_approval).toBe(false);
    expect(readFilePolicy!.risk_level).toBe('low');
  });

  it('R3 (medium) tools have requires_approval: true', () => {
    const ir = minimalGovernanceIR();
    const result = emitHostApprovalPolicies(ir);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // write_file is 'medium' risk (R3)
    const writeFilePolicy = doc.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'write_file',
    );
    expect(writeFilePolicy, 'Missing policy for write_file').toBeDefined();
    expect(writeFilePolicy!.requires_approval).toBe(true);
    expect(writeFilePolicy!.risk_level).toBe('medium');
  });

  it('R5 (critical) tools are always requires_approval: true — non-negotiable', () => {
    const ir = minimalGovernanceIR();
    // Attempt to override R5 tool via fleet override
    const options: EmitHostApprovalPoliciesOptions = {
      fleetOverrides: [
        {
          tool: 'send_email',
          requires_approval: false,
          reason: 'Attempted override',
          authorizedBy: 'admin',
          authorizedAt: '2026-04-15T00:00:00.000Z',
        },
        {
          tool: 'delete_database',
          requires_approval: false,
          reason: 'Attempted override',
          authorizedBy: 'admin',
          authorizedAt: '2026-04-15T00:00:00.000Z',
        },
      ],
    };

    const result = emitHostApprovalPolicies(ir, options);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // send_email is 'critical' (R5) — override MUST be ignored
    const sendEmailPolicy = doc.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'send_email',
    );
    expect(sendEmailPolicy, 'Missing policy for send_email').toBeDefined();
    expect(sendEmailPolicy!.requires_approval).toBe(true);

    // delete_database is 'critical' (R5) — override MUST be ignored
    const deleteDbPolicy = doc.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'delete_database',
    );
    expect(deleteDbPolicy, 'Missing policy for delete_database').toBeDefined();
    expect(deleteDbPolicy!.requires_approval).toBe(true);

    // Warnings should mention the ignored overrides
    expect(result.warnings.some(w => w.includes('non-negotiable'))).toBe(true);

    // R5 overrides must NOT appear in appliedOverrides
    expect(doc.appliedOverrides).toHaveLength(0);
  });

  it('fleet override R3 → false produces audit entry', () => {
    const ir = minimalGovernanceIR();
    const options: EmitHostApprovalPoliciesOptions = {
      fleetOverrides: [
        {
          tool: 'write_file',
          requires_approval: false,
          reason: 'Low-risk in sandbox environment',
          authorizedBy: 'security-team',
          authorizedAt: '2026-04-15T12:00:00.000Z',
        },
      ],
    };

    const result = emitHostApprovalPolicies(ir, options);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // write_file should now be overridden to false
    const writeFilePolicy = doc.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'write_file',
    );
    expect(writeFilePolicy, 'Missing policy for write_file').toBeDefined();
    expect(writeFilePolicy!.requires_approval).toBe(false);
    expect(writeFilePolicy!.reason).toBe('Low-risk in sandbox environment');

    // Must have audit entry for the override
    expect(doc.appliedOverrides).toHaveLength(1);
    expect(doc.appliedOverrides[0]!.tool).toBe('write_file');

    // Audit entries must record the change
    expect(doc.auditEntries).toHaveLength(1);
    expect(doc.auditEntries[0]!.override.tool).toBe('write_file');
    expect(doc.auditEntries[0]!.counterSignature).toContain('security-team');
  });

  it('R4 (high) tools have requires_approval: true and are overridable', () => {
    const ir = minimalGovernanceIR();
    const options: EmitHostApprovalPoliciesOptions = {
      fleetOverrides: [
        {
          tool: 'execute_command',
          requires_approval: false,
          reason: 'Sandboxed environment',
          authorizedBy: 'admin',
          authorizedAt: '2026-04-15T00:00:00.000Z',
        },
      ],
    };

    const result = emitHostApprovalPolicies(ir, options);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // execute_command is 'high' risk (R4) — override SHOULD be applied
    const execPolicy = doc.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'execute_command',
    );
    expect(execPolicy).toBeDefined();
    expect(execPolicy!.requires_approval).toBe(false);
    expect(execPolicy!.reason).toBe('Sandboxed environment');
    expect(doc.appliedOverrides).toHaveLength(1);
  });

  it('unknown risk level defaults to fail-closed (requires approval, non-overridable)', () => {
    const ir = minimalGovernanceIR();
    // Inject a tool with an unknown risk level to exercise the ?? fallbacks
    (ir.capabilities.tools as any[]).push({
      name: 'alien_tool',
      description: 'Unknown risk',
      riskLevel: 'unknown' as any,
      oboFlag: false,
      classification: 'other',
    });

    // Attempt to override the unknown-risk tool
    const options: EmitHostApprovalPoliciesOptions = {
      fleetOverrides: [
        {
          tool: 'alien_tool',
          requires_approval: false,
          reason: 'Attempted override on unknown risk',
          authorizedBy: 'admin',
          authorizedAt: '2026-04-15T00:00:00.000Z',
        },
      ],
    };

    const result = emitHostApprovalPolicies(ir, options);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // Unknown risk → fail-closed: requires_approval=true (from ?? true)
    const alienPolicy = doc.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'alien_tool',
    );
    expect(alienPolicy).toBeDefined();
    expect(alienPolicy!.requires_approval).toBe(true);

    // Unknown risk → non-overridable (from ?? false), so override is ignored
    // The override should NOT appear in appliedOverrides for this tool
    const alienOverride = doc.appliedOverrides.find(o => o.tool === 'alien_tool');
    expect(alienOverride).toBeUndefined();
  });

  it('fleet override with server-specific match only applies to that server', () => {
    const ir = minimalGovernanceIR();
    // Give write_file an explicit mcpServer
    const writeTool = ir.capabilities.tools.find(t => t.name === 'write_file');
    (writeTool as any).mcpServer = 'fs-server';

    const options: EmitHostApprovalPoliciesOptions = {
      fleetOverrides: [
        {
          tool: 'write_file',
          server: 'fs-server',
          requires_approval: false,
          reason: 'Sandboxed FS server',
          authorizedBy: 'ops',
          authorizedAt: '2026-04-15T00:00:00.000Z',
        },
      ],
    };

    const result = emitHostApprovalPolicies(ir, options);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    const writePolicy = doc.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'write_file',
    );
    expect(writePolicy).toBeDefined();
    expect(writePolicy!.requires_approval).toBe(false);
    expect(writePolicy!.server).toBe('fs-server');
    expect(doc.appliedOverrides).toHaveLength(1);
  });
});

describe('resolvePolicy', () => {
  it('resolves specific server + tool first', () => {
    const ir = minimalGovernanceIR();
    const result = emitHostApprovalPolicies(ir);

    // read_file on wildcard server
    const policy = resolvePolicy(result.policyIndex, '*', 'read_file');
    expect(policy.tool).toBe('read_file');
    expect(policy.requires_approval).toBe(false);
  });

  it('falls back to wildcard server when specific server has no match', () => {
    const ir = minimalGovernanceIR();
    const result = emitHostApprovalPolicies(ir);

    // query a server that doesn't exist — should fall back to wildcard
    const policy = resolvePolicy(result.policyIndex, 'unknown-server', 'read_file');
    expect(policy.tool).toBe('read_file');
    expect(policy.requires_approval).toBe(false);
  });

  it('returns fail-closed default for completely unknown tool', () => {
    const ir = minimalGovernanceIR();
    const result = emitHostApprovalPolicies(ir);

    const policy = resolvePolicy(result.policyIndex, 'any-server', 'nonexistent_tool');
    expect(policy.requires_approval).toBe(true);
    expect(policy.risk_level).toBe('critical');
    expect(policy.reason).toContain('Unknown tool');
  });
});
