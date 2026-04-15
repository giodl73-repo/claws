/**
 * `claws amend` command — thin CLI adapter for the amendment pipeline.
 *
 * Supports subcommands: `add-skill`, `remove-tool`, `update-policy`.
 * Calls SDK amendment pipeline and renders results for the terminal.
 * No business logic lives here.
 *
 * @module claws-cli/commands/amend
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import {
  runAmendPipeline,
} from '@bic/claws-sdk/amend';
import type {
  AmendPipelineResult,
  Amendment,
  AmendmentType,
} from '@bic/claws-sdk/amend';
import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  detectConflicts,
  buildCapabilityManifest,
  toIRConflictReport,
  analyze,
  COMPILER_VERSION,
  SCHEMA_VERSION,
} from '@bic/claws-sdk/compile';
import { createDefaultRegistry } from '@bic/claws-sdk/governance';
import { serialize, deserialize } from '@bic/claws-sdk/ir';
import type { GovernanceIR } from '@bic/claws-sdk/ir';

import type { PlatformContext } from '../hooks/pre-command.js';
import { createPalette } from '../output/color.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
} from '../output/errors.js';

/**
 * Path to the compiled GovernanceIR relative to workspace root.
 */
const IR_PATH = '.claws/compiled/governance-ir.json';

/**
 * Render pipeline result for terminal output.
 */
function renderResult(
  result: AmendPipelineResult,
  palette: ReturnType<typeof createPalette>,
): string {
  const lines: string[] = [];

  lines.push(palette.bold('claws amend') + '\n');

  if (!result.success) {
    lines.push(palette.fail(`Pipeline stopped at: ${result.step}`));

    if (result.validation && !result.validation.valid) {
      lines.push('');
      lines.push(palette.fail('Validation failed:'));
      for (const v of result.validation.violations) {
        lines.push(`  ${palette.fail(v.ruleId)} ${v.message}`);
      }
    }

    if (result.apply && !result.apply.success) {
      lines.push('');
      lines.push(palette.fail(`Apply failed: ${result.apply.error ?? 'unknown'}`));
    }
  } else {
    lines.push(palette.pass('Amendment applied successfully'));

    if (result.preview) {
      lines.push('');
      lines.push(palette.dim('Changes:'));
      lines.push(palette.dim(result.preview.summary));
    }

    if (result.apply) {
      lines.push('');
      lines.push(palette.dim(`Modified files: ${result.apply.modifiedFiles.join(', ')}`));
    }
  }

  lines.push('');
  lines.push(palette.dim(`Duration: ${result.durationMs}ms`));

  return lines.join('\n');
}

/**
 * Recompile callback — runs the full compile pipeline after amendment.
 * Ensures GovernanceIR stays in sync with the applied amendment.
 */
async function recompile(workspaceRoot: string): Promise<{ success: boolean; error?: string }> {
  try {
    const parseResult = await parse(workspaceRoot);
    if (parseResult.shouldHalt) {
      return { success: false, error: 'No source files found during recompile' };
    }

    const intentResults = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intentResults);
    const manifest = extract(ast);
    const capabilityManifest = buildCapabilityManifest(manifest);
    const compileConflicts = detectConflicts(ast, manifest);
    const registry = createDefaultRegistry(capabilityManifest);
    const analysis = analyze(capabilityManifest, registry);

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

    const outDir = join(workspaceRoot, '.claws', 'compiled');
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'governance-ir.json'), serialize(ir), 'utf-8');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Parse amendment type and build Amendment from CLI arguments.
 */
function parseAmendment(
  subcommand: string,
  target: string,
  valueArgs: Record<string, unknown>,
): Amendment | null {
  const typeMap: Record<string, AmendmentType> = {
    'add-skill': 'add-skill',
    'remove-tool': 'remove-tool',
    'update-policy': 'update-policy',
  };

  const type = typeMap[subcommand];
  if (!type) return null;

  return { type, target, value: valueArgs };
}

/**
 * Run the amend command — validate, preview, and apply a governance amendment.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options
 * @returns Exit code (0=success, 1=validation failed, 3=error)
 */
export async function runAmendCmd(
  ctx: PlatformContext,
  opts: {
    subcommand: string;
    target: string;
    value: Record<string, unknown>;
    dryRun: boolean;
    json: boolean;
    color: boolean;
  },
): Promise<number> {
  if (!ctx.hasConfig) {
    const err = noWorkspaceError();
    console.error(opts.json ? formatErrorJson(err) : formatError(err));
    return 3;
  }

  // Parse amendment
  const amendment = parseAmendment(opts.subcommand, opts.target, opts.value);
  if (!amendment) {
    const msg = `Unknown amendment type: "${opts.subcommand}". Use add-skill, remove-tool, or update-policy.`;
    if (opts.json) {
      console.error(JSON.stringify({ error: msg }));
    } else {
      console.error(msg);
    }
    return 3;
  }

  // Load existing GovernanceIR
  let ir: GovernanceIR;
  try {
    const irPath = join(ctx.workspaceRoot, IR_PATH);
    const raw = await readFile(irPath, 'utf-8');
    ir = deserialize(raw);
  } catch {
    const msg = 'No compiled GovernanceIR found. Run `claws compile` first.';
    if (opts.json) {
      console.error(JSON.stringify({ error: msg }));
    } else {
      console.error(msg);
    }
    return 3;
  }

  // Read trust tier from config
  const trustTier = ctx.config?.trustTier ?? 2;

  // Run pipeline
  const result = await runAmendPipeline(
    ctx.workspaceRoot,
    amendment,
    ir,
    trustTier,
    recompile,
    { dryRun: opts.dryRun },
  );

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const palette = createPalette(opts.color);
    console.log(renderResult(result, palette));
  }

  return result.success ? 0 : 1;
}
