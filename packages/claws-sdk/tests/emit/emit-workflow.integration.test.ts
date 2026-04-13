/**
 * L1: Workflow inversion integration tests — full workflow inversion
 * on realistic fixtures with diverse steps and parallel branches.
 *
 * 2 integration tests:
 * 1. Full workflow inversion on SOC2 fixture with diverse steps
 * 2. Parallel branch handling: elicitation in parallel DAG branches
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  invertWorkflow,
  type WorkflowDAG,
  type WorkflowStepNode,
  type ToolRiskMap,
} from '../../src/emit/emit-workflow.js';

// ── Helpers ────────────────────────────────────────────────────────────

function soc2RiskMap(): ToolRiskMap {
  return new Map<string, { riskLevel: number; oboFlag: boolean }>([
    ['git', { riskLevel: 2, oboFlag: false }],
    ['run', { riskLevel: 2, oboFlag: false }],
    ['npm', { riskLevel: 2, oboFlag: false }],
    ['send-email', { riskLevel: 5, oboFlag: true }],
    ['deploy', { riskLevel: 5, oboFlag: false }],
    ['request-approval', { riskLevel: 4, oboFlag: false }],
    ['log', { riskLevel: 1, oboFlag: false }],
    ['secret-scanner', { riskLevel: 2, oboFlag: false }],
  ]);
}

function loadFixture(fixturePath: string): string {
  return readFileSync(resolve(__dirname, fixturePath), 'utf-8');
}

/**
 * Parse a lobster.yaml fixture into a WorkflowDAG.
 *
 * Full line-based parser that handles both step-level and top-level
 * dependency formats. The existing extractWorkflowIntents has a known
 * bug with command parsing (regex expects leading whitespace on trimmed
 * text) so this parser handles both formats correctly.
 */
function parseFixtureToDAG(fixturePath: string, riskMap: ToolRiskMap): WorkflowDAG {
  const content = loadFixture(fixturePath);
  const lines = content.split('\n');

  let name = '';
  let description = '';
  const steps: { name: string; command: string }[] = [];
  const deps: Record<string, string[]> = {};

  let section: 'top' | 'steps' | 'dependencies' = 'top';
  let currentStepName = '';
  let currentStepCmd = '';
  let currentDepStep = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // Top-level section headers
    if (trimmed === 'steps:') { section = 'steps'; continue; }
    if (trimmed === 'dependencies:') { section = 'dependencies'; continue; }

    if (section === 'top') {
      const nameMatch = /^name:\s*(.+)$/.exec(trimmed);
      if (nameMatch) { name = nameMatch[1]!.trim(); continue; }
      const descMatch = /^description:\s*(.+)$/.exec(trimmed);
      if (descMatch) { description = descMatch[1]!.trim(); continue; }
    }

    if (section === 'steps') {
      // New step
      const stepMatch = /^-\s+name:\s*(.+)$/.exec(trimmed);
      if (stepMatch) {
        if (currentStepName.length > 0) steps.push({ name: currentStepName, command: currentStepCmd });
        currentStepName = stepMatch[1]!.trim();
        currentStepCmd = '';
        continue;
      }
      const cmdMatch = /^command:\s*(.+)$/.exec(trimmed);
      if (cmdMatch) { currentStepCmd = cmdMatch[1]!.trim(); continue; }
    }

    if (section === 'dependencies') {
      // Step name (indented, ends with colon)
      const depStepMatch = /^(\S[\w-]+):$/.exec(trimmed);
      if (depStepMatch) { currentDepStep = depStepMatch[1]!; deps[currentDepStep] = []; continue; }
      // Dependency item
      const depMatch = /^-\s*(.+)$/.exec(trimmed);
      if (depMatch && currentDepStep.length > 0) { deps[currentDepStep]!.push(depMatch[1]!.trim()); }
    }
  }

  // Flush last step
  if (currentStepName.length > 0) steps.push({ name: currentStepName, command: currentStepCmd });

  const stepNodes: WorkflowStepNode[] = steps.map(s => ({
    name: s.name,
    command: s.command,
    dependsOn: deps[s.name] ?? [],
  }));

  return { name, description, steps: stepNodes, riskMap };
}

