/**
 * L0: G-ELICIT rules — elicitation gates for R5/OBO tools.
 *
 * 4 unit tests:
 * 1. G-ELICIT attaches gate to every R5 tool with elicitRequired:true
 * 2. G-ELICIT timeout results in DENY
 * 3. G-ELICIT distinguishes pre-authorized from ungoverned
 * 4. G-ELICIT chain limit enforcement
 */

import { describe, it, expect } from 'vitest';
import {
  createGElicitRules,
  type ElicitConfig,
  type ElicitToolEntry,
} from '../../../src/governance/rules/g-elicit.js';
import type {
  CapabilityManifest,
  ToolCapability,
} from '../../../src/ir/capability-manifest.js';

function makeTool(name: string, desc = '', obo = false): ToolCapability {
  return {
    name,
    description: desc,
    riskLevel: obo ? 'critical' : 'low',
    oboFlag: obo,
    classification: 'custom',
  };
}

function makeManifest(tools: ToolCapability[]): CapabilityManifest {
  return { tools, skills: [], agents: [], workflows: [] };
}

describe('G-ELICIT-GATE', () => {
  it('attaches gate to every R5 tool regardless of OBO flag', () => {
    const rules = createGElicitRules({
      tools: [
        { name: 'email-sender', riskLevel: 5, obo: true, elicitRequired: false },
        { name: 'deploy-prod', riskLevel: 5, obo: false, elicitRequired: false },
        { name: 'Read', riskLevel: 1, obo: false, elicitRequired: false },
      ],
      userAuthority: [],
      timeoutMs: 30_000,
      chainLimit: 3,
    });

    const gateRule = rules.find((r) => r.id === 'G-ELICIT-GATE')!;
    expect(gateRule).toBeDefined();

    const manifest = makeManifest([
      makeTool('email-sender', 'Send email on behalf of user', true),
      makeTool('deploy-prod', 'Deploy to production'),
      makeTool('Read', 'Read files'),
    ]);

    const result = gateRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    // Both R5 tools (OBO and non-OBO) without elicitRequired
    expect(result.violations.length).toBe(2);
    expect(result.violations.every((v) => v.message.includes('elicitRequired'))).toBe(true);
    expect(result.violations.every((v) => v.severity === 'critical')).toBe(true);
  });

  it('fires on non-OBO R5 tools', () => {
    const rules = createGElicitRules({
      tools: [
        { name: 'deploy-prod', riskLevel: 5, obo: false, elicitRequired: false },
      ],
      userAuthority: [],
      timeoutMs: 30_000,
      chainLimit: 3,
    });

    const gateRule = rules.find((r) => r.id === 'G-ELICIT-GATE')!;
    const manifest = makeManifest([
      makeTool('deploy-prod', 'Deploy to production'),
    ]);

    const result = gateRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(1);
    expect(result.violations[0]!.message).toContain('deploy-prod');
  });

  it('passes when R5 tools have elicitRequired:true', () => {
    const rules = createGElicitRules({
      tools: [
        { name: 'email-sender', riskLevel: 5, obo: true, elicitRequired: true },
        { name: 'deploy-prod', riskLevel: 5, obo: false, elicitRequired: true },
      ],
      userAuthority: [],
      timeoutMs: 30_000,
      chainLimit: 3,
    });

    const gateRule = rules.find((r) => r.id === 'G-ELICIT-GATE')!;
    const manifest = makeManifest([
      makeTool('email-sender', 'Send email on behalf of user', true),
      makeTool('deploy-prod', 'Deploy to production'),
    ]);

    const result = gateRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });
});

describe('G-ELICIT-TIMEOUT', () => {
  it('timeout results in DENY (deny-default)', () => {
    const rules = createGElicitRules({
      tools: [
        { name: 'email-sender', riskLevel: 5, obo: true, elicitRequired: true, timeoutAction: 'allow' },
      ],
      userAuthority: [],
      timeoutMs: 30_000,
      chainLimit: 3,
    });

    const timeoutRule = rules.find((r) => r.id === 'G-ELICIT-TIMEOUT')!;
    expect(timeoutRule).toBeDefined();

    const manifest = makeManifest([
      makeTool('email-sender', 'Send email on behalf of user', true),
    ]);

    const result = timeoutRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.message).toContain('timeout');
    expect(result.violations[0]!.message).toMatch(/deny/i);
    expect(result.violations[0]!.severity).toBe('critical');
  });

  it('passes when timeout action is deny', () => {
    const rules = createGElicitRules({
      tools: [
        { name: 'email-sender', riskLevel: 5, obo: true, elicitRequired: true, timeoutAction: 'deny' },
      ],
      userAuthority: [],
      timeoutMs: 30_000,
      chainLimit: 3,
    });

    const timeoutRule = rules.find((r) => r.id === 'G-ELICIT-TIMEOUT')!;
    const manifest = makeManifest([
      makeTool('email-sender', 'Send email on behalf of user', true),
    ]);

    const result = timeoutRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });
});

