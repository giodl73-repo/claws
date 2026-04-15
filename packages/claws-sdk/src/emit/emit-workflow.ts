/**
 * Workflow inversion engine — reads a lobster.yaml DAG and emits
 * lobster.compiled.yaml with governance steps injected.
 *
 * Governance injection rules:
 * - R3+ tools: elicit gate BEFORE + audit step AFTER (async, non-blocking)
 * - R1+ tools: classify step BEFORE (all tool-using steps)
 * - R5/OBO tools: same as R3+ but with higher priority
 * - First-step edge case: when the first step uses R5, inject pre-workflow gate
 *
 * Step naming: `claws-{type}-{tool-name}` with disambiguation for duplicates.
 * Original step ordering is NEVER reordered — governance steps are inserted around.
 *
 * Key constraints from governing roles:
 * - gateway-eng: 50ms latency budget, fail-open R1-R2, configurable R3-R4, fail-closed R5
 * - dragon: no invariant weakening, exhaustive error paths, no hacks
 *
 * @module claws-sdk/emit/emit-workflow
 */

/**
 * Risk information for a tool.
 */
export type ToolRiskMap = ReadonlyMap<string, { riskLevel: number; oboFlag: boolean }>;

/**
 * Governance step type.
 */
export type GovernanceStepType = 'elicit' | 'audit' | 'classify';

/**
 * A node in the workflow DAG.
 */
export interface WorkflowStepNode {
  /** Step name (unique within the workflow). */
  readonly name: string;
  /** Step command or action. */
  readonly command: string;
  /** Dependencies (step names this step waits on). */
  readonly dependsOn: readonly string[];
  /** Whether this is a governance-injected step. */
  readonly injected?: boolean;
  /** Governance step type (only set on injected steps). */
  readonly governanceType?: GovernanceStepType;
  /** Whether this step runs asynchronously (non-blocking). Audit steps are async. */
  readonly async?: boolean;
  /** Fail mode for this governance step. */
  readonly failMode?: 'open' | 'closed';
}

/**
 * Input workflow DAG for inversion.
 */
export interface WorkflowDAG {
  /** Workflow name. */
  readonly name: string;
  /** Workflow description. */
  readonly description: string;
  /** Ordered steps in the workflow. */
  readonly steps: readonly WorkflowStepNode[];
  /** Tool risk map for governance classification. */
  readonly riskMap: ToolRiskMap;
}

/**
 * Result of workflow inversion — the compiled workflow.
 */
export interface CompiledWorkflow {
  /** Workflow name (same as input). */
  readonly name: string;
  /** Workflow description (same as input). */
  readonly description: string;
  /** Steps with governance steps injected. Original order preserved. */
  readonly steps: readonly WorkflowStepNode[];
  /** Count of injected governance steps. */
  readonly injectedCount: number;
  /** Warnings produced during inversion. */
  readonly warnings: readonly string[];
}

/**
 * Build a governance step name following the `claws-{type}-{tool-name}` convention.
 *
 * @param type - Governance step type (elicit, audit, classify)
 * @param toolName - Tool name extracted from the step command
 * @returns Formatted governance step name
 */
export function governanceStepName(type: GovernanceStepType, toolName: string): string {
  return `claws-${type}-${toolName}`;
}

/**
 * Extract the primary tool name from a step command.
 *
 * Takes the first token of the command as the tool name.
 */
function extractToolName(command: string): string {
  const first = command.trim().split(/\s+/)[0];
  /* istanbul ignore next -- split always returns ≥1 element */
  return first ?? '';
}

/**
 * Resolve fail mode from risk level per gateway-eng policy:
 * R1-R2: open, R3+: closed.
 */
function resolveFailMode(riskLevel: number): 'open' | 'closed' {
  /* istanbul ignore next -- only called from R3+ elicit paths; R1-R2 branch unreachable */
  if (riskLevel <= 2) return 'open';
  return 'closed';
}

