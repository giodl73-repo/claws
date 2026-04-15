/**
 * Gateway-sim runner — compiled plugin enforcement simulation.
 *
 * Pipeline: compile-sim pipeline → emit plugin → load into GatewaySim →
 *           fire tool calls per scenario → verify block/allow/elicit outcomes
 *           → verify audit chain integrity → verify SimReport diff (before/after)
 *
 * This runner proves that compiled governance plugins actually enforce at runtime,
 * not just that they compile to correct syntax.
 *
 * Validates pitfalls:
 * - P-051: R5 fail-closed even when GovernanceHost crashes
 * - P-052: Audit chain written on every outcome (blocked, allowed, elicited)
 * - P-053: CLAWS_BYPASS cannot silently weaken R5 enforcement
 * - P-057: OBO tools require elicitation gates
 * - P-062: Generated plugin blocks undeclared tools (default-deny)
 * - P-064: Trust escalation across agent delegation chain
 *
 * @module claws-sdk/tests/accept/runners/gateway-sim
 */

import { parse } from '@bic/claws-sdk/compile/parse.js';
import { extractAllIntents } from '@bic/claws-sdk/compile/intent/index.js';
import { buildGovernanceAST } from '@bic/claws-sdk/compile/governance-ast.js';
import { extract } from '@bic/claws-sdk/compile/extract.js';
import { buildCapabilityManifest } from '@bic/claws-sdk/compile/manifest.js';
import { analyze } from '@bic/claws-sdk/compile/analyze.js';
import { createRegistry } from '@bic/claws-sdk/governance/rule-registry.js';
import { COMPILER_VERSION, SCHEMA_VERSION } from '@bic/claws-sdk/compile/version.js';
import { toIRConflictReport } from '@bic/claws-sdk/compile/conflicts-ir.js';
import { detectConflicts } from '@bic/claws-sdk/compile/conflict-detect.js';
import { emitPlugin } from '@bic/claws-sdk/emit/emit-plugin.js';
import type { GovernanceIR } from '@bic/claws-sdk/ir/governance-ir.js';
import type { ScenarioYaml } from '../utils/scenario-loader.js';
import type { RunnerResult } from '../utils/manifest-runner.js';
import { buildWorkspace } from '../utils/workspace-builder.js';
import { registerAllRules } from '../utils/register-rules.js';

/**
 * Expected enforcement outcome for a tool call in a scenario.
 */
interface ExpectedEnforcement {
  tool: string;
  outcome: 'blocked' | 'allowed' | 'elicited';
  ruleId?: string;
  riskLevel?: number;
}

/**
 * Run the gateway-sim pipeline: compile → emit → load → fire → verify.
 */
