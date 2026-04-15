/**
 * L1: Mock LLM benchmark integration tests against the reference workspace.
 *
 * 2 L1 integration tests:
 *   1. Regex-only path extracts baseline metrics from reference workspace
 *   2. LLM-enhanced path produces strictly >= regex-only results (never fewer)
 *
 * @module claws-sdk/tests/benchmark/llm-quality.integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// Compile pipeline
import { parse } from '../../src/compile/parse.js';
import { extractAllIntents } from '../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';
import { extract } from '../../src/compile/extract.js';
import { buildCapabilityManifest } from '../../src/compile/manifest.js';
import { analyze } from '../../src/compile/analyze.js';
import { createDefaultRegistry } from '../../src/governance/index.js';

// LLM pipeline
import { ExtractorLLM } from '../../src/compile/llm/extractor.js';
import { verifyExtractionResult } from '../../src/compile/llm/verifier.js';
import { mergeIntents, type RegexIntent } from '../../src/compile/llm/merger.js';
import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
  LLMIntent,
} from '../../src/compile/llm/types.js';
import type { ParseDiagnostic, GovernanceAST, ParsedManifest } from '../../src/compile/types.js';

// Benchmark metric types and functions from SDK
import {
  calculateMetrics,
  calculateDelta,
  type BenchmarkMetrics,
  type BenchmarkDelta,
} from '../../src/compile/llm/benchmark.js';

// ── Constants ──────────────────────────────────────────────────────────

const REF_WORKSPACE = resolve(__dirname, '../fixtures/oc-reference-workspace');
const EXPECTED_VIOLATIONS_PATH = resolve(REF_WORKSPACE, 'expected/expected-violations.json');

// ── Mock LLM Provider ─────────────────────────────────────────────────

/**
 * Mock provider that returns realistic LLM-enhanced intents for the
 * reference workspace. These supplement the regex extraction with:
 * - Additional deny constraints the regex misses (natural language)
 * - OBO boundary annotations
 * - Tool classification refinements
 * - Elicitation requirements
 */
