/**
 * L0: G-CLASS rules — risk classification, OBO detection, override precedence.
 *
 * 7 unit tests:
 * 1. Classify read-only tool as R1
 * 2. Classify "send email on behalf of user" as R5 with oboDetected:true
 * 3. Multi-capability tool classified at highest risk level
 * 4. Override replaces derived score (audited as [OVERRIDE])
 * 5. Platform built-in tool uses default classification table
 * 6. G-PERM: default capability set is permissive when unspecified
 * 7. G-PERM: capability name normalization to uppercase closed enum
 */

import { describe, it, expect } from 'vitest';
import {
  classifyTool,
  classifyManifest,
  normalizeCapability,
  createGClassRules,
  type ClassificationResult,
  type ClassificationOverride,
  PLATFORM_DEFAULTS,
  CAPABILITY_RISK_MAP,
} from '../../../src/governance/rules/g-class.js';
import type { ToolCapability } from '../../../src/ir/capability-manifest.js';

function makeTool(overrides: Partial<ToolCapability> & { name: string }): ToolCapability {
  return {
    description: '',
    riskLevel: 'low',
    oboFlag: false,
    classification: 'custom',
    ...overrides,
  };
}

describe('G-CLASS risk classification', () => {
  it('classifies read-only tool as R1', () => {
    const tool = makeTool({
      name: 'calculator',
      description: 'Perform arithmetic calculations',
      classification: 'data',
      riskLevel: 'low',
    });

    const result = classifyTool(tool, ['READ']);
    expect(result.riskLevel).toBe(1);
    expect(result.oboDetected).toBe(false);
    expect(result.source).toBe('capability');
  });

  it('classifies "send email on behalf of user" as R5 with oboDetected:true', () => {
    const tool = makeTool({
      name: 'email-sender',
      description: 'Send email on behalf of the user',
      classification: 'communication',
      oboFlag: true,
    });

    const result = classifyTool(tool, ['COMMUNICATE', 'TRANSACT']);
    expect(result.riskLevel).toBe(5);
    expect(result.oboDetected).toBe(true);
    expect(result.source).toBe('capability');
  });

  it('multi-capability tool classified at highest risk level', () => {
    const tool = makeTool({
      name: 'admin-console',
      description: 'Read and write production data, execute commands',
      classification: 'execution',
    });

    // READ=R1, WRITE=R3, EXECUTE=R4 -> max is R4
    const result = classifyTool(tool, ['READ', 'WRITE', 'EXECUTE']);
    expect(result.riskLevel).toBe(4);
    expect(result.source).toBe('capability');
  });

  it('override replaces derived score (audited as [OVERRIDE])', () => {
    const tool = makeTool({
      name: 'safe-bash',
      description: 'Sandboxed shell execution',
      classification: 'execution',
    });

    const override: ClassificationOverride = {
      toolName: 'safe-bash',
      riskLevel: 2,
      reason: 'Sandboxed execution verified by security team',
    };

    // Without override: EXECUTE -> R4
    const derived = classifyTool(tool, ['EXECUTE']);
    expect(derived.riskLevel).toBe(4);

    // With override: forced to R2
    const overridden = classifyTool(tool, ['EXECUTE'], override);
    expect(overridden.riskLevel).toBe(2);
    expect(overridden.source).toBe('override');
    expect(overridden.auditNote).toContain('[OVERRIDE]');
  });

  it('platform built-in tool uses default classification table', () => {
    // 'Read' is a known Claude Code platform built-in
    const tool = makeTool({
      name: 'Read',
      description: 'Read a file from the local filesystem',
      classification: 'filesystem',
    });

    const result = classifyTool(tool, []);
    // When no capabilities are provided, falls to heuristic/platform defaults
    expect(result.riskLevel).toBe(PLATFORM_DEFAULTS['Read']!);
    expect(result.source).toBe('platform-default');
  });

  it('G-PERM: default capability set is permissive when unspecified', () => {
    const tool = makeTool({
      name: 'unknown-tool',
      description: 'A tool with no declared capabilities',
      classification: 'custom',
    });

    // Empty capabilities => default permissive => R1 (lowest)
    const result = classifyTool(tool, []);
    // No platform default either, so heuristic classifies as R1
    expect(result.riskLevel).toBeLessThanOrEqual(2);
    expect(result.source).not.toBe('override');
  });

  it('G-PERM: capability name normalization to uppercase closed enum', () => {
    // All these should normalize to valid capability names
    expect(normalizeCapability('read')).toBe('READ');
    expect(normalizeCapability('Write')).toBe('WRITE');
    expect(normalizeCapability('COMMUNICATE')).toBe('COMMUNICATE');
    expect(normalizeCapability('execute')).toBe('EXECUTE');
    expect(normalizeCapability('transact')).toBe('TRANSACT');

    // Invalid capability normalizes to undefined
    expect(normalizeCapability('fly')).toBeUndefined();
    expect(normalizeCapability('')).toBeUndefined();

    // Verify the closed enum via CAPABILITY_RISK_MAP
    expect(Object.keys(CAPABILITY_RISK_MAP)).toEqual(
      expect.arrayContaining(['READ', 'WRITE', 'COMMUNICATE', 'EXECUTE', 'TRANSACT']),
    );
  });
});

