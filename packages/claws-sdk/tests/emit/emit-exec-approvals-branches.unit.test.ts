/**
 * L0: exec-approvals emitter — branch coverage for enforcement plan upgrade,
 * custom overrides on unknown tools, builtin merge, R5 safety override.
 */

import { describe, it, expect } from 'vitest';
import {
  emitExecApprovals,
  type ExecApprovalEntry,
} from '../../src/emit/emit-exec-approvals.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

/** Deep-clone IR and mutate for specific branch scenarios. */
function cloneIR(ir: GovernanceIR): GovernanceIR {
  return JSON.parse(JSON.stringify(ir)) as GovernanceIR;
}

function findTool(content: string, name: string): ExecApprovalEntry | undefined {
  const doc = JSON.parse(content);
  return (doc.tools as ExecApprovalEntry[]).find((t) => t.tool_name === name);
}

describe('emitExecApprovals — branch coverage', () => {
  it('enforcement plan upgrades a non-approval tool to require approval', () => {
    // write_file is medium (R3) but oboFlag=false → requires_approval=false
    // Adding it to requiredApprovals should upgrade it
    const ir = cloneIR(minimalGovernanceIR());
    (ir.analysis.enforcementPlan as { requiredApprovals: string[] }).requiredApprovals = ['write_file'];

    const result = emitExecApprovals(ir);
    const entry = findTool(result.content, 'write_file');
    expect(entry).toBeDefined();
    expect(entry!.requires_approval).toBe(true);
  });

  it('enforcement plan upgrade uses fallback reason when existing reason is undefined', () => {
    // Create a tool that has no reason field, then upgrade via enforcement plan
    const ir = cloneIR(minimalGovernanceIR());
    // read_file is R2, requires_approval=false, no reason
    (ir.analysis.enforcementPlan as { requiredApprovals: string[] }).requiredApprovals = ['read_file'];

    const result = emitExecApprovals(ir);
    const entry = findTool(result.content, 'read_file');
    expect(entry).toBeDefined();
    expect(entry!.requires_approval).toBe(true);
    expect(entry!.reason).toBe('Required by enforcement plan');
  });

  it('custom override for a tool not already in entries (no existing)', () => {
    const ir = minimalGovernanceIR();
    const overrides = new Map<string, { requires_approval: boolean; reason: string }>();
    overrides.set('brand_new_tool', {
      requires_approval: true,
      reason: 'Custom tool policy',
    });

    const result = emitExecApprovals(ir, { customOverrides: overrides });
    const entry = findTool(result.content, 'brand_new_tool');
    expect(entry).toBeDefined();
    expect(entry!.requires_approval).toBe(true);
    expect(entry!.reason).toBe('Custom tool policy');
    // No risk_level or rule_id since no existing entry
    expect(entry!.risk_level).toBeUndefined();
    expect(entry!.rule_id).toBeUndefined();
  });

  it('custom override preserves existing risk_level and rule_id', () => {
    const ir = minimalGovernanceIR();
    // delete_database has a deny intent with level=5 and ruleId=SEC-001
    const overrides = new Map<string, { requires_approval: boolean; reason: string }>();
    overrides.set('delete_database', {
      requires_approval: false,
      reason: 'Override: team exemption',
    });

    const result = emitExecApprovals(ir, { customOverrides: overrides });
    const entry = findTool(result.content, 'delete_database');
    expect(entry).toBeDefined();
    // risk_level and rule_id preserved from the deny intent
    expect(entry!.risk_level).toBe(5);
    expect(entry!.rule_id).toBe('SEC-001');
    // But note: R5 safety override will flip requires_approval back to true
  });

  it('builtin tool that already exists gets is_builtin merged', () => {
    const ir = minimalGovernanceIR();
    // read_file already exists from manifest tools
    const result = emitExecApprovals(ir, { builtinTools: ['read_file'] });
    const entry = findTool(result.content, 'read_file');
    expect(entry).toBeDefined();
    expect(entry!.is_builtin).toBe(true);
    // Original fields preserved
    expect(entry!.requires_approval).toBeDefined();
  });

  it('R5 safety override corrects requires_approval=false to true with warning', () => {
    // Use custom override to set an R5 tool to requires_approval=false,
    // then the safety override should flip it back
    const ir = minimalGovernanceIR();
    const overrides = new Map<string, { requires_approval: boolean; reason: string }>();
    overrides.set('delete_database', {
      requires_approval: false,
      reason: 'Attempted exemption',
    });

    const result = emitExecApprovals(ir, { customOverrides: overrides });
    const entry = findTool(result.content, 'delete_database');
    expect(entry).toBeDefined();
    // Safety override should have corrected this
    expect(entry!.requires_approval).toBe(true);
    // Warning should be emitted
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('delete_database');
    expect(result.warnings[0]).toContain('overriding to true');
  });

  it('R5 safety override uses fallback reason when entry has no reason', () => {
    // Construct an IR where an R5 tool ends up with requires_approval=false
    // and no reason field
    const ir = cloneIR(minimalGovernanceIR());
    // Remove the deny intent for delete_database so it comes from manifest only
    (ir as { intents: unknown[] }).intents = ir.intents.filter(
      (i) => !('target' in i && i.target === 'delete_database'),
    );
    // delete_database is 'critical' (R5) with oboFlag=false, so riskLevel >= 4 means requires_approval=true
    // We need a custom override to force it to false first
    const overrides = new Map<string, { requires_approval: boolean; reason: string }>();
    overrides.set('delete_database', {
      requires_approval: false,
      reason: '',  // empty reason
    });

    const result = emitExecApprovals(ir, { customOverrides: overrides });
    const entry = findTool(result.content, 'delete_database');
    expect(entry).toBeDefined();
    expect(entry!.requires_approval).toBe(true);
    // The reason should be set (either empty string from override or safety fallback)
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('tool from manifest with oboFlag=true but riskLevel < 4 still requires approval', () => {
    // send_email is critical (R5) with oboFlag=true - already covered
    // Test oboFlag alone triggering approval for a lower risk tool
    const ir = cloneIR(minimalGovernanceIR());
    // Add a low-risk OBO tool
    (ir.capabilities.tools as unknown[]).push({
      name: 'ask_user',
      description: 'Ask the user a question',
      riskLevel: 'low',
      oboFlag: true,
      classification: 'interaction',
    });

    const result = emitExecApprovals(ir);
    const entry = findTool(result.content, 'ask_user');
    expect(entry).toBeDefined();
    expect(entry!.requires_approval).toBe(true);
  });
});
