/**
 * `claws build [target]` command — full pipeline: parse + extract +
 * analyze + emit platform-specific governance artifacts.
 *
 * This is a thin CLI adapter: it calls SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/build
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

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
import type { Platform } from '@bic/claws-sdk/types';
import { getAdapter } from '@bic/claws-sdk/emit';

import type { PlatformContext } from '../hooks/pre-command.js';
import { createTimer } from '../hooks/post-command.js';
import { writeBypassAuditEvent } from '../core/audit.js';
import { detectPlatform, VALID_PLATFORMS } from '../core/platform-detect.js';
import { checkBuildCache, storeBuildCache } from '../core/cache.js';
import type { LLMFlags } from '../core/llm.js';
import { createLLMProvider } from '../core/llm.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
  compileFailedError,
  noSourceFilesError,
} from '../output/errors.js';

/**
 * Output paths for build artifacts.
 */
const IR_OUTPUT_DIR = '.claws/compiled';
const IR_OUTPUT_FILE = 'governance-ir.json';
const ARTIFACTS_DIR = '.claws/compiled/artifacts';

/**
 * Pipeline stages for progress reporting.
 */
const STAGES = ['parse', 'extract', 'analyze', 'emit'] as const;
type PipelineStage = typeof STAGES[number];

/**
 * Report pipeline stage progress.
 */
function reportStage(stage: PipelineStage, json: boolean, verbose: boolean): void {
  if (json || !verbose) return;
  const stageIndex = STAGES.indexOf(stage) + 1;
  console.log(`  [${stageIndex}/${STAGES.length}] ${stage}...`);
}

/**
 * Build options for the command.
 */
export interface BuildOptions {
  readonly force: boolean;
  readonly json: boolean;
  readonly verbose: boolean;
}

/**
 * Run the build pipeline: detect → parse → extract → [llm-extract] → analyze → emit artifacts.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options (force, json, verbose)
 * @param targetArg - Optional target platform from CLI argument
 * @param llmFlags - Optional LLM flags (--llm, --llm-model)
 * @returns Exit code (0=clean, 1=violations, 2=bypass, 3=error)
 */
