/**
 * `claws check` command — runs compile+analyze pipeline and renders
 * colored terminal output. Read-only: does not write IR to disk.
 *
 * This is a thin CLI adapter: it calls SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/check
 */

import { join } from 'node:path';

import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  buildCapabilityManifest,
  analyze,
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
 * Run the check pipeline: parse → extract → analyze → render.
 * Read-only except for bypass audit events.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options (json, verbose, color)
 * @returns Exit code (0=clean, 1=violations, 2=bypass, 3=error)
 */
export async function runCheck(
  ctx: PlatformContext,
  opts: { json: boolean; verbose: boolean; color: boolean },
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

  // ── Manifest extraction ──────────────────────────────────────────────
  const manifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(manifest);

  // ── Governance analysis ──────────────────────────────────────────────
  const registry = createDefaultRegistry(capabilityManifest);
  const rawAnalysis = analyze(capabilityManifest, registry);

  // ── Suppress rules from claws.json ──────────────────────────────────
  const suppressSet = new Set(ctx.suppressedRules);
  const suppressed = rawAnalysis.violations.filter((v) => suppressSet.has(v.ruleId));
  const activeViolations = suppressSet.size > 0
    ? rawAnalysis.violations.filter((v) => !suppressSet.has(v.ruleId))
    : rawAnalysis.violations;
  if (suppressed.length > 0) {
    console.warn(`${suppressed.length} violation(s) suppressed by claws.json`);
  }

  const elapsed = timer.elapsed();

  // ── Render output ────────────────────────────────────────────────────
  const violations = activeViolations.map(toRenderable);
  const result: CheckResult = { violations, durationMs: elapsed };

  if (opts.json) {
    console.log(renderCheckJson(result));
  } else {
    const palette = createPalette(opts.color);
    console.log(renderCheckOutput(result, palette));
  }

  return violations.length > 0 ? 1 : 0;
}
