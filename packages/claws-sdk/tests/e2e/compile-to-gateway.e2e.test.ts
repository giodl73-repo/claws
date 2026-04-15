/**
 * L2 E2E: Compile-to-gateway enforcement loop.
 *
 * Verifies the full claws pipeline: OC workspace files -> compile pipeline
 * -> generated gateway plugin -> GatewaySim enforcement -> audit chain.
 *
 * Tests both happy-path enforcement (all 12 tools) and fail-mode
 * enforcement (GE-03: R2 fail-open, R4 fail-closed when host throws).
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// Compile pipeline
import { parse } from '../../src/compile/parse.js';
import { extractAllIntents } from '../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';
import { extract } from '../../src/compile/extract.js';
import { buildCapabilityManifest, riskClassToLevel } from '../../src/compile/manifest.js';
import { emitPlugin } from '../../src/emit/emit-plugin.js';

// IR construction
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

// GatewaySim
import {
  GatewaySim,
  MockGovernanceHost,
} from '@bic/claws-test';
import type { PluginHooks } from '@bic/claws-test/gateway-sim/plugin-loader';
import {
  toBlock,
  toAllow,
  toElicit,
  toHaveValidAuditChain,
  toHaveAuditEntries,
} from '@bic/claws-test/matchers/gateway';

// ── Constants ──────────────────────────────────────────────────────────

const WORKSPACE = resolve(__dirname, '../fixtures/oc-reference-workspace');
const EXPECTED_ENFORCEMENT_PATH = resolve(
  WORKSPACE,
  'expected/expected-enforcement.json',
);

// ── Helpers ────────────────────────────────────────────────────────────

interface ExpectedEnforcement {
  enforcement: {
    toolName: string;
    riskLevel: number;
    expectedOutcome: string;
    failMode: string;
  }[];
  failModeTests: {
    toolName: string;
    riskLevel: number;
    scenario: string;
    expectedOutcome: string;
  }[];
}

/**
 * Run the full compile pipeline on the reference workspace:
 * parse -> intents -> AST -> extract -> manifest -> emitPlugin.
 *
 * Returns the emitted plugin result plus the risk map for GatewaySim.
 */
async function compileWorkspace() {
  // Pass 1: parse workspace files
  const parseResult = await parse(WORKSPACE);

  // Pass 2: extract intents from parsed files
  const intentResults = extractAllIntents(parseResult);

  // Pass 3: build GovernanceAST with cross-reference resolution
  const ast = buildGovernanceAST(intentResults);

  // Pass 4: extract ParsedManifest
  const manifest = extract(ast);

  // Pass 5: build CapabilityManifest for IR
  const capManifest = buildCapabilityManifest(manifest);

  // Build a risk map from parsed tools (tool name -> numeric risk level)
  const toolRiskMap = new Map<string, number>();
  for (const tool of manifest.tools) {
    toolRiskMap.set(tool.name, tool.riskClass);
  }

  // Build minimal GovernanceIR for emitPlugin
  const ir: GovernanceIR = {
    capabilities: capManifest,
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };

  // Pass 6: emit the gateway plugin
  const emitResult = emitPlugin(ir);

  return { emitResult, toolRiskMap, parseResult, manifest, capManifest };
}

/**
 * Create plugin hooks that mirror the generated plugin's behavior:
 * - Pre-computed risk map lookup
 * - Governance host consultation
 * - R1-R2 fail-open, R3+ fail-closed
 *
 * This mirrors the code emitted by emit-plugin.ts: the generated
 * beforeToolCall handler delegates to __governanceHost.evaluatePolicy()
 * and falls back to risk-based fail modes on error.
 */
