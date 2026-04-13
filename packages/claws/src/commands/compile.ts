/**
 * `claws compile` command — runs the parse+extract+analyze pipeline
 * and writes GovernanceIR to .claws/compiled/governance-ir.json.
 *
 * This is a thin CLI adapter: it calls SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/compile
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
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
} from '@bic/claws-sdk/compile';
import { createDefaultRegistry } from '@bic/claws-sdk/governance';
import { serialize } from '@bic/claws-sdk/ir';
import type { GovernanceIR } from '@bic/claws-sdk/ir';

import type { PlatformContext } from '../hooks/pre-command.js';
import { createTimer } from '../hooks/post-command.js';
import { writeBypassAuditEvent } from '../core/audit.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
  compileFailedError,
  noSourceFilesError,
} from '../output/errors.js';

/**
 * Output path for compiled GovernanceIR.
 */
const IR_OUTPUT_DIR = '.claws/compiled';
const IR_OUTPUT_FILE = 'governance-ir.json';

/**
 * Check if a cached IR exists and is still valid.
 * Returns the cached IR JSON string if valid, null otherwise.
 */
async function checkCache(
  workspaceRoot: string,
  force: boolean,
): Promise<string | null> {
  if (force) return null;
  const irPath = join(workspaceRoot, IR_OUTPUT_DIR, IR_OUTPUT_FILE);
  try {
    const content = await readFile(irPath, 'utf-8');
    const ir = JSON.parse(content) as GovernanceIR;
    if (ir.compiler?.compilerVersion === COMPILER_VERSION) {
      return content;
    }
  } catch {
    // No cache or invalid
  }
  return null;
}

/**
 * Run the compile pipeline: parse → extract → analyze → write IR.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options (force, json, verbose)
 * @returns Exit code (0=clean, 1=violations, 2=bypass, 3=error)
 */
export async function runCompile(
  ctx: PlatformContext,
  opts: { force: boolean; json: boolean; verbose: boolean },
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
  const cached = await checkCache(ctx.workspaceRoot, opts.force);
  if (cached !== null) {
    if (opts.json) {
      console.log(JSON.stringify({ status: 'cached', path: join(IR_OUTPUT_DIR, IR_OUTPUT_FILE) }));
    } else {
      console.log(`Compiled IR is up-to-date (${join(IR_OUTPUT_DIR, IR_OUTPUT_FILE)})`);
    }
    return 0;
  }

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

  // ── Manifest extraction ──────────────────────────────────────────────
  const manifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(manifest);

  // ── Conflict detection ───────────────────────────────────────────────
  const compileConflicts = detectConflicts(ast, manifest);

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
  const analysis = { ...rawAnalysis, violations: activeViolations };

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

  const elapsed = timer.elapsed();
  const violationCount = analysis.violations.length;
  const conflictCount = compileConflicts.conflicts.length;

  if (opts.json) {
    console.log(JSON.stringify({
      status: violationCount > 0 ? 'violations' : 'ok',
      path: join(IR_OUTPUT_DIR, IR_OUTPUT_FILE),
      violations: violationCount,
      conflicts: conflictCount,
      durationMs: elapsed,
    }));
  } else {
    console.log(`Compiled governance IR → ${join(IR_OUTPUT_DIR, IR_OUTPUT_FILE)}`);
    if (violationCount > 0) {
      console.log(`  ${violationCount} violation(s) found`);
    }
    if (conflictCount > 0) {
      console.log(`  ${conflictCount} conflict(s) detected`);
    }
    if (opts.verbose) {
      console.log(`  Duration: ${elapsed}ms`);
    }
  }

  return violationCount > 0 ? 1 : 0;
}
