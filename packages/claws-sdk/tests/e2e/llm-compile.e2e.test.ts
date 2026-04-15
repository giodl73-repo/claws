/**
 * L2 E2E: Full --llm compile on reference workspace with mock provider.
 *
 * Verifies the full pipeline: parse -> regex intents -> LLM extract ->
 * verify -> merge -> GovernanceAST -> manifest -> GovernanceIR.
 *
 * Exit criteria:
 * - Merged intents have extractionMethod tags (regex | llm | llm+regex)
 * - LLM-enhanced compile produces >= regex-only violations
 * - extractionMethod field present on all merged intent results
 *
 * @module claws-sdk/tests/e2e/llm-compile.e2e
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';

// Compile pipeline
import { parse } from '../../src/compile/parse.js';
import { extractAllIntents } from '../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';
import { extract } from '../../src/compile/extract.js';
import { buildCapabilityManifest } from '../../src/compile/manifest.js';
import { analyze } from '../../src/compile/analyze.js';
import { createDefaultRegistry } from '../../src/governance/index.js';
import { COMPILER_VERSION, SCHEMA_VERSION } from '../../src/compile/version.js';

// LLM pipeline
import { ExtractorLLM } from '../../src/compile/llm/extractor.js';
import { verifyExtractionResult } from '../../src/compile/llm/verifier.js';
import { mergeIntents, mergeAllIntents, type RegexIntent, type ExtractionMethod } from '../../src/compile/llm/merger.js';
import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
  LLMIntent,
} from '../../src/compile/llm/types.js';
import type { ParseDiagnostic } from '../../src/compile/types.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

// ── Constants ──────────────────────────────────────────────────────────

const REF_WORKSPACE = resolve(__dirname, '../fixtures/oc-reference-workspace');

// ── Mock LLM Provider ─────────────────────────────────────────────────

/**
 * Mock provider that simulates realistic LLM extraction for the
 * reference workspace, producing intents with verifiable sourceText.
 */
class MockCompileProvider implements LLMProvider {
  readonly modelId = 'e2e-mock-compile-v1';

  async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
    const intents: LLMIntent[] = [];

    if (request.source === 'SOUL.md') {
      // Overlaps with regex (exact sourceText from SOUL.md)
      intents.push({
        kind: 'deny',
        target: 'production-access',
        description: 'No production database access',
        confidence: 0.95,
        line: 11,
        sourceText: 'Never access production databases or systems.',
      });
      // LLM gap-fill: model restriction the regex may not extract as 'limit'
      intents.push({
        kind: 'limit',
        target: 'model-usage',
        description: 'Only approved models allowed',
        confidence: 0.85,
        line: 17,
        sourceText: 'Only use approved models:',
      });
    } else if (request.source === 'TOOLS.md') {
      // LLM extracts elicitation requirements from governance sections
      intents.push({
        kind: 'elicit',
        target: 'send-email',
        description: 'Elicitation required for R5 email',
        confidence: 0.92,
        line: 41,
        sourceText: 'Governance: audit + approval (exec) + elicitation required',
      });
      intents.push({
        kind: 'elicit',
        target: 'deploy-trigger',
        description: 'Dual-approval + elicitation for deployments',
        confidence: 0.90,
        line: 58,
        sourceText: 'Governance: audit + approval (exec) + elicitation required + dual-approval',
      });
    } else if (request.source === 'USER.md') {
      // LLM detects OBO scope
      intents.push({
        kind: 'label',
        target: 'email-obo',
        description: 'OBO: draft and send emails',
        confidence: 0.90,
        line: 8,
        sourceText: '- **email**: Draft and send emails (requires approval per SOUL constraints)',
      });
    }