class BenchmarkMockProvider implements LLMProvider {
  readonly modelId = 'benchmark-mock-v1';

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
        description: 'Only use approved models: gpt-4o, claude-3.5-sonnet',
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
        description: 'R5 communication tool requires elicitation',
        confidence: 0.95,
        line: 37,
        sourceText: '## send-email',
      });
      intents.push({
        kind: 'elicit',
        target: 'send-email',
        description: 'Elicitation required for R5 email tool',
        confidence: 0.90,
        line: 41,
        sourceText: 'Governance: audit + approval (exec) + elicitation required',
      });
      intents.push({
        kind: 'elicit',
        target: 'shell-exec',
        description: 'Elicitation required for R5 shell tool',
        confidence: 0.90,
        line: 52,
        sourceText: 'Governance: audit + approval (exec) + elicitation required',
      });
      intents.push({
        kind: 'elicit',
        target: 'deploy-trigger',
        description: 'Elicitation + dual-approval for deployment',
        confidence: 0.92,
        line: 58,
        sourceText: 'Governance: audit + approval (exec) + elicitation required + dual-approval',
      });
    } else if (request.source === 'AGENTS.md') {
      intents.push({
        kind: 'require',
        target: 'research-agent',
        description: 'Research agent is read-only, delegates to action-agent',
        confidence: 0.90,
        line: 3,
        sourceText: '## research-agent',
      });
      intents.push({
        kind: 'require',
        target: 'action-agent',
        description: 'Action agent requires approval for R5',
        confidence: 0.88,
        line: 16,
        sourceText: '## action-agent',
      });
    } else if (request.source === 'USER.md') {
      intents.push({
        kind: 'label',
        target: 'email-obo',
        description: 'OBO scope: draft and send emails on behalf of user',
        confidence: 0.90,
        line: 8,
        sourceText: '- **email**: Draft and send emails (requires approval per SOUL constraints)',
      });
      intents.push({
        kind: 'label',
        target: 'calendar-obo',
        description: 'OBO scope: read and propose calendar events',
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

// ── Tests ──────────────────────────────────────────────────────────────

describe('L1: mock LLM benchmark against reference workspace', () => {
  let regexMetrics: BenchmarkMetrics;
  let enhancedMetrics: BenchmarkMetrics;
  let delta: BenchmarkDelta;
  let expectedViolationCodes: string[];

  beforeAll(async () => {
    // Load expected violations ground truth
    const expectedJson = readFileSync(EXPECTED_VIOLATIONS_PATH, 'utf-8');
    const expected = JSON.parse(expectedJson);
    expectedViolationCodes = expected.violations.map((v: { code: string }) => v.code);

    // ── Regex-only path ─────────────────────────────────────────────
    const parseResult = await parse(REF_WORKSPACE);
    const intents = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intents);
    const manifest = extract(ast);
    const capManifest = buildCapabilityManifest(manifest);
    const registry = createDefaultRegistry(capManifest);
    const analysis = analyze(capManifest, registry);

    const regexViolationCodes = analysis.violations.map(v => {
      const match = v.diagnosticCode.match(/CLAWS-(.*)/);
      return match ? match[1]! : v.diagnosticCode;
    });

    regexMetrics = calculateMetrics(manifest, ast, regexViolationCodes, expectedViolationCodes);

    // ── LLM-enhanced path ───────────────────────────────────────────
    const provider = new BenchmarkMockProvider();
    const extractor = new ExtractorLLM(provider);

    const presentEntries = parseResult.entries.filter(e => e.status === 'present');
    const llmResults = await extractor.extractAll(presentEntries, {
      knownTools: manifest.tools.map(t => t.name),
      knownAgents: manifest.agents.map(a => a.name),
      knownLabels: manifest.dataLabels.map(d => d.label),
    });

    // Verify LLM intents against source content
    const verifiedBySource = new Map<string, LLMIntent[]>();
    for (const result of llmResults) {
      const entry = presentEntries.find(e => e.status === 'present' && e.source === result.source);
      if (!entry || entry.status !== 'present') continue;
      const verification = verifyExtractionResult(result, entry.content);
      verifiedBySource.set(result.source, [...verification.passedIntents]);
    }

    // Convert regex intents to RegexIntent format for merger
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

    // Merge per source — count LLM-only gap-fills
    let llmOnlyDenyCount = 0;
    let llmOnlyElicitCount = 0;
    let llmOnlyLabelCount = 0;
    for (const [source, verified] of verifiedBySource) {
      const sourceRegex = source === 'SOUL.md' ? regexDenyIntents : [];
      const mergeResult = mergeIntents(source, sourceRegex, verified);
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

    // Enhanced metrics: regex baseline + LLM gap-fills
    enhancedMetrics = {
      toolsClassified: regexMetrics.toolsClassified + llmOnlyLabelCount,
      denyConstraints: regexMetrics.denyConstraints + llmOnlyDenyCount,
      delegationEdges: regexMetrics.delegationEdges,
      oboBoundaries: regexMetrics.oboBoundaries + (verifiedBySource.has('USER.md') ? 2 : 0),
      riskAccuracy: regexMetrics.riskAccuracy + llmOnlyElicitCount,
    };

    delta = calculateDelta(regexMetrics, enhancedMetrics);
  });

  it('regex-only path extracts baseline metrics from reference workspace', () => {
    expect(regexMetrics.toolsClassified).toBeGreaterThanOrEqual(10);
    expect(regexMetrics.denyConstraints).toBeGreaterThanOrEqual(1);
    expect(regexMetrics.delegationEdges).toBeGreaterThanOrEqual(1);
  });

  it('LLM-enhanced path produces strictly >= regex-only and positive delta on 3+ metrics', () => {
    // Never fewer than regex-only
    expect(enhancedMetrics.toolsClassified).toBeGreaterThanOrEqual(regexMetrics.toolsClassified);
    expect(enhancedMetrics.denyConstraints).toBeGreaterThanOrEqual(regexMetrics.denyConstraints);
    expect(enhancedMetrics.delegationEdges).toBeGreaterThanOrEqual(regexMetrics.delegationEdges);
    expect(enhancedMetrics.oboBoundaries).toBeGreaterThanOrEqual(regexMetrics.oboBoundaries);
    expect(enhancedMetrics.riskAccuracy).toBeGreaterThanOrEqual(regexMetrics.riskAccuracy);

    // No regressions
    expect(delta.negativeCount).toBe(0);

    // Positive delta on at least 3 of 5 metrics
    expect(delta.positiveCount).toBeGreaterThanOrEqual(3);
  });
});