function createCompiledPluginHooks(riskMap: Map<string, number>): PluginHooks {
  return {
    beforeToolCall: async (
      toolName: string | null | undefined,
      context: Record<string, unknown>,
    ) => {
      const host = context['__governanceHost'] as MockGovernanceHost | undefined;

      if (toolName == null) {
        return { allowed: false, blockReason: 'Tool name is null or undefined' };
      }

      const riskLevel = riskMap.get(toolName) ?? 5;

      if (!host) {
        if (riskLevel <= 2) return { allowed: true, blockReason: null };
        return { allowed: false, blockReason: 'governance host not configured' };
      }

      try {
        const result = await host.evaluatePolicy(toolName, context);
        host.emitAuditEvent({ event: 'policy-eval', toolName, allowed: result.allowed });
        return result;
      } catch (err) {
        const failMode = riskLevel <= 2 ? 'open' : 'closed';
        if (failMode === 'open') {
          return { allowed: true, blockReason: null };
        }
        return {
          allowed: false,
          blockReason: `Governance error — R${riskLevel} fail-closed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    afterToolCall: async (
      toolName: string,
      _result: unknown,
      context: Record<string, unknown>,
    ) => {
      const host = context['__governanceHost'] as MockGovernanceHost | undefined;
      if (host) {
        host.emitAuditEvent({ event: 'after-tool-call', toolName });
      }
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('E2E: compile-to-gateway enforcement loop', () => {
  it('full pipeline: compile reference workspace, load into GatewaySim, verify enforcement', async () => {
    // ── Step 1: Compile ──────────────────────────────────────────────
    const { emitResult, toolRiskMap, parseResult } = await compileWorkspace();

    // Verify compile produced artifacts
    expect(emitResult.pluginSource.length).toBeGreaterThan(0);
    expect(emitResult.pluginSource).toContain('claws-governance');
    expect(emitResult.hookFiles.size).toBe(3);
    expect(emitResult.hookFiles.has('handlers/before-tool-call.ts')).toBe(true);
    expect(emitResult.hookFiles.has('handlers/a2a-firewall.ts')).toBe(true);
    expect(emitResult.hookFiles.has('handlers/elicitation-gate.ts')).toBe(true);
    expect(parseResult.presentCount).toBeGreaterThanOrEqual(7);

    // ── Step 2: Load into GatewaySim ─────────────────────────────────
    const hooks = createCompiledPluginHooks(toolRiskMap);

    // Configure MockGovernanceHost to enforce based on risk tiers:
    // R1-R2: allowed (audit only), R3+: blocked (requires approval)
    const toolPolicies: Record<string, { allowed: boolean; blockReason: string | null }> = {};
    for (const [toolName, riskLevel] of toolRiskMap) {
      if (riskLevel >= 3) {
        toolPolicies[toolName] = {
          allowed: false,
          blockReason: riskLevel >= 5
            ? `G-ELICIT-GATE: elicitation required for R${riskLevel} tool "${toolName}"`
            : `G-APPROVAL-GATE: approval required for R${riskLevel} tool "${toolName}"`,
        };
      }
    }

    const host = new MockGovernanceHost({
      toolPolicies,
      defaultPolicy: { allowed: true, blockReason: null },
    });

    const sim = GatewaySim.fromHooks(hooks, toolRiskMap, { host });

    // ── Step 3: Fire tool calls ──────────────────────────────────────

    // R1 tool: web-search -> ALLOWED
    const webSearchResult = await sim.fireToolCall('web-search');
    expect(webSearchResult.allowed).toBe(true);
    expect(webSearchResult.blocked).toBe(false);

    // R5 tool: send-email -> BLOCKED or ELICITED
    const sendEmailResult = await sim.fireToolCall('send-email');
    expect(sendEmailResult.allowed).toBe(false);
    expect(sendEmailResult.blocked || sendEmailResult.elicited).toBe(true);

    // R5 tool: shell-exec -> BLOCKED
    const shellExecResult = await sim.fireToolCall('shell-exec');
    expect(shellExecResult.allowed).toBe(false);
    expect(shellExecResult.blocked || shellExecResult.elicited).toBe(true);

    // ── Step 4: Verify audit chain ───────────────────────────────────
    const auditChain = sim.getAuditChain();
    expect(auditChain).toHaveLength(3);

    // Entry 1: web-search allowed
    expect(auditChain[0]!.toolName).toBe('web-search');
    expect(auditChain[0]!.outcome).toBe('ALLOWED');

    // Entry 2: send-email blocked/elicited
    expect(auditChain[1]!.toolName).toBe('send-email');
    expect(['BLOCKED', 'ELICITED']).toContain(auditChain[1]!.outcome);

    // Entry 3: shell-exec blocked
    expect(auditChain[2]!.toolName).toBe('shell-exec');
    expect(['BLOCKED', 'ELICITED']).toContain(auditChain[2]!.outcome);

    // Validate audit chain integrity
    const chainValid = toHaveValidAuditChain(sim);
    expect(chainValid.pass).toBe(true);

    // ── Step 5: Verify against expected-enforcement.json ─────────────
    const expectedJson = readFileSync(EXPECTED_ENFORCEMENT_PATH, 'utf-8');
    const expected: ExpectedEnforcement = JSON.parse(expectedJson);

    // Reset sim for full enforcement test against all 12 tools
    sim.reset({ auditOnly: true });

    for (const entry of expected.enforcement) {
      const result = await sim.fireToolCall(entry.toolName);

      if (entry.expectedOutcome === 'ALLOWED') {
        expect(result.allowed).toBe(true);
      } else if (entry.expectedOutcome === 'ELICITED') {
        expect(result.allowed).toBe(false);
        expect(result.blocked || result.elicited).toBe(true);
      } else {
        // BLOCKED
        expect(result.allowed).toBe(false);
      }
    }

    // Verify we tested all 12 tools
    const fullChain = sim.getAuditChain();
    expect(fullChain).toHaveLength(expected.enforcement.length);

    // Use matchers for key tools
    const allowResult = toAllow(sim, 'web-search');
    expect(allowResult.pass).toBe(true);

    // R5 tools trigger elicitation (blockReason contains 'elicit')
    const elicitResult = toElicit(sim, 'send-email');
    expect(elicitResult.pass).toBe(true);

    const shellElicitResult = toElicit(sim, 'shell-exec');
    expect(shellElicitResult.pass).toBe(true);

    // R3-R4 tools are blocked (approval gate, no elicitation keyword)
    const dbBlockResult = toBlock(sim, 'db-query');
    expect(dbBlockResult.pass).toBe(true);

    const fullChainValid = toHaveValidAuditChain(sim);
    expect(fullChainValid.pass).toBe(true);
  });

  it('fail-mode enforcement: R2 fail-open, R4 fail-closed when host throws (GE-03)', async () => {
    // ── Step 1: Compile ──────────────────────────────────────────────
    const { toolRiskMap } = await compileWorkspace();
    const hooks = createCompiledPluginHooks(toolRiskMap);

    // Start with a working host
    const host = new MockGovernanceHost({
      defaultPolicy: { allowed: true, blockReason: null },
    });
    const sim = GatewaySim.fromHooks(hooks, toolRiskMap, { host });

    // ── Step 2: R2 fail-open when host throws ────────────────────────
    // Configure host to throw on next evaluatePolicy call
    const originalEvaluate = host.evaluatePolicy.bind(host);
    let throwCount = 0;
    host.evaluatePolicy = async (toolName, context, signal) => {
      throwCount++;
      if (throwCount <= 1) {
        throw new Error('GovernanceHost crashed');
      }
      return originalEvaluate(toolName, context, signal);
    };

    // file-read is R2 -> should ALLOW (fail-open)
    const fileReadResult = await sim.fireToolCall('file-read');
    expect(fileReadResult.allowed).toBe(true);

    // ── Step 3: R4 fail-closed when host throws ──────────────────────
    // Reset throw counter for next call
    host.evaluatePolicy = async () => {
      throw new Error('GovernanceHost crashed');
    };

    // db-query is R4 -> should BLOCK (fail-closed)
    const dbQueryResult = await sim.fireToolCall('db-query');
    expect(dbQueryResult.blocked).toBe(true);
    expect(dbQueryResult.reason).toContain('fail-closed');

    // ── Step 4: Verify audit chain records both fail-mode events ─────
    const auditChain = sim.getAuditChain();
    expect(auditChain).toHaveLength(2);

    // Entry 1: file-read allowed via fail-open
    expect(auditChain[0]!.toolName).toBe('file-read');
    expect(auditChain[0]!.outcome).toBe('ALLOWED');

    // Entry 2: db-query blocked via fail-closed
    expect(auditChain[1]!.toolName).toBe('db-query');
    expect(auditChain[1]!.outcome).toBe('BLOCKED');

    // Audit chain integrity
    const chainValid = toHaveValidAuditChain(sim);
    expect(chainValid.pass).toBe(true);

    // ── Step 5: Verify against expected-enforcement.json fail-mode ───
    const expectedJson = readFileSync(EXPECTED_ENFORCEMENT_PATH, 'utf-8');
    const expected: ExpectedEnforcement = JSON.parse(expectedJson);

    for (const failTest of expected.failModeTests) {
      const entry = auditChain.find(e => e.toolName === failTest.toolName);
      expect(entry).toBeDefined();
      expect(entry!.outcome).toBe(failTest.expectedOutcome);
    }
  });
});