function findStep(steps: readonly WorkflowStepNode[], name: string): WorkflowStepNode | undefined {
  return steps.find(s => s.name === name);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('invertWorkflow integration', () => {
  it('full workflow inversion on SOC2 fixture with diverse steps', () => {
    const dag = parseFixtureToDAG('../fixtures/soc2/lobster.yaml', soc2RiskMap());
    const result = invertWorkflow(dag);

    // Original steps are all present and in order
    const originalNames = result.steps
      .filter(s => !s.name.startsWith('claws-'))
      .map(s => s.name);
    expect(originalNames).toEqual([
      'checkout',
      'scan-secrets',
      'lint-code',
      'send-notification',
      'run-tests',
      'deploy-staging',
      'approval-gate',
      'deploy-prod',
      'audit-log',
    ]);

    // R5 tools (send-email, deploy) should have elicit + audit
    expect(findStep(result.steps, 'claws-elicit-send-email')).toBeDefined();
    expect(findStep(result.steps, 'claws-audit-send-email')).toBeDefined();
    expect(findStep(result.steps, 'claws-elicit-deploy')).toBeDefined();
    expect(findStep(result.steps, 'claws-audit-deploy')).toBeDefined();

    // R4 tool (request-approval) should have elicit + audit
    expect(findStep(result.steps, 'claws-elicit-request-approval')).toBeDefined();
    expect(findStep(result.steps, 'claws-audit-request-approval')).toBeDefined();

    // R1-R2 tools should NOT have elicit/audit
    expect(findStep(result.steps, 'claws-elicit-git')).toBeUndefined();
    expect(findStep(result.steps, 'claws-audit-git')).toBeUndefined();
    expect(findStep(result.steps, 'claws-elicit-npm')).toBeUndefined();

    // ALL steps should have classify
    expect(findStep(result.steps, 'claws-classify-git')).toBeDefined();
    expect(findStep(result.steps, 'claws-classify-run')).toBeDefined();
    expect(findStep(result.steps, 'claws-classify-npm')).toBeDefined();
    expect(findStep(result.steps, 'claws-classify-send-email')).toBeDefined();
    expect(findStep(result.steps, 'claws-classify-deploy')).toBeDefined();
    expect(findStep(result.steps, 'claws-classify-log')).toBeDefined();

    // deploy appears twice (staging + prod) — second should be disambiguated
    const deployElicits = result.steps.filter(
      s => s.name.startsWith('claws-elicit-deploy'),
    );
    expect(deployElicits.length).toBe(2);
    expect(deployElicits[1]!.name).toBe('claws-elicit-deploy-2');

    // Audit steps must be async
    const auditSteps = result.steps.filter(s => s.governanceType === 'audit');
    for (const a of auditSteps) {
      expect(a.async).toBe(true);
    }
  });

  it('parallel branch handling: elicitation in parallel DAG branches', () => {
    const dag = parseFixtureToDAG('../fixtures/soc2/lobster.yaml', soc2RiskMap());
    const result = invertWorkflow(dag);

    // The SOC2 fixture has parallel branches: scan-secrets, lint-code, send-notification
    // all depend on checkout. The send-notification branch is R5 so it gets governance.

    // send-notification's elicit gate should have the same deps as send-notification itself
    const elicitEmail = findStep(result.steps, 'claws-elicit-send-email');
    expect(elicitEmail).toBeDefined();
    // send-notification depends on checkout, so elicit inherits that dependency
    expect(elicitEmail!.dependsOn).toEqual(['checkout']);

    // scan-secrets and lint-code are R2, so NO governance injection on their branches
    const elicitRun = findStep(result.steps, 'claws-elicit-run');
    expect(elicitRun).toBeUndefined();
    const elicitNpm = findStep(result.steps, 'claws-elicit-npm');
    expect(elicitNpm).toBeUndefined();

    // The deploy steps downstream get their own governance independently
    const elicitDeploy = findStep(result.steps, 'claws-elicit-deploy');
    expect(elicitDeploy).toBeDefined();
    expect(elicitDeploy!.dependsOn).toEqual(['run-tests']);
  });
});