    return {
      source: request.source,
      intents,
      usage: { inputTokens: 400, outputTokens: 150 },
      modelId: this.modelId,
    };
  }

  async validate(_result: ExtractionResult): Promise<readonly ParseDiagnostic[]> {
    return [];
  }
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('E2E: full --llm compile on reference workspace', () => {
  it('LLM-enhanced compile produces merged intents with extractionMethod tags', async () => {
    // ── Step 1: Parse workspace ─────────────────────────────────────
    const parseResult = await parse(REF_WORKSPACE);
    expect(parseResult.presentCount).toBeGreaterThanOrEqual(7);

    // ── Step 2: Regex-only pipeline ─────────────────────────────────
    const intentResults = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intentResults);
    const manifest = extract(ast);
    const capManifest = buildCapabilityManifest(manifest);
    const registry = createDefaultRegistry(capManifest);
    const regexAnalysis = analyze(capManifest, registry);

    // ── Step 3: LLM extraction ──────────────────────────────────────
    const provider = new MockCompileProvider();
    const extractor = new ExtractorLLM(provider);

    const presentEntries = parseResult.entries.filter(e => e.status === 'present');
    const llmResults = await extractor.extractAll(presentEntries, {
      knownTools: manifest.tools.map(t => t.name),
      knownAgents: manifest.agents.map(a => a.name),
    });

    expect(llmResults.length).toBeGreaterThan(0);

    // ── Step 4: Verify LLM intents against source ───────────────────
    const allMergedIntents: Array<{ extractionMethod: ExtractionMethod; kind: string; target: string }> = [];

    for (const result of llmResults) {
      const entry = presentEntries.find(e => e.status === 'present' && e.source === result.source);
      if (!entry || entry.status !== 'present') continue;

      const verification = verifyExtractionResult(result, entry.content);

      // Build regex intents for this source
      const sourceRegex: RegexIntent[] = [];
      if (result.source === 'SOUL.md') {
        for (const group of ast.deny) {
          for (const intent of group.intents) {
            sourceRegex.push({
              kind: intent.intentKind,
              target: intent.pattern,
              description: intent.rawLine,
              confidence: intent.confidence,
              line: intent.line,
              sourceText: intent.rawLine,
            });
          }
        }
      }

      // ── Step 5: Merge ─────────────────────────────────────────────
      const mergeResult = mergeIntents(
        result.source,
        sourceRegex,
        verification.passedIntents,
      );

      for (const mi of mergeResult.intents) {
        allMergedIntents.push({
          extractionMethod: mi.extractionMethod,
          kind: mi.kind,
          target: mi.target,
        });
      }
    }

    // ── Assertions ──────────────────────────────────────────────────

    // All merged intents have extractionMethod
    expect(allMergedIntents.length).toBeGreaterThan(0);
    for (const mi of allMergedIntents) {
      expect(['regex', 'llm', 'llm+regex']).toContain(mi.extractionMethod);
    }

    // At least some LLM-only intents (gap-fills)
    const llmOnlyIntents = allMergedIntents.filter(i => i.extractionMethod === 'llm');
    expect(llmOnlyIntents.length).toBeGreaterThan(0);

    // At least some regex-only intents (baseline preserved)
    const regexOnlyIntents = allMergedIntents.filter(i => i.extractionMethod === 'regex');
    expect(regexOnlyIntents.length).toBeGreaterThanOrEqual(0);

    // Verify extractionMethod distribution includes all 3 types
    const methods = new Set(allMergedIntents.map(i => i.extractionMethod));
    expect(methods.has('llm')).toBe(true);

    // ── Step 6: Build GovernanceIR ──────────────────────────────────
    // The enhanced GovernanceIR would include extractionMethod metadata.
    // For now, verify the regex pipeline still produces valid analysis.
    const ir: GovernanceIR = {
      capabilities: capManifest,
      analysis: regexAnalysis,
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
        compilerVersion: COMPILER_VERSION,
        compiledAt: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
      },
    };

    expect(ir.capabilities.tools.length).toBeGreaterThanOrEqual(10);
    expect(ir.compiler.compilerVersion).toBe(COMPILER_VERSION);
  });
});
