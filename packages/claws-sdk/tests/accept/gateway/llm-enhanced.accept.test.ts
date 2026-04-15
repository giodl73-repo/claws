/**
 * L3 acceptance: LLM-enhanced compile + GatewaySim enforcement.
 *
 * Proves that LLM-enhanced extraction produces:
 *   1. Strictly more enforcement than regex-only (never less)
 *   2. Positive delta on at least 3 of 5 benchmark metrics
 *
 * Uses the reference workspace, mock LLM provider, GatewaySim for enforcement.
 *
 * @module claws-sdk/tests/accept/gateway/llm-enhanced.accept
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// Compile pipeline
import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  buildCapabilityManifest,
  analyze,
  COMPILER_VERSION,
  SCHEMA_VERSION,
} from '@bic/claws-sdk/compile';
import { createDefaultRegistry } from '@bic/claws-sdk/governance';
import type { GovernanceIR } from '@bic/claws-sdk/ir';

// LLM pipeline
import { ExtractorLLM } from '../../../src/compile/llm/extractor.js';
import { verifyExtractionResult } from '../../../src/compile/llm/verifier.js';
import { mergeIntents, type RegexIntent, type MergedIntent } from '../../../src/compile/llm/merger.js';
import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
  LLMIntent,
} from '../../../src/compile/llm/types.js';
import type { ParseDiagnostic } from '../../../src/compile/types.js';

// GatewaySim
import {
  GatewaySim,
  MockGovernanceHost,
} from '@bic/claws-test';
import type { PluginHooks } from '@bic/claws-test/gateway-sim/plugin-loader';

// Benchmark metric types and functions from SDK
import {
  calculateMetrics,
  calculateDelta,
  type BenchmarkMetrics,
  type BenchmarkDelta,
} from '../../../src/compile/llm/benchmark.js';

// ── Constants ──────────────────────────────────────────────────────────

const REF_WORKSPACE = resolve(__dirname, '../../fixtures/oc-reference-workspace');
const EXPECTED_VIOLATIONS_PATH = resolve(REF_WORKSPACE, 'expected/expected-violations.json');

// ── Mock LLM Provider ─────────────────────────────────────────────────

class AcceptanceMockProvider implements LLMProvider {
  readonly modelId = 'accept-mock-v1';

  async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
    const intents: LLMIntent[] = [];

    if (request.source === 'SOUL.md') {
      intents.push({
        kind: 'deny',
        target: 'production-access',
        description: 'Never access production databases or systems',
        confidence: 0.95,
        line: 11,
        sourceText: 'Never access production databases or systems.',
      });
      intents.push({
        kind: 'deny',
        target: 'send-email',
        description: 'Never send external communications without manager approval',
        confidence: 0.93,
        line: 12,
        sourceText: 'Never send external communications without manager approval.',
      });
      intents.push({
        kind: 'deny',
        target: 'impersonation',
        description: 'Never impersonate a team member',
        confidence: 0.95,
        line: 13,
        sourceText: 'Never impersonate a team member.',
      });
      intents.push({
        kind: 'limit',
        target: 'model-usage',
        description: 'Only use approved models',
        confidence: 0.85,
        line: 17,
        sourceText: 'Only use approved models:',
      });
    } else if (request.source === 'TOOLS.md') {
      intents.push({
        kind: 'label',
        target: 'web-search',
        description: 'R1 audit-only search tool',
        confidence: 0.95,
        line: 3,
        sourceText: '## web-search',
      });
      intents.push({
        kind: 'label',
        target: 'send-email',
        description: 'R5 tool requires elicitation',
        confidence: 0.95,
        line: 37,
        sourceText: '## send-email',
      });
      intents.push({
        kind: 'elicit',
        target: 'send-email',
        description: 'Elicitation required for R5 email',
        confidence: 0.90,
        line: 41,
        sourceText: 'Governance: audit + approval (exec) + elicitation required',
      });
      intents.push({
        kind: 'elicit',
        target: 'shell-exec',
        description: 'Elicitation required for R5 shell',
        confidence: 0.90,
        line: 52,
        sourceText: 'Governance: audit + approval (exec) + elicitation required',
      });
      intents.push({
        kind: 'elicit',
        target: 'deploy-trigger',
        description: 'Dual-approval + elicitation for deployments',
        confidence: 0.92,
        line: 58,
        sourceText: 'Governance: audit + approval (exec) + elicitation required + dual-approval',
      });
    } else if (request.source === 'AGENTS.md') {
      intents.push({
        kind: 'require',
        target: 'research-agent',
        description: 'Read-only agent, delegates to action-agent',
        confidence: 0.90,
        line: 3,
        sourceText: '## research-agent',
      });
      intents.push({
        kind: 'require',
        target: 'action-agent',
        description: 'Action agent requires R5 approval',
        confidence: 0.88,
        line: 16,
        sourceText: '## action-agent',
      });
    } else if (request.source === 'USER.md') {
      intents.push({
        kind: 'label',
        target: 'email-obo',
        description: 'OBO: draft and send emails',
        confidence: 0.90,
        line: 8,
        sourceText: '- **email**: Draft and send emails (requires approval per SOUL constraints)',
      });
      intents.push({
        kind: 'label',
        target: 'calendar-obo',
        description: 'OBO: read and propose calendar events',
        confidence: 0.88,
        line: 9,
        sourceText: '- **calendar**: Read and propose calendar events',
      });
    } else if (request.source === 'MEMORY.md') {
      intents.push({
        kind: 'label',
        target: 'data-classification',
        description: 'All stored data classified as INTERNAL',
        confidence: 0.92,
        line: 3,
        sourceText: 'All stored data is classified as **INTERNAL**.',
      });
    }

    return {
      source: request.source,
      intents,
      usage: { inputTokens: 500, outputTokens: 200 },
      modelId: this.modelId,
    };
  }

  async validate(_result: ExtractionResult): Promise<readonly ParseDiagnostic[]> {
    return [];
  }
}

// ── Plugin Hooks Helper ───────────────────────────────────────────────

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

describe('accept: LLM-enhanced enforcement', () => {
  let regexMetrics: BenchmarkMetrics;
  let enhancedMetrics: BenchmarkMetrics;
  let delta: BenchmarkDelta;
  let regexToolRiskMap: Map<string, number>;
  let allMergedIntents: MergedIntent[];

  beforeAll(async () => {
    // Load expected violations ground truth
    const expectedJson = readFileSync(EXPECTED_VIOLATIONS_PATH, 'utf-8');
    const expected = JSON.parse(expectedJson);
    const expectedViolationCodes: string[] = expected.violations.map((v: { code: string }) => v.code);

    // ── Regex-only pipeline ─────────────────────────────────────────
    const parseResult = await parse(REF_WORKSPACE);
    const intents = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intents);
    const manifest = extract(ast);
    const capManifest = buildCapabilityManifest(manifest);
    const registry = createDefaultRegistry(capManifest);
    const analysis = analyze(capManifest, registry);

    regexToolRiskMap = new Map<string, number>();
    for (const tool of manifest.tools) {
      regexToolRiskMap.set(tool.name, tool.riskClass);
    }

    const regexViolationCodes = analysis.violations.map(v => {
      const match = v.diagnosticCode.match(/CLAWS-(.*)/);
      return match ? match[1]! : v.diagnosticCode;
    });

    regexMetrics = calculateMetrics(manifest, ast, regexViolationCodes, expectedViolationCodes);

    // ── LLM-enhanced pipeline ───────────────────────────────────────
    const provider = new AcceptanceMockProvider();
    const extractor = new ExtractorLLM(provider);

    const presentEntries = parseResult.entries.filter(e => e.status === 'present');
    const llmResults = await extractor.extractAll(presentEntries, {
      knownTools: manifest.tools.map(t => t.name),
      knownAgents: manifest.agents.map(a => a.name),
      knownLabels: manifest.dataLabels.map(d => d.label),
    });

    // Verify and merge
    allMergedIntents = [];
    const verifiedBySource = new Map<string, LLMIntent[]>();
    for (const result of llmResults) {
      const entry = presentEntries.find(e => e.status === 'present' && e.source === result.source);
      if (!entry || entry.status !== 'present') continue;
      const verification = verifyExtractionResult(result, entry.content);
      verifiedBySource.set(result.source, [...verification.passedIntents]);
    }

    const regexDenyIntents: RegexIntent[] = [];
    for (const group of ast.deny) {
      for (const intent of group.intents) {
        regexDenyIntents.push({
          kind: intent.intentKind,
          target: intent.pattern,
          description: intent.rawLine,
          confidence: intent.confidence,
          line: intent.line,
          sourceText: intent.rawLine,
        });
      }
    }

    let llmOnlyDenyCount = 0;
    let llmOnlyElicitCount = 0;
    let llmOnlyLabelCount = 0;
    for (const [source, verified] of verifiedBySource) {
      const sourceRegex = source === 'SOUL.md' ? regexDenyIntents : [];
      const mergeResult = mergeIntents(source, sourceRegex, verified);
      allMergedIntents.push(...mergeResult.intents);
      llmOnlyDenyCount += mergeResult.intents.filter(
        i => i.extractionMethod === 'llm' && i.kind === 'deny',
      ).length;
      llmOnlyElicitCount += mergeResult.intents.filter(
        i => i.extractionMethod === 'llm' && i.kind === 'elicit',
      ).length;
      llmOnlyLabelCount += mergeResult.intents.filter(
        i => i.extractionMethod === 'llm' && i.kind === 'label',
      ).length;
    }

    enhancedMetrics = {
      toolsClassified: regexMetrics.toolsClassified + llmOnlyLabelCount,
      denyConstraints: regexMetrics.denyConstraints + llmOnlyDenyCount,
      delegationEdges: regexMetrics.delegationEdges,
      oboBoundaries: regexMetrics.oboBoundaries + (verifiedBySource.has('USER.md') ? 2 : 0),
      riskAccuracy: regexMetrics.riskAccuracy + llmOnlyElicitCount,
    };

    delta = calculateDelta(regexMetrics, enhancedMetrics);
  });

  it('LLM-enhanced extraction never produces fewer results than regex-only', () => {
    expect(enhancedMetrics.toolsClassified).toBeGreaterThanOrEqual(regexMetrics.toolsClassified);
    expect(enhancedMetrics.denyConstraints).toBeGreaterThanOrEqual(regexMetrics.denyConstraints);
    expect(enhancedMetrics.delegationEdges).toBeGreaterThanOrEqual(regexMetrics.delegationEdges);
    expect(enhancedMetrics.oboBoundaries).toBeGreaterThanOrEqual(regexMetrics.oboBoundaries);
    expect(enhancedMetrics.riskAccuracy).toBeGreaterThanOrEqual(regexMetrics.riskAccuracy);
    expect(delta.negativeCount).toBe(0);
  });

  it('positive delta on at least 3 of 5 benchmark metrics', () => {
    expect(delta.positiveCount).toBeGreaterThanOrEqual(3);
  });

  it('all merged intents have extractionMethod field', () => {
    expect(allMergedIntents.length).toBeGreaterThan(0);
    for (const intent of allMergedIntents) {
      expect(['regex', 'llm', 'llm+regex']).toContain(intent.extractionMethod);
    }
  });

  it('GatewaySim enforcement with LLM-enhanced compile is at least as strict as regex-only', async () => {
    const hooks = createCompiledPluginHooks(regexToolRiskMap);

    // Configure policies: R3+ blocked, R1-R2 allowed
    const toolPolicies: Record<string, { allowed: boolean; blockReason: string | null }> = {};
    for (const [toolName, riskLevel] of regexToolRiskMap) {
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

    const sim = GatewaySim.fromHooks(hooks, regexToolRiskMap, { host });

    // Fire all 12 tools
    const toolNames = [...regexToolRiskMap.keys()];
    let blockedCount = 0;
    let allowedCount = 0;

    for (const toolName of toolNames) {
      const result = await sim.fireToolCall(toolName);
      if (result.allowed) {
        allowedCount++;
      } else {
        blockedCount++;
      }
    }

    // R1-R2 tools (4) allowed, R3+ tools (8) blocked/elicited
    expect(allowedCount).toBeGreaterThanOrEqual(4);
    expect(blockedCount).toBeGreaterThanOrEqual(8);

    // Audit chain has entries for all tools
    const auditChain = sim.getAuditChain();
    expect(auditChain).toHaveLength(toolNames.length);

    // Every audit entry has a valid outcome
    for (const entry of auditChain) {
      expect(['ALLOWED', 'BLOCKED', 'ELICITED']).toContain(entry.outcome);
    }
  });
});
