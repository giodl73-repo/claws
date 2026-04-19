import { describe, it, expect } from 'vitest';

import { applyRules } from '../src/governance/rule-apply.js';
import { MINIMAL_IR } from './ops-fixtures.js';

describe('applyRules — R5 fail-closed', () => {
  it('flags R5 tool missing IRREVERSIBLE_EXTERNAL and routes through review', () => {
    const result = applyRules(MINIMAL_IR, { toolName: 'delete-db', args: {} });
    expect(result.decision).toBe('review');
    expect(result.requireApproval).toBe(true);
    expect(result.violations.some((v) => v.family === 'G-OUTPUT')).toBe(true);
  });
});

describe('applyRules — RESTRICTED sticky', () => {
  it('propagates RESTRICTED sensitivity and modifies a non-R5 tool decision', () => {
    const result = applyRules(MINIMAL_IR, {
      toolName: 'read-file',
      args: {},
      provenance: [
        { source: 'user_prompt', sensitivity: 'INTERNAL' },
        { source: 'memory', sensitivity: 'RESTRICTED' },
      ],
    });
    expect(result.propagatedSensitivity).toBe('RESTRICTED');
    expect(result.decision).toBe('modify');
  });
});

describe('applyRules — propagation', () => {
  it('picks max sensitivity across provenance traces', () => {
    const result = applyRules(MINIMAL_IR, {
      toolName: 'read-file',
      args: {},
      provenance: [
        { source: 'user_prompt', sensitivity: 'PUBLIC' },
        { source: 'tool_output', sensitivity: 'CONFIDENTIAL' },
        { source: 'agent_literal', sensitivity: 'INTERNAL' },
      ],
    });
    expect(result.propagatedSensitivity).toBe('CONFIDENTIAL');
  });
});

describe('applyRules — capability clamp', () => {
  it('clamps COMMUNICATE and IRREVERSIBLE_EXTERNAL when provenance is RESTRICTED', () => {
    const result = applyRules(MINIMAL_IR, {
      toolName: 'send-email',
      args: {},
      provenance: [{ source: 'memory', sensitivity: 'RESTRICTED' }],
    });
    expect(result.capabilityClamp).not.toContain('COMMUNICATE');
    expect(result.capabilityClamp).not.toContain('IRREVERSIBLE_EXTERNAL');
  });
});

describe('applyRules — deny rule match', () => {
  it('denies tool matching SOUL deny pattern with G-DENY violation', () => {
    const result = applyRules(MINIMAL_IR, { toolName: 'send-secret-key', args: {} });
    expect(result.decision).toBe('deny');
    expect(result.violations.some((v) => v.family === 'G-DENY')).toBe(true);
  });

  it('review on unknown tool', () => {
    const result = applyRules(MINIMAL_IR, { toolName: 'never-seen', args: {} });
    expect(result.decision).toBe('review');
    expect(result.requireApproval).toBe(true);
  });

  it('allows well-known R1 tool with no provenance', () => {
    const result = applyRules(MINIMAL_IR, { toolName: 'read-file', args: {} });
    expect(result.decision).toBe('allow');
    expect(result.requireApproval).toBe(false);
  });

  it('R5 with IRREVERSIBLE_EXTERNAL still goes through review + approval', () => {
    const result = applyRules(MINIMAL_IR, { toolName: 'send-email', args: {} });
    expect(result.decision).toBe('review');
    expect(result.requireApproval).toBe(true);
  });

  it('invalid regex pattern falls back to literal string match', () => {
    const brokenIR = {
      ...MINIMAL_IR,
      soul: {
        ...MINIMAL_IR.soul,
        denyRules: [{ id: 'lit', pattern: '(invalid[regex', reason: 'literal', severity: 'block' as const }],
      },
    };
    // The literal pattern must match the tool name exactly when regex fails to compile
    const matching = applyRules(brokenIR, { toolName: '(invalid[regex', args: {} });
    expect(matching.decision).toBe('deny');
    // read-file is a declared tool — not a deny literal match, so falls to allow
    const notMatching = applyRules(brokenIR, { toolName: 'read-file', args: {} });
    expect(notMatching.decision).toBe('allow');
  });
});
