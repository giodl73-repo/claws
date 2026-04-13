/**
 * L0: exec-approvals.json emitter — R5 tool entries, custom overrides,
 * built-in tools, platform schema validation.
 *
 * 2 unit tests:
 * 1. exec-approvals.json has entries for every R5 tool
 * 2. exec-approvals.json validates against OC platform schema
 */

import { describe, it, expect } from 'vitest';
import {
  emitExecApprovals,
  type ExecApprovalsResult,
  type ExecApprovalEntry,
  OC_EXEC_APPROVALS_SCHEMA,
} from '../../src/emit/emit-exec-approvals.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

describe('emitExecApprovals', () => {
  it('has entries for every R5 tool', () => {
    const ir = minimalGovernanceIR();
    const result = emitExecApprovals(ir);

    // Parse the JSON output
    const approvals = JSON.parse(result.content);

    // Must be an object with tools array
    expect(approvals).toHaveProperty('tools');
    expect(Array.isArray(approvals.tools)).toBe(true);

    // Find R5 tools from intents (deny intents at level 5)
    const r5Tools = ir.intents
      .filter((i) => i.kind === 'deny' && i.level === 5)
      .map((i) => (i as { target: string }).target);

    // Every R5 tool must have an entry
    for (const toolName of r5Tools) {
      const entry = approvals.tools.find(
        (t: ExecApprovalEntry) => t.tool_name === toolName,
      );
      expect(entry, `Missing exec-approval entry for R5 tool: ${toolName}`).toBeDefined();
      expect(entry.requires_approval).toBe(true);
    }

    // Entries must have required fields
    for (const entry of approvals.tools) {
      expect(entry).toHaveProperty('tool_name');
      expect(entry).toHaveProperty('requires_approval');
      expect(typeof entry.tool_name).toBe('string');
      expect(typeof entry.requires_approval).toBe('boolean');
    }

    // Warnings should be an array
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('validates against OC platform schema', () => {
    const ir = minimalGovernanceIR();
    const result = emitExecApprovals(ir);

    // Parse the output
    const approvals = JSON.parse(result.content);

    // Validate top-level structure matches the frozen schema
    expect(approvals).toHaveProperty('schema_version');
    expect(typeof approvals.schema_version).toBe('number');
    expect(approvals).toHaveProperty('tools');
    expect(Array.isArray(approvals.tools)).toBe(true);

    // Each entry must match schema shape
    for (const entry of approvals.tools) {
      // Required fields per OC platform spec
      expect(entry).toHaveProperty('tool_name');
      expect(entry).toHaveProperty('requires_approval');

      // Optional fields must be correct types if present
      if ('risk_level' in entry) {
        expect(typeof entry.risk_level).toBe('number');
        expect(entry.risk_level).toBeGreaterThanOrEqual(1);
        expect(entry.risk_level).toBeLessThanOrEqual(5);
      }
      if ('reason' in entry) {
        expect(typeof entry.reason).toBe('string');
      }
      if ('rule_id' in entry) {
        expect(typeof entry.rule_id).toBe('string');
      }
      if ('is_builtin' in entry) {
        expect(typeof entry.is_builtin).toBe('boolean');
      }
    }

    // Validate against the frozen schema definition
    const schemaKeys = Object.keys(OC_EXEC_APPROVALS_SCHEMA.properties);
    for (const key of Object.keys(approvals)) {
      expect(schemaKeys, `Unexpected top-level key: ${key}`).toContain(key);
    }
  });

  it('includes custom approval overrides', () => {
    const ir = minimalGovernanceIR();

    // Add a custom override: execute_command requires approval
    const overrides = new Map<string, { requires_approval: boolean; reason: string }>();
    overrides.set('execute_command', {
      requires_approval: true,
      reason: 'Custom policy: all shell commands need approval',
    });

    const result = emitExecApprovals(ir, { customOverrides: overrides });
    const approvals = JSON.parse(result.content);

    // Find the overridden entry
    const entry = approvals.tools.find(
      (t: ExecApprovalEntry) => t.tool_name === 'execute_command',
    );
    expect(entry).toBeDefined();
    expect(entry.requires_approval).toBe(true);
    expect(entry.reason).toContain('Custom policy');
  });

  it('includes built-in tools', () => {
    const ir = minimalGovernanceIR();

    const builtins = ['Read', 'Write', 'Bash'];
    const result = emitExecApprovals(ir, { builtinTools: builtins });
    const approvals = JSON.parse(result.content);

    // Built-in tools should be in the list
    for (const name of builtins) {
      const entry = approvals.tools.find(
        (t: ExecApprovalEntry) => t.tool_name === name,
      );
      expect(entry, `Missing built-in tool: ${name}`).toBeDefined();
      expect(entry.is_builtin).toBe(true);
    }
  });

  it('uses OC platform field names (snake_case)', () => {
    const ir = minimalGovernanceIR();
    const result = emitExecApprovals(ir);
    const approvals = JSON.parse(result.content);

    // OC platform uses snake_case, not camelCase
    for (const entry of approvals.tools) {
      // Must use snake_case field names
      expect(entry).toHaveProperty('tool_name');
      expect(entry).toHaveProperty('requires_approval');

      // Must NOT have camelCase variants
      expect(entry).not.toHaveProperty('toolName');
      expect(entry).not.toHaveProperty('requiresApproval');
      expect(entry).not.toHaveProperty('riskLevel');
      expect(entry).not.toHaveProperty('ruleId');
      expect(entry).not.toHaveProperty('isBuiltin');
    }
  });
});
