/**
 * `claws check` command — runs compile+analyze pipeline and renders
 * colored terminal output. Read-only: does not write IR to disk.
 *
 * This is a thin CLI adapter: it calls SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/check
 */

import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  buildCapabilityManifest,
  analyze,
  ExtractorLLM,
  buildRegexIntentMap,
} from '@bic/claws-sdk/compile';
import { createDefaultRegistry } from '@bic/claws-sdk/governance';
import type { GovViolation } from '@bic/claws-sdk/ir';

import type { PlatformContext } from '../hooks/pre-command.js';
import { createTimer } from '../hooks/post-command.js';
import { writeBypassAuditEvent } from '../core/audit.js';
import { createPalette } from '../output/color.js';
import { renderCheckOutput } from '../output/format-default.js';
import type { RenderableViolation, CheckResult } from '../output/format-default.js';
import { renderCheckJson } from '../output/format-json.js';
import { getFormatter } from '../format/index.js';
import type { FormatName } from '../format/index.js';
import type { LLMFlags } from '../core/llm.js';
import { createLLMProvider } from '../core/llm.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
  noSourceFilesError,
} from '../output/errors.js';

/**
 * Convert a GovViolation to a RenderableViolation.
 */
function toRenderable(v: GovViolation): RenderableViolation {
  return {
    ruleId: v.ruleId,
    level: v.level,
    message: v.message,
    target: v.target,
    diagnosticCode: v.diagnosticCode,
  };
}

/**
 * Run the check pipeline: parse → extract → [llm-extract] → analyze → render.
 * Read-only except for bypass audit events.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options (json, verbose, color)
 * @param llmFlags - Optional LLM flags (--llm, --llm-model)
 * @returns Exit code (0=clean, 1=violations, 2=bypass, 3=error)
 */
export async function runCheck(
  ctx: PlatformContext,
  opts: { json: boolean; verbose: boolean; color: boolean; format?: FormatName },
  llmFlags: LLMFlags = { llm: false },
): Promise<number> {
  const timer = createTimer();

  // Check bypass — exit code 2 distinguishes bypass from clean (0) and violations (1)
  if (ctx.bypass) {
    await writeBypassAuditEvent(ctx.workspaceRoot, 'check-bypass');
    const msg = 'Governance check skipped (CLAWS_BYPASS=1)';
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

  // ── Intent extraction + AST construction ─────────────────────────────
  const intentResults = extractAllIntents(parseResult);
  const ast = buildGovernanceAST(intentResults);

  // ── LLM extraction → verify → merge (when --llm) ────────────────────
  if (llmExtractor.available) {
    const regexIntentsBySource = buildRegexIntentMap(ast);
    const pipeline = await llmExtractor.extractVerifyMerge(
      parseResult.entries,
      regexIntentsBySource,
    );
    if (pipeline && opts.verbose) {
      const count = pipeline.extractionResults.reduce((sum, r) => sum + r.intents.length, 0);
      const verified = pipeline.verificationResults.reduce(
        (sum, v) => sum + v.exactCount + v.fuzzyCount, 0,
      );
      const dropped = pipeline.verificationResults.reduce(
        (sum, v) => sum + v.mismatchCount, 0,
      );
      const merged = pipeline.mergeResults.reduce(
        (sum, m) => sum + m.intents.length, 0,
      );
      console.log(`LLM extracted ${count} intent(s) via ${llmExtractor.modelId}`);
      console.log(`  Verified: ${verified} passed, ${dropped} dropped`);
      console.log(`  Merged: ${merged} total intent(s)`);
    }
  }

  // ── Manifest extraction ──────────────────────────────────────────────
  const manifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(manifest);

  // ── Governance analysis ──────────────────────────────────────────────
  const registry = createDefaultRegistry(capabilityManifest);
  const analysisResult = analyze(capabilityManifest, registry, {
    suppressedRules: ctx.suppressedRules,
  });

  const elapsed = timer.elapsed();

  // ── Render output ────────────────────────────────────────────────────
  const violations = analysisResult.violations.map(toRenderable);
  const result: CheckResult = { violations, durationMs: elapsed };

  if (opts.format) {
    // --format flag routes through the format registry
    const formatter = getFormatter(opts.format);
    console.log(formatter(result, ctx.workspaceRoot));
  } else if (opts.json) {
    console.log(renderCheckJson(result));
  } else {
    const palette = createPalette(opts.color);
    console.log(renderCheckOutput(result, palette));
  }

  return violations.length > 0 ? 1 : 0;
}
