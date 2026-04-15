/**
 * `claws doctor` command — thin CLI adapter for workspace health diagnostics.
 *
 * Runs the SDK doctor orchestrator and renders results for the terminal.
 * No business logic lives here.
 *
 * @module claws-cli/commands/doctor
 */

import {
  runDoctor,
  createDefaultChecks,
  runMigrations,
} from '@bic/claws-sdk/doctor';
import type { DoctorReport, Diagnostic, MigrationResult } from '@bic/claws-sdk/doctor';

import type { PlatformContext } from '../hooks/pre-command.js';
import { createPalette } from '../output/color.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
} from '../output/errors.js';

/**
 * Format a diagnostic for terminal output.
 */
function formatDiagnostic(d: Diagnostic, palette: ReturnType<typeof createPalette>): string {
  const icon =
    d.severity === 'error' ? palette.fail('ERROR') :
    d.severity === 'warning' ? palette.warn('WARN') :
    palette.dim('INFO');
  const fix = d.fixable ? palette.dim(' (fixable)') : '';
  return `  ${icon} [${d.checkId}] ${d.message}${fix}`;
}

/**
 * Render a doctor report for terminal output.
 */
function renderReport(report: DoctorReport, palette: ReturnType<typeof createPalette>): string {
  const lines: string[] = [];

  lines.push(palette.bold('claws doctor') + '\n');

  for (const check of report.checks) {
    const status = check.passed
      ? palette.pass('PASS')
      : palette.fail('FAIL');
    lines.push(`${status} ${check.name} (${check.durationMs}ms)`);

    for (const d of check.diagnostics) {
      lines.push(formatDiagnostic(d, palette));
    }
    lines.push('');
  }

  const { errors, warnings, infos } = report.summary;
  const summaryParts: string[] = [];
  if (errors > 0) summaryParts.push(palette.fail(`${errors} error(s)`));
  if (warnings > 0) summaryParts.push(palette.warn(`${warnings} warning(s)`));
  if (infos > 0) summaryParts.push(palette.dim(`${infos} info(s)`));

  const health = report.healthy
    ? palette.pass('Workspace is healthy')
    : palette.fail('Workspace has issues');

  lines.push(`${health} — ${summaryParts.join(', ')} in ${report.durationMs}ms`);

  return lines.join('\n');
}

/**
 * Render a migration result for terminal output.
 */
function renderMigration(result: MigrationResult, palette: ReturnType<typeof createPalette>): string {
  if (!result.migrated) {
    if (result.error) {
      return palette.fail(`Migration failed: ${result.error}`);
    }
    return palette.dim('Config schema is already current — no migration needed');
  }

  const lines: string[] = [];
  lines.push(palette.pass(`Migrated config from v${result.fromVersion} → v${result.toVersion}`));
  for (const m of result.applied) {
    lines.push(`  ${palette.dim(`v${m.fromVersion}→v${m.toVersion}:`)} ${m.description}`);
  }
  if (result.backupPath) {
    lines.push(palette.dim(`  Backup saved to ${result.backupPath}`));
  }
  return lines.join('\n');
}

/**
 * Run the doctor command — validate workspace health and display results.
 *
 * When `--fix` is provided, the migration runner is invoked first to
 * upgrade the config schema before running diagnostic checks.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options
 * @returns Exit code (0=healthy, 1=issues, 3=error)
 */
export async function runDoctorCmd(
  ctx: PlatformContext,
  opts: { json: boolean; color: boolean; postUpgrade: boolean; fix: boolean },
): Promise<number> {
  if (!ctx.hasConfig) {
    const err = noWorkspaceError();
    console.error(opts.json ? formatErrorJson(err) : formatError(err));
    return 3;
  }

  // Run migrations when --fix is requested
  if (opts.fix) {
    const migrationResult = await runMigrations(ctx.workspaceRoot);

    if (opts.json) {
      console.log(JSON.stringify(migrationResult, null, 2));
    } else {
      const palette = createPalette(opts.color);
      console.log(renderMigration(migrationResult, palette));
    }

    if (migrationResult.error) {
      return 1;
    }
  }

  const checks = createDefaultChecks({ postUpgrade: opts.postUpgrade });
  const report = await runDoctor(ctx.workspaceRoot, checks);

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const palette = createPalette(opts.color);
    console.log(renderReport(report, palette));
  }

  return report.healthy ? 0 : 1;
}