describe('G-ELICIT-PREAUTH', () => {
  it('distinguishes pre-authorized from ungoverned', () => {
    const rules = createGElicitRules({
      tools: [
        { name: 'email-sender', riskLevel: 5, obo: true, elicitRequired: true },
        { name: 'calendar-book', riskLevel: 5, obo: true, elicitRequired: false },
        { name: 'deploy-prod', riskLevel: 5, obo: false, elicitRequired: false },
      ],
      userAuthority: ['email-sender'],
      timeoutMs: 30_000,
      chainLimit: 3,
    });

    const preauthRule = rules.find((r) => r.id === 'G-ELICIT-PREAUTH')!;
    expect(preauthRule).toBeDefined();

    const manifest = makeManifest([
      makeTool('email-sender', 'Send email on behalf of user', true),
      makeTool('calendar-book', 'Book meetings on behalf of user', true),
      makeTool('deploy-prod', 'Deploy to production'),
    ]);

    const result = preauthRule.evaluate(manifest);
    // email-sender is pre-authorized (in userAuthority list) => OK
    // calendar-book is R5+OBO without authority => ungoverned => violation
    // deploy-prod is R5 but not OBO => no elicit gate needed
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(1);
    expect(result.violations[0]!.message).toContain('calendar-book');
    expect(result.violations[0]!.message).toMatch(/ungoverned/i);
  });
});

describe('G-ELICIT-CHAIN', () => {
  it('enforces chain limit on delegation depth', () => {
    const rules = createGElicitRules({
      tools: [
        { name: 'email-sender', riskLevel: 5, obo: true, elicitRequired: true, delegationDepth: 5 },
      ],
      userAuthority: [],
      timeoutMs: 30_000,
      chainLimit: 3,
    });

    const chainRule = rules.find((r) => r.id === 'G-ELICIT-CHAIN')!;
    expect(chainRule).toBeDefined();

    const manifest = makeManifest([
      makeTool('email-sender', 'Send email on behalf of user', true),
    ]);

    const result = chainRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.message).toContain('chain');
    expect(result.violations[0]!.message).toContain('5');
    expect(result.violations[0]!.message).toContain('3');
    expect(result.violations[0]!.severity).toBe('high');
  });

  it('passes when delegation depth is within limit', () => {
    const rules = createGElicitRules({
      tools: [
        { name: 'email-sender', riskLevel: 5, obo: true, elicitRequired: true, delegationDepth: 2 },
      ],
      userAuthority: [],
      timeoutMs: 30_000,
      chainLimit: 3,
    });

    const chainRule = rules.find((r) => r.id === 'G-ELICIT-CHAIN')!;
    const manifest = makeManifest([
      makeTool('email-sender', 'Send email on behalf of user', true),
    ]);

    const result = chainRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });

  it('schedule delegation traces to subagent R5 tool', () => {
    const rules = createGElicitRules({
      tools: [
        {
          name: 'scheduled-email',
          riskLevel: 5,
          obo: true,
          elicitRequired: true,
          delegationDepth: 4,
          scheduleDelegation: true,
        },
      ],
      userAuthority: [],
      timeoutMs: 30_000,
      chainLimit: 3,
    });

    const chainRule = rules.find((r) => r.id === 'G-ELICIT-CHAIN')!;
    const manifest = makeManifest([
      makeTool('scheduled-email', 'Send scheduled email on behalf of user', true),
    ]);

    const result = chainRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    // Schedule delegation should be flagged even more strictly
    expect(result.violations[0]!.severity).toBe('critical');
    expect(result.violations[0]!.message).toContain('schedule');
  });
});