export async function runBuild(
  ctx: PlatformContext,
  opts: BuildOptions,
  targetArg?: string,
  llmFlags: LLMFlags = { llm: false },
): Promise<number> {
  const timer = createTimer();

  // Check bypass — exit code 2 distinguishes bypass from clean (0) and violations (1)
  if (ctx.bypass) {
    await writeBypassAuditEvent(ctx.workspaceRoot, 'build-bypass');
    const msg = 'Governance build skipped (CLAWS_BYPASS=1)';
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
      console.log(JSON.stringify({ status: 'up-to-date', message: cacheResult.message }));
    } else {
      console.log(cacheResult.message);
    }
    return 0;
  }

  // Resolve target platform
  let targetPlatform: Platform;
  if (targetArg) {
    if (!VALID_PLATFORMS.has(targetArg)) {
      const err = compileFailedError(
        `Invalid platform "${targetArg}". Valid platforms: ${[...VALID_PLATFORMS].join(', ')}`,
      );
      console.error(opts.json ? formatErrorJson(err) : formatError(err));
      return 3;
    }
    targetPlatform = targetArg as Platform;
  } else {
    try {
      const detectResult = await detectPlatform(ctx.workspaceRoot, ctx.config);
      targetPlatform = detectResult.platform;
      if (opts.verbose && !opts.json) {
        console.log(`  Platform: ${targetPlatform} (${detectResult.method})`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const error = compileFailedError(`Platform detection failed: ${message}`);
      console.error(opts.json ? formatErrorJson(error) : formatError(error));
      return 3;
    }
  }

  // ── Validate LLM provider (if --llm) ─────────────────────────────────
  const llmResult = await createLLMProvider(llmFlags, opts.json);
  if (llmResult !== null && !llmResult.ok) return llmResult.exitCode;
  const llmExtractor = new ExtractorLLM(llmResult?.provider ?? null);

  // ── Parse phase ──────────────────────────────────────────────────────
  reportStage('parse', opts.json, opts.verbose);
  const parseResult = await parse(ctx.workspaceRoot);

  if (parseResult.shouldHalt) {
    const err = noSourceFilesError();
    console.error(opts.json ? formatErrorJson(err) : formatError(err));
    return 3;
  }

  // ── Extract phase ────────────────────────────────────────────────────
  reportStage('extract', opts.json, opts.verbose);
  const intentResults = extractAllIntents(parseResult);
  const ast = buildGovernanceAST(intentResults);
  const manifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(manifest);
  const compileConflicts = detectConflicts(ast, manifest);

  // ── LLM extraction → verify → merge (when --llm) ────────────────────
  // NOTE: In the build pipeline, LLM-merged intents are logged for
  // observability but not fed back into analysis/IR. The compile command
  // is the canonical path for LLM-augmented governance; build uses the
  // merged output only to surface extraction stats. Wiring merged intents
  // into the IR here would require re-extracting the capability manifest,
  // which is deferred to a future --llm-merge flag on build.
  if (llmFlags.llm && llmExtractor.available) {
    const regexIntentsBySource = buildRegexIntentMap(ast);
    const pipeline = await llmExtractor.extractVerifyMerge(
      parseResult.entries,
      regexIntentsBySource,
    );
    if (pipeline && opts.verbose) {
      const count = pipeline.extractionResults.reduce((sum, r) => sum + r.intents.length, 0);
      console.log(`  LLM extracted ${count} intent(s) via ${llmExtractor.modelId}`);
      const merged = pipeline.mergeResults.reduce(
        (sum, m) => sum + m.intents.length, 0,
      );
      console.log(`  Merged: ${merged} total intent(s)`);
    }
  }

  // ── Analyze phase ────────────────────────────────────────────────────
  reportStage('analyze', opts.json, opts.verbose);
  const registry = createDefaultRegistry(capabilityManifest);
  const analysis = analyze(capabilityManifest, registry, {
    suppressedRules: ctx.suppressedRules,
  });

  // Build GovernanceIR
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

  // Write GovernanceIR
  const irOutDir = join(ctx.workspaceRoot, IR_OUTPUT_DIR);
  await mkdir(irOutDir, { recursive: true });
  await writeFile(join(irOutDir, IR_OUTPUT_FILE), serialize(ir), 'utf-8');

  // ── Emit phase ───────────────────────────────────────────────────────
  reportStage('emit', opts.json, opts.verbose);
  const adapter = getAdapter(targetPlatform);
  if (!adapter) {
    const err = compileFailedError(`No adapter for platform "${targetPlatform}"`);
    console.error(opts.json ? formatErrorJson(err) : formatError(err));
    return 3;
  }

  const emitResult = adapter.emit(ir);

  // Write emitted artifacts to disk
  const artifactsDir = join(ctx.workspaceRoot, ARTIFACTS_DIR, targetPlatform);
  await mkdir(artifactsDir, { recursive: true });

  const writtenPaths: string[] = [];
  for (const artifact of emitResult.artifacts) {
    const artifactPath = join(artifactsDir, artifact.path);
    // Ensure subdirectories exist for nested paths
    const artifactDir = dirname(artifactPath);
    await mkdir(artifactDir, { recursive: true });
    await writeFile(artifactPath, artifact.content, 'utf-8');
    writtenPaths.push(join(ARTIFACTS_DIR, targetPlatform, artifact.path));
  }

  // Store cache after successful build
  await storeBuildCache(ctx.workspaceRoot);

  const elapsed = timer.elapsed();
  const elapsedSec = (elapsed / 1000).toFixed(2);
  const violationCount = analysis.violations.length;
  const artifactCount = emitResult.artifacts.length;

  if (opts.json) {
    console.log(JSON.stringify({
      status: violationCount > 0 ? 'violations' : 'ok',
      platform: targetPlatform,
      artifacts: writtenPaths,
      artifactCount,
      violations: violationCount,
      warnings: emitResult.warnings,
      durationMs: elapsed,
    }));
  } else {
    console.log(`Built ${artifactCount} artifacts for ${targetPlatform} in ${elapsedSec}s`);
    for (const p of writtenPaths) {
      console.log(`  ${p}`);
    }
    if (violationCount > 0) {
      console.log(`  ${violationCount} violation(s) found`);
    }
    if (emitResult.warnings.length > 0) {
      for (const w of emitResult.warnings) {
        console.warn(`  Warning: ${w}`);
      }
    }
  }

  return violationCount > 0 ? 1 : 0;
}
