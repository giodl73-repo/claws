/**
 * L0: Workflow inversion engine — branch coverage for disambiguation,
 * unknown tool default R5, R3-R4 elicit/audit, fail mode resolution.
 */

import { describe, it, expect } from 'vitest';
import {
  invertWorkflow,
  type WorkflowDAG,
  type WorkflowStepNode,
  type ToolRiskMap,
} from '../../src/emit/emit-workflow.js';

function makeStep(name: string, command: string, dependsOn: string[] = []): WorkflowStepNode {
  return { name, command, dependsOn };
}

function makeDAG(
  name: string,
  steps: WorkflowStepNode[],
  riskMap: ToolRiskMap,
): WorkflowDAG {
  return { name, description: 'test', steps, riskMap };
}

describe('invertWorkflow — branch coverage', () => {
  it('unknown tool (not in risk map) defaults to R5 and gets full governance', () => {
    const riskMap: ToolRiskMap = new Map(); // empty — all tools unknown
    const steps = [makeStep('step1', 'mystery-tool --arg')];
    const dag = makeDAG('unknown-tool', steps, riskMap);
    const result = invertWorkflow(dag);

    // Unknown tool → R5 → first-step R5 path → elicit as first step
    expect(result.steps[0]!.name).toBe('claws-elicit-mystery-tool');
    expect(result.steps[0]!.failMode).toBe('closed');

    // Also gets classify and audit
    const names = result.steps.map((s) => s.name);
    expect(names).toContain('claws-classify-mystery-tool');
    expect(names).toContain('claws-audit-mystery-tool');
  });

  it('R3 tool gets elicit + audit but not first-step gate', () => {
    const riskMap: ToolRiskMap = new Map([
      ['read', { riskLevel: 1, oboFlag: false }],
      ['write-file', { riskLevel: 3, oboFlag: false }],
    ]);
    const steps = [
      makeStep('step1', 'read config'),
      makeStep('step2', 'write-file output.txt'),
    ];
    const dag = makeDAG('r3-test', steps, riskMap);
    const result = invertWorkflow(dag);

    // write-file is R3, not first step, so elicit + audit injected
    const names = result.steps.map((s) => s.name);
    expect(names).toContain('claws-elicit-write-file');
    expect(names).toContain('claws-audit-write-file');

    // First step is NOT elicit (it's classify for read)
    expect(result.steps[0]!.name).toBe('claws-classify-read');
  });

  it('R4 tool gets elicit with fail-closed mode', () => {
    const riskMap: ToolRiskMap = new Map([
      ['execute-command', { riskLevel: 4, oboFlag: false }],
    ]);
    const steps = [makeStep('run', 'execute-command ls')];
    const dag = makeDAG('r4-test', steps, riskMap);
    const result = invertWorkflow(dag);

    // R4 first step is not isFirstStepR5 (only R5+), so elicit goes through non-first path
    const elicit = result.steps.find(
      (s) => s.name === 'claws-elicit-execute-command',
    );
    expect(elicit).toBeDefined();
    expect(elicit!.failMode).toBe('closed');
  });

  it('disambiguates governance step names when collisions occur', () => {
    const riskMap: ToolRiskMap = new Map([
      ['deploy', { riskLevel: 5, oboFlag: false }],
    ]);
    // Two steps using the same tool → governance step names collide
    const steps = [
      makeStep('deploy-staging', 'deploy --env staging'),
      makeStep('deploy-prod', 'deploy --env prod'),
    ];
    const dag = makeDAG('disambig', steps, riskMap);
    const result = invertWorkflow(dag);

    const names = result.steps.map((s) => s.name);
    // First deploy gets claws-elicit-deploy, second gets claws-elicit-deploy-2
    expect(names.filter((n) => n.startsWith('claws-elicit-deploy')).length).toBe(2);
    expect(names).toContain('claws-elicit-deploy');
    expect(names).toContain('claws-elicit-deploy-2');

    // Same for classify and audit
    expect(names.filter((n) => n.startsWith('claws-classify-deploy')).length).toBe(2);
    expect(names.filter((n) => n.startsWith('claws-audit-deploy')).length).toBe(2);
  });

  it('disambiguates when original step name collides with governance name', () => {
    const riskMap: ToolRiskMap = new Map([
      ['deploy', { riskLevel: 5, oboFlag: false }],
    ]);
    // Original step name collides with expected governance step name
    const steps = [
      makeStep('claws-elicit-deploy', 'deploy --env test'),
      makeStep('deploy-real', 'deploy --env prod'),
    ];
    const dag = makeDAG('name-collision', steps, riskMap);
    const result = invertWorkflow(dag);

    const names = result.steps.map((s) => s.name);
    // The governance elicit step should be disambiguated since original step has that name
    expect(names.filter((n) => n.startsWith('claws-elicit-deploy')).length).toBeGreaterThanOrEqual(2);
    expect(names).toContain('claws-elicit-deploy-2');
  });

  it('audit steps are async and fail-open', () => {
    const riskMap: ToolRiskMap = new Map([
      ['send-email', { riskLevel: 5, oboFlag: true }],
    ]);
    const steps = [makeStep('email', 'send-email --to x@y.com')];
    const dag = makeDAG('audit-props', steps, riskMap);
    const result = invertWorkflow(dag);

    const audit = result.steps.find((s) => s.governanceType === 'audit');
    expect(audit).toBeDefined();
    expect(audit!.async).toBe(true);
    expect(audit!.failMode).toBe('open');
  });

  it('classify steps are always fail-open', () => {
    const riskMap: ToolRiskMap = new Map([
      ['send-email', { riskLevel: 5, oboFlag: true }],
    ]);
    const steps = [makeStep('email', 'send-email --to x@y.com')];
    const dag = makeDAG('classify-open', steps, riskMap);
    const result = invertWorkflow(dag);

    const classify = result.steps.find((s) => s.governanceType === 'classify');
    expect(classify).toBeDefined();
    expect(classify!.failMode).toBe('open');
  });

  it('R1-R2 tools get fail-open elicit when risk level <= 2', () => {
    const riskMap: ToolRiskMap = new Map([
      ['read', { riskLevel: 1, oboFlag: false }],
    ]);
    const steps = [makeStep('r', 'read file.txt')];
    const dag = makeDAG('low-risk', steps, riskMap);
    const result = invertWorkflow(dag);

    // R1 tool: no elicit or audit, only classify
    const names = result.steps.map((s) => s.name);
    expect(names).not.toContain('claws-elicit-read');
    expect(names).not.toContain('claws-audit-read');
    expect(names).toContain('claws-classify-read');
  });

  it('empty command falls back to empty tool name', () => {
    const riskMap: ToolRiskMap = new Map(); // empty
    const steps = [makeStep('step1', '   ')]; // whitespace-only command
    const dag = makeDAG('empty-cmd', steps, riskMap);
    const result = invertWorkflow(dag);

    // extractToolName returns '' for empty/whitespace command
    // Empty string is not in risk map → R5 default
    const names = result.steps.map((s) => s.name);
    // Should still generate governance steps with empty tool name
    expect(names.some((n) => n.startsWith('claws-classify-'))).toBe(true);
  });

  it('R1 tool in non-first position gets fail-open classify only', () => {
    const riskMap: ToolRiskMap = new Map([
      ['deploy', { riskLevel: 5, oboFlag: false }],
      ['read', { riskLevel: 1, oboFlag: false }],
    ]);
    const steps = [
      makeStep('s1', 'deploy prod'),
      makeStep('s2', 'read file'),
    ];
    const dag = makeDAG('low-after-high', steps, riskMap);
    const result = invertWorkflow(dag);

    // read (R1) classify should have failMode 'open'
    const readClassify = result.steps.find(
      (s) => s.name === 'claws-classify-read',
    );
    expect(readClassify).toBeDefined();
    expect(readClassify!.failMode).toBe('open');
  });

  it('injectedCount matches actual governance steps', () => {
    const riskMap: ToolRiskMap = new Map([
      ['read', { riskLevel: 1, oboFlag: false }],
      ['deploy', { riskLevel: 5, oboFlag: false }],
    ]);
    const steps = [
      makeStep('s1', 'read file'),
      makeStep('s2', 'deploy prod'),
    ];
    const dag = makeDAG('count-test', steps, riskMap);
    const result = invertWorkflow(dag);

    const injected = result.steps.filter((s) => s.injected === true);
    expect(result.injectedCount).toBe(injected.length);
  });
});
