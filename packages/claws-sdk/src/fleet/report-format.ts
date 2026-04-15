/**
 * Fleet report output formatters — CSV, JSON, and aligned terminal table.
 *
 * Three output formats:
 * - CSV: for spreadsheet import (Excel, Google Sheets)
 * - JSON: for API consumption and programmatic access
 * - Table: for terminal display with aligned columns and ANSI colors
 *
 * @module claws-sdk/fleet/report-format
 */

import type { FleetReport, ComplianceMatrix, ComplianceStatus } from './report.js';

/**
 * Supported output formats.
 */
export type ReportFormat = 'csv' | 'json' | 'table';

/**
 * Format a fleet report in the specified format.
 */
export function formatReport(report: FleetReport, format: ReportFormat): string {
  switch (format) {
    case 'csv':
      return formatCsv(report);
    case 'json':
      return formatJson(report);
    case 'table':
      return formatTable(report);
  }
}

/**
 * Format the fleet report as CSV.
 *
 * Two sections:
 * 1. Summary section with fleet statistics
 * 2. Compliance matrix with workspace rows and framework columns
 */
export function formatCsv(report: FleetReport): string {
  const lines: string[] = [];
  const s = report.summary;

  // Summary header
  lines.push('Section,Key,Value');
  lines.push(`Summary,Total Workspaces,${s.totalWorkspaces}`);
  lines.push(`Summary,Governed,${s.governed}`);
  lines.push(`Summary,Ungoverned,${s.ungoverned}`);
  lines.push(`Summary,Misconfigured,${s.misconfigured}`);
  lines.push(`Summary,Drift Clean,${s.driftClean}`);
  lines.push(`Summary,Drift Drifted,${s.driftDrifted}`);
  lines.push(`Summary,Drift Suppressed,${s.driftSuppressed}`);
  lines.push(`Summary,Drift No Baseline,${s.driftNoBaseline}`);
  lines.push(`Summary,Killed,${s.killed}`);
  lines.push('');

  // Compliance matrix
  const { complianceMatrix } = report;
  const fwHeaders = complianceMatrix.frameworks.join(',');
  lines.push(`Workspace,Classification,Trust Tier,Drift Status,Kill Status,Last Broadcast,Policies${fwHeaders ? ',' + fwHeaders : ''}`);

  for (const ws of report.workspaces) {
    const row = complianceMatrix.rows.find((r) => r.workspace === ws.path);
    const fwValues = complianceMatrix.frameworks.map((fw) => {
      const cell = row?.cells.find((c) => c.framework === fw);
      return cell?.status ?? 'missing';
    });

    const escapedPath = csvEscape(ws.path);
    const parts = [
      escapedPath,
      ws.classification,
      ws.trustTier !== null ? String(ws.trustTier) : '',
      ws.driftStatus,
      ws.killStatus,
      ws.lastBroadcast ?? '',
      String(ws.policyCount),
      ...fwValues,
    ];
    lines.push(parts.join(','));
  }

  return lines.join('\n') + '\n';
}

/**
 * Escape a value for CSV output.
 */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format the fleet report as JSON.
 */
export function formatJson(report: FleetReport): string {
  return JSON.stringify(report, null, 2) + '\n';
}

/**
 * ANSI color codes for terminal output.
 */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
} as const;

/**
 * Colorize a compliance status cell for terminal output.
 */
function colorStatus(status: ComplianceStatus): string {
  switch (status) {
    case 'pass':
      return `${ANSI.green}PASS${ANSI.reset}`;
    case 'fail':
      return `${ANSI.red}FAIL${ANSI.reset}`;
    case 'missing':
      return `${ANSI.dim}---${ANSI.reset}`;
  }
}

/**
 * Colorize a drift status for terminal output.
 */
function colorDrift(status: string): string {
  switch (status) {
    case 'clean':
      return `${ANSI.green}clean${ANSI.reset}`;
    case 'drifted':
      return `${ANSI.red}drifted${ANSI.reset}`;
    case 'suppressed':
      return `${ANSI.yellow}suppressed${ANSI.reset}`;
    case 'no-baseline':
      return `${ANSI.dim}no-baseline${ANSI.reset}`;
    default:
      return `${ANSI.dim}unknown${ANSI.reset}`;
  }
}

/**
 * Colorize a kill status for terminal output.
 */
function colorKill(status: string): string {
  switch (status) {
    case 'active':
      return `${ANSI.green}active${ANSI.reset}`;
    case 'killed':
      return `${ANSI.red}killed${ANSI.reset}`;
    default:
      return `${ANSI.dim}unknown${ANSI.reset}`;
  }
}

