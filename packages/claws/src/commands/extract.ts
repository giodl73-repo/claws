/**
 * `claws extract --preview` command — shows LLM extraction results
 * per file without merging into GovernanceIR.
 *
 * Read-only: no disk writes, no GovernanceIR modification.
 * This is a thin CLI adapter: it calls SDK functions and renders results.
 *
 * @module claws-cli/commands/extract
 */

import {
  parse,
  ExtractorLLM,
  verifyExtractionResult,
} from '@bic/claws-sdk/compile';
import type { ExtractionResult } from '@bic/claws-sdk/compile';
import type { VerificationResult } from '@bic/claws-sdk/compile';

import type { PlatformContext } from '../hooks/pre-command.js';
import { createTimer } from '../hooks/post-command.js';
import type { LLMFlags } from '../core/llm.js';
import { createLLMProvider, LLM_HELP_TEXT } from '../core/llm.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
  noSourceFilesError,
} from '../output/errors.js';

/**
 * Options for the extract command.
 */
export interface ExtractOptions {
  readonly json: boolean;
  readonly verbose: boolean;
  readonly preview: boolean;
}

/**
 * Run the extract preview: parse → LLM-extract → render results.
 * Read-only — no disk writes.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options (json, verbose, preview)
 * @param llmFlags - LLM flags (--llm is implicitly true for extract)
 * @returns Exit code (0=success, 3=error)
 */
export async function runExtract(
  ctx: PlatformContext,
  opts: ExtractOptions,
  llmFlags: LLMFlags,
): Promise<number> {
  const timer = createTimer();

  // Check workspace
  if (!ctx.hasConfig) {
    const err = noWorkspaceError();
    console.error(opts.json ? formatErrorJson(err) : formatError(err));
    return 3;
  }

  // extract always requires --llm (implied)
  const effectiveFlags: LLMFlags = { llm: true, ...(llmFlags.llmModel !== undefined ? { llmModel: llmFlags.llmModel } : {}) };
  const llmResult = await createLLMProvider(effectiveFlags, opts.json);
  // createLLMProvider returns non-null because llm=true; check for error
  if (!llmResult || !llmResult.ok) return llmResult?.exitCode ?? 3;

  const llmExtractor = new ExtractorLLM(llmResult.provider);

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

  // ── LLM extraction ──────────────────────────────────────────────────
  const results = await llmExtractor.extractAll(parseResult.entries);

  // ── Verify extraction results against source content ───────────────
  const contentBySource = new Map<string, string>();
  for (const entry of parseResult.entries) {
    if (entry.status === 'present') {
      contentBySource.set(entry.source, entry.content);
    }
  }

  const verifications: VerificationResult[] = [];
  const verifiedResults: ExtractionResult[] = [];
  for (const result of results) {
    const content = contentBySource.get(result.source);
    if (content === undefined) {
      verifiedResults.push(result);
      continue;
    }
    const verification = verifyExtractionResult(result, content);
    verifications.push(verification);
    // Replace intents with verified (passed) intents only
    verifiedResults.push({
      source: result.source,
      intents: verification.passedIntents,
      ...(result.usage !== undefined ? { usage: result.usage } : {}),
      modelId: result.modelId,
    });
  }

  const elapsed = timer.elapsed();

  // ── Render output ────────────────────────────────────────────────────
  const totalDropped = verifications.reduce((sum, v) => sum + v.mismatchCount, 0);
  if (opts.json) {
    renderExtractJson(verifiedResults, llmExtractor.modelId, elapsed, totalDropped);
  } else {
    renderExtractText(verifiedResults, llmExtractor.modelId, elapsed, opts.verbose, totalDropped);
  }

  return 0;
}

/**
 * Render extraction results as JSON.
 */
function renderExtractJson(
  results: readonly ExtractionResult[],
  modelId: string,
  durationMs: number,
  droppedCount: number,
): void {
  const totalIntents = results.reduce((sum, r) => sum + r.intents.length, 0);
  console.log(JSON.stringify({
    status: 'preview',
    model: modelId,
    files: results.map((r) => ({
      source: r.source,
      intents: r.intents.map((i) => ({
        kind: i.kind,
        target: i.target,
        description: i.description,
        confidence: i.confidence,
        ...(i.line !== undefined ? { line: i.line } : {}),
        sourceText: i.sourceText,
      })),
    })),
    totalIntents,
    ...(droppedCount > 0 ? { droppedIntents: droppedCount } : {}),
    durationMs,
  }));
}

/**
 * Render extraction results as human-readable text.
 */
function renderExtractText(
  results: readonly ExtractionResult[],
  modelId: string,
  durationMs: number,
  verbose: boolean,
  droppedCount: number,
): void {
  const totalIntents = results.reduce((sum, r) => sum + r.intents.length, 0);

  console.log(`LLM Extraction Preview (${modelId})\n`);

  for (const result of results) {
    if (result.intents.length === 0) continue;
    console.log(`  ${result.source}:`);
    for (const intent of result.intents) {
      const lineRef = intent.line !== undefined ? `:${intent.line}` : '';
      const conf = intent.confidence.toFixed(2);
      console.log(`    ${intent.kind} ${intent.target} (confidence ${conf}, ${result.source}${lineRef})`);
      if (verbose) {
        console.log(`      "${intent.sourceText}"`);
      }
    }
    console.log('');
  }

  console.log(`${totalIntents} verified intent(s) extracted in ${durationMs}ms`);
  if (droppedCount > 0) {
    console.log(`  ${droppedCount} intent(s) dropped (source verification failed)`);
  }
  if (totalIntents === 0) {
    console.log(`\nNo intents found. ${LLM_HELP_TEXT}`);
  }
}
