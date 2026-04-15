/**
 * `claws compile` command — runs the parse+extract+analyze pipeline
 * and writes GovernanceIR to .claws/compiled/governance-ir.json.
 *
 * This is a thin CLI adapter: it calls SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/compile
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  detectConflicts,
  buildCapabilityManifest,
  toIRConflictReport,
  COMPILER_VERSION,
  SCHEMA_VERSION,
  analyze,
  ExtractorLLM,
  buildRegexIntentMap,
} from '@bic/claws-sdk/compile';
import { createDefaultRegistry } from '@bic/claws-sdk/governance';
import { serialize } from '@bic/claws-sdk/ir';
import type { GovernanceIR } from '@bic/claws-sdk/ir';

import type { PlatformContext } from '../hooks/pre-command.js';
import { createTimer } from '../hooks/post-command.js';
import { writeBypassAuditEvent } from '../core/audit.js';
import { checkBuildCache, storeBuildCache } from '../core/cache.js';
import type { LLMFlags } from '../core/llm.js';
import { createLLMProvider } from '../core/llm.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
  noSourceFilesError,
} from '../output/errors.js';

/**
 * Output path for compiled GovernanceIR.
 */
const IR_OUTPUT_DIR = '.claws/compiled';
const IR_OUTPUT_FILE = 'governance-ir.json';

/**
 * Run the compile pipeline: parse → extract → [llm-extract] → analyze → write IR.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options (force, json, verbose)
 * @param llmFlags - Optional LLM flags (--llm, --llm-model)
 * @returns Exit code (0=clean, 1=violations, 2=bypass, 3=error)
 */
export async function runCompile(
  ctx: PlatformContext,
  opts: { force: boolean; json: boolean; verbose: boolean },
  llmFlags: LLMFlags = { llm: false },
): Promise<number> {
  const timer = createTimer();

  // Check bypass
  if (ctx.bypass) {
    await writeBypassAuditEvent(ctx.workspaceRoot, 'bypass');
    const msg = 'Governance checks skipped (CLAWS_BYPASS=1)';
    if (opts.json) {
      console.log(JSON.stringify({ status: 'bypassed', message: msg }));
    } else {
      console.warn(msg);
    }
    return 2;
  }

  // Check workspace
  if (!ctx.hasConfig) {
    const err = noWorkspaceError();
    console.error(opts.json ? formatErrorJson(err) : formatError(err));
    return 3;
  }

  // Check cache (skip if --force)
  const cacheResult = await checkBuildCache(ctx.workspaceRoot, opts.force);
  if (cacheResult.skip) {
    if (opts.json) {
      console.log(JSON.stringify({ status: 'cached', path: join(IR_OUTPUT_DIR, IR_OUTPUT_FILE) }));
    } else {
      console.log(`Compiled IR is up-to-date (${join(IR_OUTPUT_DIR, IR_OUTPUT_FILE)})`);
    }
    return 0;
  }

  // ── Validate LLM provider (if --llm) ─────────────────────────────────
  const llmResult = await createLLMProvider(llmFlags, opts.json);
  if (llmResult !== null && !llmResult.ok) return llmResult.exitCode;
  const llmExtractor = new ExtractorLLM(llmResult?.provider ?? null);

  // ── Parse phase ──────────────────────────────────────────────────────
  const parseResult = await parse(ctx.workspaceRoot);

  if (parseResult.shouldHalt) {
    const err = noSourceFilesError();
    console.error(opts.json ? formatErrorJson(err) : formatError(err));
    return 3;
  }

  if (opts.verbose) {
    console.log(`Parsed ${parseResult.presentCount} files (${parseResult.absentCount} absent)`);
  }

  // ── Intent extraction + AST construction ─────────────────────────────
  const intentResults = extractAllIntents(parseResult);
  const ast = buildGovernanceAST(intentResults);

  // ── LLM extraction → verify → merge (when --llm) ────────────────────
  let llmExtractionCount = 0;
  if (llmExtractor.available) {
    // Build regex intents map by source for merging
    const regexIntentsBySource = buildRegexIntentMap(ast);
    const pipeline = await llmExtractor.extractVerifyMerge(
      parseResult.entries,
      regexIntentsBySource,
    );
    if (pipeline) {
      llmExtractionCount = pipeline.extractionResults.reduce(
        (sum, r) => sum + r.intents.length, 0,
      );
      if (opts.verbose) {
        const verified = pipeline.verificationResults.reduce(
          (sum, v) => sum + v.exactCount + v.fuzzyCount, 0,
        );
        const dropped = pipeline.verificationResults.reduce(
          (sum, v) => sum + v.mismatchCount, 0,
        );
        const merged = pipeline.mergeResults.reduce(
          (sum, m) => sum + m.intents.length, 0,
        );
        console.log(`LLM extracted ${llmExtractionCount} intent(s) via ${llmExtractor.modelId}`);
        console.log(`  Verified: ${verified} passed, ${dropped} dropped`);
        console.log(`  Merged: ${merged} total intent(s)`);
      }
    }
  }

  // ── Manifest extraction ──────────────────────────────────────────────
  const manifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(manifest);

  // ── Conflict detection ───────────────────────────────────────────────
  const compileConflicts = detectConflicts(ast, manifest);

  // ── Governance analysis ──────────────────────────────────────────────
  const registry = createDefaultRegistry(capabilityManifest);
  const analysis = analyze(capabilityManifest, registry, {
    suppressedRules: ctx.suppressedRules,
  });

  // ── Build GovernanceIR ───────────────────────────────────────────────
  const ir: GovernanceIR = {
    capabilities: capabilityManifest,
    analysis,
    intents: [],
    delegationMap: [],
    conflicts: toIRConflictReport(compileConflicts),
    compiler: {
      compilerVersion: COMPILER_VERSION,
      compiledAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    },
  };

  // ── Write IR ─────────────────────────────────────────────────────────
  const outDir = join(ctx.workspaceRoot, IR_OUTPUT_DIR);
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, IR_OUTPUT_FILE);
  await writeFile(outPath, serialize(ir), 'utf-8');

  // Store cache after successful compile
  await storeBuildCache(ctx.workspaceRoot);

  const elapsed = timer.elapsed();
  const violationCount = analysis.violations.length;
  const conflictCount = compileConflicts.conflicts.length;

  if (opts.json) {
    const jsonOut: Record<string, unknown> = {
      status: violationCount > 0 ? 'violations' : 'ok',
      path: join(IR_OUTPUT_DIR, IR_OUTPUT_FILE),
      violations: violationCount,
      conflicts: conflictCount,
      durationMs: elapsed,
    };
    if (llmExtractor.available) {
      jsonOut['llm'] = {
        model: llmExtractor.modelId,
        extractedIntents: llmExtractionCount,
      };
    }
    console.log(JSON.stringify(jsonOut));
  } else {
    console.log(`Compiled governance IR → ${join(IR_OUTPUT_DIR, IR_OUTPUT_FILE)}`);
    if (violationCount > 0) {
      console.log(`  ${violationCount} violation(s) found`);
    }
    if (conflictCount > 0) {
      console.log(`  ${conflictCount} conflict(s) detected`);
    }
    if (llmExtractor.available) {
      console.log(`  LLM: ${llmExtractionCount} intent(s) extracted via ${llmExtractor.modelId}`);
    }
    if (opts.verbose) {
      console.log(`  Duration: ${elapsed}ms`);
    }
  }

  return violationCount > 0 ? 1 : 0;
}
