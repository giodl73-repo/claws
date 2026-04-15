/**
 * Terminal renderer for SnapshotDiff — color-coded governance posture changes.
 *
 * Green = improvement (resolved violation, de-escalated risk)
 * Red = regression (new violation, escalated risk)
 * Yellow = neutral change (policy added/removed without clear direction)
 *
 * @module claws-sdk/snapshot/diff-renderer
 */

import type { SnapshotDiff, ChangeDirection } from './diff.js';

// ── ANSI color helpers ────────────────────────────────────────────────

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function colorFor(direction: ChangeDirection): string {
  switch (direction) {
    case 'regression': return RED;
    case 'improvement': return GREEN;
    case 'neutral': return YELLOW;
  }
}

function labelFor(direction: ChangeDirection): string {
  switch (direction) {
    case 'regression': return 'REGRESSION';
    case 'improvement': return 'IMPROVEMENT';
    case 'neutral': return 'CHANGE';
  }
}

// ── Render ────────────────────────────────────────────────────────────

/**
 * Render a SnapshotDiff to an array of terminal lines with ANSI color codes.
 *
 * @param diff - The structured diff to render
 * @returns Array of formatted lines (join with '\n' for output)
 */
export function renderDiff(diff: SnapshotDiff): string[] {
  const lines: string[] = [];

  // Header
  lines.push(`${BOLD}Governance Diff: ${diff.baseName} → ${diff.targetName}${RESET}`);
  lines.push(`${DIM}Base:   ${diff.baseTimestamp}${RESET}`);
  lines.push(`${DIM}Target: ${diff.targetTimestamp}${RESET}`);
  lines.push('');

  if (diff.empty) {
    lines.push(`${DIM}No governance changes detected.${RESET}`);
    return lines;
  }

  // Tool risk changes
  if (diff.toolRiskChanges.length > 0) {
    lines.push(`${BOLD}Tool Risk Changes${RESET}`);
    for (const c of diff.toolRiskChanges) {
      const color = colorFor(c.direction);
      const label = labelFor(c.direction);
      lines.push(`  ${color}[${label}]${RESET} ${c.toolName}: ${c.oldRisk} → ${c.newRisk}`);
    }
    lines.push('');
  }

  // Policy changes
  if (diff.policyChanges.length > 0) {
    lines.push(`${BOLD}Policy Changes${RESET}`);
    for (const c of diff.policyChanges) {
      const color = colorFor(c.direction);
      const label = labelFor(c.direction);
      const verb = c.action === 'added' ? '+' : '-';
      lines.push(
        `  ${color}[${label}]${RESET} ${verb} ${c.ruleId} (${c.mechanism} → ${c.target})`,
      );
    }
    lines.push('');
  }

  // Violation changes
  if (diff.violationChanges.length > 0) {
    lines.push(`${BOLD}Violation Changes${RESET}`);
    for (const c of diff.violationChanges) {
      const color = colorFor(c.direction);
      const label = labelFor(c.direction);
      const verb = c.action === 'new' ? 'NEW' : 'RESOLVED';
      lines.push(
        `  ${color}[${label}]${RESET} ${verb}: ${c.ruleId} on ${c.target} — ${c.message}`,
      );
    }
    lines.push('');
  }

  // Trust tier shifts
  if (diff.trustTierShifts.length > 0) {
    lines.push(`${BOLD}Trust Tier Shifts${RESET}`);
    for (const c of diff.trustTierShifts) {
      const color = colorFor(c.direction);
      const label = labelFor(c.direction);
      lines.push(
        `  ${color}[${label}]${RESET} ${c.toolName}.${c.field}: ${c.oldValue} → ${c.newValue}`,
      );
    }
    lines.push('');
  }

  // Summary
  lines.push(`${BOLD}Summary${RESET}`);
  lines.push(`  Total changes: ${diff.summary.totalChanges}`);
  if (diff.summary.regressions > 0) {
    lines.push(`  ${RED}Regressions:  ${diff.summary.regressions}${RESET}`);
  }
  if (diff.summary.improvements > 0) {
    lines.push(`  ${GREEN}Improvements: ${diff.summary.improvements}${RESET}`);
  }
  if (diff.summary.neutral > 0) {
    lines.push(`  ${YELLOW}Neutral:      ${diff.summary.neutral}${RESET}`);
  }

  return lines;
}

/**
 * Render a SnapshotDiff as a plain JSON object (no ANSI, for --json output).
 */
export function renderDiffJson(diff: SnapshotDiff): object {
  return {
    status: 'ok',
    baseName: diff.baseName,
    targetName: diff.targetName,
    baseTimestamp: diff.baseTimestamp,
    targetTimestamp: diff.targetTimestamp,
    empty: diff.empty,
    toolRiskChanges: diff.toolRiskChanges,
    policyChanges: diff.policyChanges,
    violationChanges: diff.violationChanges,
    trustTierShifts: diff.trustTierShifts,
    summary: diff.summary,
  };
}
