/**
 * L2: Workflow inversion E2E — complete emit-workflow on complex fixture,
 * validate lobster.compiled.yaml output against lobster schema constraints.
 *
 * 1 e2e test:
 * 1. Complete emit-workflow on SOC2 fixture, validate compiled output
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

function parseFixtureToDAG(fixturePath: string, riskMap: ToolRiskMap): WorkflowDAG {
  const content = readFileSync(resolve(__dirname, fixturePath), 'utf-8');
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
    if (trimmed === 'steps:') { section = 'steps'; continue; }
    if (trimmed === 'dependencies:') { section = 'dependencies'; continue; }

    if (section === 'top') {
      const nameMatch = /^name:\s*(.+)$/.exec(trimmed);
      if (nameMatch) { name = nameMatch[1]!.trim(); continue; }
      const descMatch = /^description:\s*(.+)$/.exec(trimmed);
      if (descMatch) { description = descMatch[1]!.trim(); continue; }
    }

    if (section === 'steps') {
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
      const depStepMatch = /^(\S[\w-]+):$/.exec(trimmed);
      if (depStepMatch) { currentDepStep = depStepMatch[1]!; deps[currentDepStep] = []; continue; }
      const depMatch = /^-\s*(.+)$/.exec(trimmed);
      if (depMatch && currentDepStep.length > 0) { deps[currentDepStep]!.push(depMatch[1]!.trim()); }
    }
  }

  if (currentStepName.length > 0) steps.push({ name: currentStepName, command: currentStepCmd });

  const stepNodes: WorkflowStepNode[] = steps.map(s => ({
    name: s.name,
    command: s.command,
    dependsOn: deps[s.name] ?? [],
  }));

  return { name, description, steps: stepNodes, riskMap };
}

// ── Schema validation ──────────────────────────────────────────────────

/**
 * Validate a compiled workflow against lobster schema constraints.
 *
 * Schema rules:
 * 1. All step names must be unique
 * 2. All dependency references must point to existing steps
 * 3. Workflow must have a name
 * 4. Governance steps must follow naming convention
 * 5. No circular dependencies (basic check)
 * 6. Audit steps must be async
 * 7. Elicit steps for R5 must be fail-closed
 */
function validateCompiledWorkflow(
  compiled: { name: string; steps: readonly WorkflowStepNode[] },
): string[] {
  const errors: string[] = [];
  const stepNames = new Set<string>();

  // Rule 1: unique names
  for (const step of compiled.steps) {
    if (stepNames.has(step.name)) {
      errors.push(`Duplicate step name: ${step.name}`);
    }
    stepNames.add(step.name);
  }

  // Rule 2: valid dependency references
  for (const step of compiled.steps) {
    for (const dep of step.dependsOn) {
      if (!stepNames.has(dep)) {
        errors.push(`Step "${step.name}" depends on unknown step "${dep}"`);
      }
    }
  }

  // Rule 3: workflow must have a name
  if (compiled.name.length === 0) {
    errors.push('Workflow name is empty');
  }

  // Rule 4: governance step naming
  for (const step of compiled.steps) {
    if (step.injected) {
      if (!step.name.startsWith('claws-')) {
        errors.push(`Injected step "${step.name}" does not follow claws-* naming`);
      }
      if (!step.governanceType) {
        errors.push(`Injected step "${step.name}" has no governance type`);
      }
    }
  }

  // Rule 5: basic cycle detection (no step depends on itself)
  for (const step of compiled.steps) {
    if (step.dependsOn.includes(step.name)) {
      errors.push(`Self-dependency detected: ${step.name}`);
    }
  }

  // Rule 6: audit steps must be async
  for (const step of compiled.steps) {
    if (step.governanceType === 'audit' && !step.async) {
      errors.push(`Audit step "${step.name}" is not async`);
    }
  }

  return errors;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('emit-workflow E2E', () => {
  it('complete emit-workflow on SOC2 fixture validates against lobster schema', () => {
    const dag = parseFixtureToDAG('../fixtures/soc2/lobster.yaml', soc2RiskMap());
    const compiled = invertWorkflow(dag);

    // Validate against schema
    const errors = validateCompiledWorkflow(compiled);
    expect(errors).toEqual([]);

    // Verify completeness: original 9 steps + governance steps
    const originalSteps = compiled.steps.filter(s => !s.injected);
    const governanceSteps = compiled.steps.filter(s => s.injected);
    expect(originalSteps).toHaveLength(9);
    expect(governanceSteps.length).toBeGreaterThan(0);
    expect(compiled.injectedCount).toBe(governanceSteps.length);

    // Verify governance type distribution
    const classifySteps = governanceSteps.filter(s => s.governanceType === 'classify');
    const elicitSteps = governanceSteps.filter(s => s.governanceType === 'elicit');
    const auditSteps = governanceSteps.filter(s => s.governanceType === 'audit');

    // Every original step gets a classify
    expect(classifySteps).toHaveLength(9);

    // R3+ steps get elicit + audit: send-email(R5), deploy(R5)x2, request-approval(R4) = 4
    expect(elicitSteps).toHaveLength(4);
    expect(auditSteps).toHaveLength(4);

    // All audit steps are async
    for (const a of auditSteps) {
      expect(a.async).toBe(true);
      expect(a.failMode).toBe('open');
    }

    // R5 elicit steps are fail-closed
    const r5Elicits = elicitSteps.filter(s =>
      s.name.includes('send-email') || s.name.includes('deploy'),
    );
    for (const e of r5Elicits) {
      expect(e.failMode).toBe('closed');
    }

    // No warnings for clean fixture
    expect(compiled.warnings).toEqual([]);
  });
});
