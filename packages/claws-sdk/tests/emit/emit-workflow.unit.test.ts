/**
 * L0: Workflow inversion engine — governance step injection into lobster.yaml DAGs.
 *
 * 6 unit tests:
 * 1. R5 send-email step gets elicit + audit steps injected
 * 2. Original step ordering preserved after injection
 * 3. R1-R2 steps get no injected governance steps (elicit/audit)
 * 4. Injected step naming follows `claws-{type}-{tool-name}` convention
 * 5. Classification step injected for ALL tool-using steps (not only R5)
 * 6. First-step governance: pre-workflow gate when trigger uses R5 tool
 */

import { describe, it, expect } from 'vitest';
import {
  invertWorkflow,
  governanceStepName,
  type WorkflowDAG,
  type WorkflowStepNode,
  type ToolRiskMap,
} from '../../src/emit/emit-workflow.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makeStep(name: string, command: string): WorkflowStepNode {
  return { name, command, dependsOn: [] };
}

function makeDAG(
  name: string,
  steps: WorkflowStepNode[],
  riskMap: ToolRiskMap,
): WorkflowDAG {
  return { name, description: '', steps, riskMap };
}

/**
 * Risk map: send-email = R5/OBO, execute-command = R4, write-file = R3,
 * read-file = R1, npm = R2.
 */
function defaultRiskMap(): ToolRiskMap {
  return new Map<string, { riskLevel: number; oboFlag: boolean }>([
    ['send-email', { riskLevel: 5, oboFlag: true }],
    ['execute-command', { riskLevel: 4, oboFlag: false }],
    ['deploy', { riskLevel: 5, oboFlag: false }],
    ['write-file', { riskLevel: 3, oboFlag: false }],
    ['read-file', { riskLevel: 1, oboFlag: false }],
    ['npm', { riskLevel: 2, oboFlag: false }],
    ['log', { riskLevel: 1, oboFlag: false }],
    ['git', { riskLevel: 2, oboFlag: false }],
    ['run', { riskLevel: 2, oboFlag: false }],
    ['request-approval', { riskLevel: 4, oboFlag: false }],
    ['secret-scanner', { riskLevel: 2, oboFlag: false }],
    ['read', { riskLevel: 1, oboFlag: false }],
  ]);
}

function findStep(steps: readonly WorkflowStepNode[], name: string): WorkflowStepNode | undefined {
  return steps.find(s => s.name === name);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('invertWorkflow', () => {
  it('R5 send-email step gets elicit + audit steps injected', () => {
    const steps = [
      makeStep('read-config', 'read config.json'),
      makeStep('send-email', 'send-email --to user@example.com'),
      makeStep('log-result', 'log audit trail'),
    ];
    const dag = makeDAG('basic-check', steps, defaultRiskMap());
    const result = invertWorkflow(dag);

    // Should have elicit gate before send-email
    const elicit = findStep(result.steps, 'claws-elicit-send-email');
    expect(elicit).toBeDefined();

    // Should have audit step after send-email
    const audit = findStep(result.steps, 'claws-audit-send-email');
    expect(audit).toBeDefined();

    // Audit step must be async/non-blocking
    expect(audit!.async).toBe(true);
  });

  it('original step ordering preserved after injection', () => {
    const steps = [
      makeStep('read-config', 'read config.json'),
      makeStep('send-email', 'send-email --to user@example.com'),
      makeStep('log-result', 'log audit trail'),
    ];
    const dag = makeDAG('basic-check', steps, defaultRiskMap());
    const result = invertWorkflow(dag);

    // Extract only the original step names (non-claws-prefixed)
    const originalNames = result.steps
      .filter(s => !s.name.startsWith('claws-'))
      .map(s => s.name);
    expect(originalNames).toEqual(['read-config', 'send-email', 'log-result']);

    // The elicit step must appear BEFORE its target
    const allNames = result.steps.map(s => s.name);
    const elicitIdx = allNames.indexOf('claws-elicit-send-email');
    const sendIdx = allNames.indexOf('send-email');
    const auditIdx = allNames.indexOf('claws-audit-send-email');
    expect(elicitIdx).toBeLessThan(sendIdx);
    expect(sendIdx).toBeLessThan(auditIdx);
  });

  it('R1-R2 steps get no injected governance steps (elicit/audit)', () => {
    const steps = [
      makeStep('read-config', 'read config.json'),
      makeStep('log-result', 'log audit trail'),
    ];
    const dag = makeDAG('safe-flow', steps, defaultRiskMap());
    const result = invertWorkflow(dag);

    // No elicit or audit steps for R1-R2 tools
    const governanceElicitAudit = result.steps.filter(
      s => s.name.startsWith('claws-elicit-') || s.name.startsWith('claws-audit-'),
    );
    expect(governanceElicitAudit).toHaveLength(0);
  });

  it('injected step naming follows claws-{type}-{tool-name} convention', () => {
    const steps = [
      makeStep('send-email', 'send-email --to user@example.com'),
      makeStep('deploy-staging', 'deploy --env staging'),
    ];
    const dag = makeDAG('naming-test', steps, defaultRiskMap());
    const result = invertWorkflow(dag);

    const governanceNames = result.steps
      .filter(s => s.name.startsWith('claws-'))
      .map(s => s.name);

    // All governance steps must match claws-{type}-{tool-name} pattern
    for (const name of governanceNames) {
      expect(name).toMatch(/^claws-(elicit|audit|classify)-[\w-]+$/);
    }

    // Specific names expected
    expect(governanceNames).toContain('claws-elicit-send-email');
    expect(governanceNames).toContain('claws-audit-send-email');
    expect(governanceNames).toContain('claws-classify-send-email');
    expect(governanceNames).toContain('claws-classify-deploy');
  });

  it('classification step injected for ALL tool-using steps (R1+)', () => {
    const steps = [
      makeStep('read-config', 'read config.json'),
      makeStep('send-email', 'send-email --to user@example.com'),
      makeStep('log-result', 'log audit trail'),
    ];
    const dag = makeDAG('classify-all', steps, defaultRiskMap());
    const result = invertWorkflow(dag);

    // Every original step should have a classify step
    expect(findStep(result.steps, 'claws-classify-read')).toBeDefined();
    expect(findStep(result.steps, 'claws-classify-send-email')).toBeDefined();
    expect(findStep(result.steps, 'claws-classify-log')).toBeDefined();
  });

  it('first-step governance: pre-workflow gate when first step uses R5 tool', () => {
    const steps = [
      makeStep('send-email', 'send-email --to admin@example.com'),
      makeStep('log-result', 'log done'),
    ];
    const dag = makeDAG('first-step-r5', steps, defaultRiskMap());
    const result = invertWorkflow(dag);

    // Pre-workflow gate must be the very first step
    expect(result.steps[0]!.name).toBe('claws-elicit-send-email');

    // The elicit step should depend on nothing (it's the entry gate)
    expect(result.steps[0]!.dependsOn).toEqual([]);
  });
});

describe('governanceStepName', () => {
  it('produces claws-{type}-{toolName} format', () => {
    expect(governanceStepName('elicit', 'send-email')).toBe('claws-elicit-send-email');
    expect(governanceStepName('audit', 'deploy')).toBe('claws-audit-deploy');
    expect(governanceStepName('classify', 'read-file')).toBe('claws-classify-read-file');
  });
});