describe('createGClassRules', () => {
  const rules = createGClassRules();

  it('creates 3 rules with correct IDs', () => {
    expect(rules).toHaveLength(3);
    expect(rules.map((r) => r.id)).toEqual(['G-CLASS-01', 'G-CLASS-02', 'G-CLASS-03']);
  });

  it('G-CLASS-01 flags implicit R5 OBO without oboFlag', () => {
    const manifest = {
      tools: [makeTool({
        name: 'send-email',
        description: 'Send email on behalf of user',
        oboFlag: false,
      })],
      skills: [], agents: [], workflows: [],
    };
    const result = rules[0]!.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.severity).toBe('critical');
  });

  it('G-CLASS-01 passes for tools without OBO', () => {
    const manifest = {
      tools: [makeTool({ name: 'calc', description: 'Calculate numbers' })],
      skills: [], agents: [], workflows: [],
    };
    expect(rules[0]!.evaluate(manifest).passed).toBe(true);
  });

  it('G-CLASS-02 flags tools with custom classification', () => {
    const manifest = {
      tools: [makeTool({ name: 'x', description: '', classification: 'custom' })],
      skills: [], agents: [], workflows: [],
    };
    const result = rules[1]!.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.severity).toBe('low');
  });

  it('G-CLASS-02 passes for known classifications', () => {
    const manifest = {
      tools: [makeTool({ name: 'fs', description: '', classification: 'filesystem' })],
      skills: [], agents: [], workflows: [],
    };
    expect(rules[1]!.evaluate(manifest).passed).toBe(true);
  });

  it('G-CLASS-03 flags OBO patterns without oboFlag', () => {
    const manifest = {
      tools: [makeTool({
        name: 'delegate-tool',
        description: 'Delegates auth to another service',
        oboFlag: false,
      })],
      skills: [], agents: [], workflows: [],
    };
    const result = rules[2]!.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.severity).toBe('high');
  });

  it('G-CLASS-03 passes when oboFlag is true', () => {
    const manifest = {
      tools: [makeTool({
        name: 'delegate-tool',
        description: 'Delegates auth to another service',
        oboFlag: true,
      })],
      skills: [], agents: [], workflows: [],
    };
    expect(rules[2]!.evaluate(manifest).passed).toBe(true);
  });
});

describe('G-CLASS: heuristic/keyword classification', () => {
  it('classifies deploy-related tool via keyword heuristic', () => {
    const tool = makeTool({ name: 'deployer', description: 'Deploy to production' });
    const result = classifyTool(tool, []);
    expect(result.riskLevel).toBe(4);
    expect(result.source).toBe('heuristic');
  });

  it('classifies network tool via keyword heuristic', () => {
    const tool = makeTool({ name: 'fetcher', description: 'HTTP API request handler' });
    const result = classifyTool(tool, []);
    expect(result.riskLevel).toBe(3);
    expect(result.source).toBe('heuristic');
  });

  it('OBO detected via description elevates to R5 in keyword tier', () => {
    const tool = makeTool({
      name: 'mailer',
      description: 'Impersonate the user to send notifications',
    });
    const result = classifyTool(tool, []);
    expect(result.riskLevel).toBe(5);
    expect(result.oboDetected).toBe(true);
  });

  it('OBO via oboFlag elevates platform-default to R5', () => {
    const tool = makeTool({ name: 'Read', description: 'Read files', oboFlag: true });
    const result = classifyTool(tool, []);
    expect(result.riskLevel).toBe(5);
    expect(result.oboDetected).toBe(true);
    expect(result.source).toBe('platform-default');
  });
});

describe('G-CLASS manifest classification', () => {
  it('classifies all tools in a manifest', () => {
    const tools: ToolCapability[] = [
      makeTool({ name: 'calc', description: 'Calculator', classification: 'data' }),
      makeTool({
        name: 'email',
        description: 'Send email on behalf of user',
        classification: 'communication',
        oboFlag: true,
      }),
    ];

    const results = classifyManifest(
      { tools, skills: [], agents: [], workflows: [] },
      {
        calc: ['READ'],
        email: ['COMMUNICATE', 'TRANSACT'],
      },
    );

    expect(results).toHaveLength(2);
    const calcResult = results.find((r) => r.toolName === 'calc');
    const emailResult = results.find((r) => r.toolName === 'email');
    expect(calcResult!.riskLevel).toBe(1);
    expect(emailResult!.riskLevel).toBe(5);
    expect(emailResult!.oboDetected).toBe(true);
  });
});