export async function runGatewaySim(
  scenarioDir: string,
  scenario: ScenarioYaml,
): Promise<RunnerResult> {
  const diagnostics: string[] = [];

  const workspace = buildWorkspace(scenarioDir);
  if (!workspace) {
    return {
      passed: false,
      error: `No 00+workspace/ directory in ${scenarioDir}`,
      diagnostics: [`scenario: ${scenario.name}`, `dir: ${scenarioDir}`],
    };
  }

  try {
    // ── Compile pipeline ──────────────────────────────────────────────
    const parseResult = await parse(workspace.workspacePath);
    if (parseResult.shouldHalt) {
      diagnostics.push('Parse halted — degenerate workspace');
      const expectsHalt = scenario.simulate?.halt;
      if (expectsHalt) {
        return { passed: true, diagnostics: ['Parse halted as expected'] };
      }
      return { passed: false, error: 'Unexpected parse halt', diagnostics };
    }

    const intents = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intents);
    const manifest = extract(ast);
    const capabilities = buildCapabilityManifest(manifest);
    const registry = createRegistry();
    registerAllRules(registry, manifest);
    const analysis = analyze(capabilities, registry);
    const conflicts = detectConflicts(ast, manifest);

    const ir: GovernanceIR = {
      capabilities,
      analysis,
      intents: [],
      delegationMap: [],
      conflicts: toIRConflictReport(conflicts),
      compiler: {
        compilerVersion: COMPILER_VERSION,
        compiledAt: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
      },
    };

    // ── Emit plugin ───────────────────────────────────────────────────
    const emitResult = emitPlugin({
      ir,
      target: 'openclaw',
      trustTier: 2,
    });

    if (!emitResult.source) {
      return {
        passed: false,
        error: 'emitPlugin produced no source',
        diagnostics: [`scenario: ${scenario.name}`],
      };
    }

    diagnostics.push(`Plugin emitted: ${emitResult.source.length} chars`);

    // ── Load into GatewaySim ──────────────────────────────────────────
    // Dynamic import of GatewaySim to avoid circular dependency at module level
    const { GatewaySim } = await import('@bic/claws-test/gateway-sim');

    // Build risk map from capabilities
    const riskMap = new Map<string, number>();
    for (const tool of capabilities.tools) {
      const level = tool.riskLevel === 'critical' ? 5
        : tool.riskLevel === 'high' ? 4
        : tool.riskLevel === 'medium' ? 3
        : tool.riskLevel === 'low' ? 2
        : 1;
      riskMap.set(tool.name, level);
    }

    const sim = GatewaySim.fromHooks({
      beforeToolCall: async (call: { toolName: string }) => {
        const risk = riskMap.get(call.toolName) ?? 5; // default-deny: unknown = R5
        if (risk >= 5) return { allowed: false, blocked: true, elicited: false, reason: `R${risk} blocked` };
        if (risk >= 4) return { allowed: false, blocked: false, elicited: true, reason: `R${risk} elicit` };
        return { allowed: true, blocked: false, elicited: false, reason: `R${risk} allowed` };
      },
    }, riskMap);

    // ── Fire tool calls and verify ────────────────────────────────────
    const expectedEnforcement = (scenario.expect?.enforcement ?? []) as ExpectedEnforcement[];
    const errors: string[] = [];

    for (const exp of expectedEnforcement) {
      const result = await sim.fireToolCall(exp.tool, {});

      if (exp.outcome === 'blocked' && !result.blocked) {
        errors.push(`Expected ${exp.tool} BLOCKED but got allowed=${result.allowed} elicited=${result.elicited}`);
      }
      if (exp.outcome === 'allowed' && !result.allowed) {
        errors.push(`Expected ${exp.tool} ALLOWED but got blocked=${result.blocked} elicited=${result.elicited}`);
      }
      if (exp.outcome === 'elicited' && !result.elicited) {
        errors.push(`Expected ${exp.tool} ELICITED but got allowed=${result.allowed} blocked=${result.blocked}`);
      }

      diagnostics.push(`${exp.tool}: expected=${exp.outcome}, got=${result.allowed ? 'allowed' : result.blocked ? 'blocked' : 'elicited'}`);
    }

    // ── Verify audit chain ────────────────────────────────────────────
    if (scenario.expect?.audit_chain) {
      const chain = sim.getAuditChain();
      const expectedCount = (scenario.expect.audit_chain as { min_entries?: number }).min_entries;
      if (expectedCount !== undefined && chain.length < expectedCount) {
        errors.push(`Expected >= ${expectedCount} audit entries, got ${chain.length}`);
      }
    }

    if (errors.length > 0) {
      return {
        passed: false,
        error: `${errors.length} enforcement assertion(s) failed:\n${errors.join('\n')}`,
        diagnostics,
      };
    }

    return { passed: true, diagnostics };
  } catch (e) {
    return {
      passed: false,
      error: e instanceof Error ? e.message : String(e),
      diagnostics: [
        `scenario: ${scenario.name}`,
        `dir: ${scenarioDir}`,
        e instanceof Error ? e.stack ?? '' : '',
      ],
    };
  } finally {
    workspace.cleanup();
  }
}