/**
 * Invert a workflow DAG by injecting governance steps around
 * sensitive operations.
 *
 * Injection rules:
 * - ALL steps (R1+): classify step inserted before
 * - R3+ steps: elicit gate inserted before, audit step inserted after
 * - Audit steps are async (non-blocking on failure) per CP-S08-F04
 * - First-step edge case: R5 first step gets pre-workflow gate (CP-S08-F07)
 * - Original step ordering is NEVER changed
 *
 * @param dag - The input workflow DAG with risk map
 * @returns Compiled workflow with governance steps injected
 */
export function invertWorkflow(dag: WorkflowDAG): CompiledWorkflow {
  const warnings: string[] = [];
  const result: WorkflowStepNode[] = [];
  const usedNames = new Set<string>();
  let injectedCount = 0;

  // Track used names from original steps for disambiguation
  for (const step of dag.steps) {
    usedNames.add(step.name);
  }

  for (let i = 0; i < dag.steps.length; i++) {
    const step = dag.steps[i]!;
    const toolName = extractToolName(step.command);
    const riskInfo = dag.riskMap.get(toolName);

    // Default: unknown tools get R5 (fail-closed)
    const riskLevel = riskInfo?.riskLevel ?? 5;
    const isFirstStepR5 = i === 0 && riskLevel >= 5;

    // ── Elicit gate FIRST for first-step R5 (pre-workflow gate) ──
    // CP-S08-F07: When the first step is R5, the elicit gate must be
    // the absolute first step in the compiled workflow.
    if (isFirstStepR5) {
      const elicitName = disambiguate(governanceStepName('elicit', toolName), usedNames);
      usedNames.add(elicitName);
      result.push({
        name: elicitName,
        command: `claws elicit ${toolName}`,
        dependsOn: [],
        injected: true,
        governanceType: 'elicit',
        failMode: resolveFailMode(riskLevel),
      });
      injectedCount++;
    }

    // ── Classify step (ALL tool-using steps, R1+) ─────────────────
    const classifyName = disambiguate(governanceStepName('classify', toolName), usedNames);
    usedNames.add(classifyName);
    result.push({
      name: classifyName,
      command: `claws classify ${toolName}`,
      dependsOn: step.dependsOn,
      injected: true,
      governanceType: 'classify',
      failMode: 'open', // classify never blocks
    });
    injectedCount++;

    // ── Elicit gate for non-first R3+ steps ──────────────────────
    if (riskLevel >= 3 && !isFirstStepR5) {
      const elicitName = disambiguate(governanceStepName('elicit', toolName), usedNames);
      usedNames.add(elicitName);
      result.push({
        name: elicitName,
        command: `claws elicit ${toolName}`,
        dependsOn: step.dependsOn,
        injected: true,
        governanceType: 'elicit',
        failMode: resolveFailMode(riskLevel),
      });
      injectedCount++;
    }

    // ── Original step (unchanged) ────────────────────────────────
    result.push(step);

    // ── Audit step (R3+ steps, async/non-blocking) ───────────────
    if (riskLevel >= 3) {
      const auditName = disambiguate(governanceStepName('audit', toolName), usedNames);
      usedNames.add(auditName);
      result.push({
        name: auditName,
        command: `claws audit ${toolName}`,
        dependsOn: [step.name],
        injected: true,
        governanceType: 'audit',
        async: true, // CP-S08-F04: audit is async, non-blocking
        failMode: 'open', // audit never blocks workflow
      });
      injectedCount++;
    }
  }

  return {
    name: dag.name,
    description: dag.description,
    steps: result,
    injectedCount,
    warnings,
  };
}

/**
 * Disambiguate a governance step name to avoid collisions.
 *
 * If the name already exists, append `-2`, `-3`, etc. until unique.
 * Per CP-S08-F01: naming uses `claws-{type}-{tool-name}` with suffix for disambiguation.
 */
function disambiguate(name: string, used: ReadonlySet<string>): string {
  if (!used.has(name)) return name;
  let counter = 2;
  while (used.has(`${name}-${counter}`)) {
    counter++;
  }
  return `${name}-${counter}`;
}