/**
 * Pad a string to a minimum width, accounting for ANSI escape sequences.
 */
function padAnsi(str: string, width: number): string {
  // Strip ANSI for length calculation
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  const pad = Math.max(0, width - stripped.length);
  return str + ' '.repeat(pad);
}

/**
 * Format the fleet report as a terminal table with aligned columns and ANSI colors.
 */
export function formatTable(report: FleetReport): string {
  const lines: string[] = [];
  const s = report.summary;

  // Title
  lines.push(`${ANSI.bold}Fleet Compliance Report${ANSI.reset}`);
  lines.push(`${ANSI.dim}Generated: ${report.timestamp}${ANSI.reset}`);
  lines.push(`${ANSI.dim}Fleet root: ${report.fleetRoot}${ANSI.reset}`);
  lines.push('');

  // Summary
  lines.push(`${ANSI.bold}Summary${ANSI.reset}`);
  lines.push(`  Total workspaces: ${ANSI.bold}${s.totalWorkspaces}${ANSI.reset}`);
  lines.push(`  Governed: ${ANSI.green}${s.governed}${ANSI.reset}  Ungoverned: ${ANSI.yellow}${s.ungoverned}${ANSI.reset}  Misconfigured: ${ANSI.red}${s.misconfigured}${ANSI.reset}`);
  lines.push(`  Drift — clean: ${s.driftClean}  drifted: ${s.driftDrifted}  suppressed: ${s.driftSuppressed}  no-baseline: ${s.driftNoBaseline}`);
  if (s.killed > 0) {
    lines.push(`  Killed: ${ANSI.red}${s.killed}${ANSI.reset}`);
  }
  lines.push('');

  // Workspace detail table
  lines.push(`${ANSI.bold}Workspaces${ANSI.reset}`);

  // Compute column widths
  const pathWidth = Math.max(
    10,
    ...report.workspaces.map((ws) => ws.path.length),
  );
  const classWidth = 14;
  const tierWidth = 6;
  const driftWidth = 12;
  const killWidth = 8;

  // Header
  const header = [
    'Path'.padEnd(pathWidth),
    'Classification'.padEnd(classWidth),
    'Tier'.padEnd(tierWidth),
    'Drift'.padEnd(driftWidth),
    'Kill'.padEnd(killWidth),
    'Policies',
  ].join('  ');
  lines.push(`  ${ANSI.dim}${header}${ANSI.reset}`);
  lines.push(`  ${'─'.repeat(header.length)}`);

  for (const ws of report.workspaces) {
    const row = [
      ws.path.padEnd(pathWidth),
      padAnsi(colorClassification(ws.classification), classWidth),
      padAnsi(ws.trustTier !== null ? `T${ws.trustTier}` : '-', tierWidth),
      padAnsi(colorDrift(ws.driftStatus), driftWidth),
      padAnsi(colorKill(ws.killStatus), killWidth),
      String(ws.policyCount),
    ].join('  ');
    lines.push(`  ${row}`);
  }
  lines.push('');

  // Compliance matrix
  const { complianceMatrix } = report;
  if (complianceMatrix.frameworks.length > 0) {
    lines.push(`${ANSI.bold}Compliance Matrix${ANSI.reset}`);

    const fwWidth = 10;
    const wsColWidth = Math.max(10, ...complianceMatrix.rows.map((r) => r.workspace.length));

    const matrixHeader = [
      'Workspace'.padEnd(wsColWidth),
      ...complianceMatrix.frameworks.map((fw) => fw.padEnd(fwWidth)),
    ].join('  ');
    lines.push(`  ${ANSI.dim}${matrixHeader}${ANSI.reset}`);
    lines.push(`  ${'─'.repeat(matrixHeader.length)}`);

    for (const row of complianceMatrix.rows) {
      const cells = complianceMatrix.frameworks.map((fw) => {
        const cell = row.cells.find((c) => c.framework === fw);
        return padAnsi(colorStatus(cell?.status ?? 'missing'), fwWidth);
      });
      const matrixRow = [
        row.workspace.padEnd(wsColWidth),
        ...cells,
      ].join('  ');
      lines.push(`  ${matrixRow}`);
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

/**
 * Colorize a classification for terminal output.
 */
function colorClassification(classification: string): string {
  switch (classification) {
    case 'GOVERNED':
      return `${ANSI.green}GOVERNED${ANSI.reset}`;
    case 'UNGOVERNED':
      return `${ANSI.yellow}UNGOVERNED${ANSI.reset}`;
    case 'MISCONFIGURED':
      return `${ANSI.red}MISCONFIGURED${ANSI.reset}`;
    default:
      return classification;
  }
}
