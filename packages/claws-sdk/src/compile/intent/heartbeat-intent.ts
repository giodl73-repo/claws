/**
 * HEARTBEAT.md intent extraction — schedule and risk derivation.
 *
 * Extracts lifecycle schedules and derives risk levels from the
 * actions described in each schedule section.
 *
 * @module claws-sdk/compile/intent/heartbeat-intent
 */

import type {
  FileEntryPresent,
  ScheduleIntent,
  ToolRiskClass,
  IntentResult,
} from '../types.js';

/**
 * Parse a section heading into a trigger identifier.
 *
 * "On Start" -> "on_start"
 * "Every 5 Minutes" -> "every_5m"
 * "On Shutdown" -> "on_shutdown"
 */
function parseTrigger(heading: string): string {
  const lower = heading.toLowerCase().trim();

  // "every N minutes/hours"
  const everyMatch = /^every\s+(\d+)\s*(minute|min|hour|hr|second|sec)s?$/i.exec(lower);
  if (everyMatch) {
    const n = everyMatch[1]!;
    const unit = everyMatch[2]!.charAt(0);
    return `every_${n}${unit}`;
  }

  // "on X" -> "on_x"
  return lower.replace(/\s+/g, '_');
}

/**
 * Derive risk level from action descriptions.
 */
function deriveRiskLevel(actions: readonly string[]): ToolRiskClass {
  const combined = actions.join(' ').toLowerCase();

  if (/\b(production\s+write|deploy|delete\s+prod|modify\s+prod)\b/.test(combined)) return 5;
  if (/\b(production\s+read|monitor\s+prod|read\s+prod)\b/.test(combined)) return 4;
  if (/\b(api|external|http|webhook|email|send)\b/.test(combined)) return 3;
  if (/\b(file|write|flush|log|audit)\b/.test(combined)) return 2;
  return 1;
}

/**
 * Extract schedule intents from a HEARTBEAT.md file entry.
 *
 * Parses ## headings as schedule triggers. List items below are actions.
 */
export function extractHeartbeatIntents(entry: FileEntryPresent): IntentResult<ScheduleIntent> {
  const intents: ScheduleIntent[] = [];
  const lines = entry.content.split('\n');

  let currentTrigger: string | undefined;
  let currentActions: string[] = [];
  let currentLine = 0;

  function flushSchedule(): void {
    if (currentTrigger !== undefined && currentActions.length > 0) {
      intents.push({
        trigger: currentTrigger,
        actions: currentActions,
        riskLevel: deriveRiskLevel(currentActions),
        line: currentLine,
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    const h2Match = /^##\s+(\S[^\n]*)$/.exec(trimmed);
    if (h2Match) {
      flushSchedule();
      currentTrigger = parseTrigger(h2Match[1]!);
      currentActions = [];
      currentLine = i + 1;
      continue;
    }

    if (trimmed.startsWith('# ')) continue;

    // List items are actions
    const listMatch = /^[-*+]\s+(\S[^\n]*)$/.exec(trimmed);
    if (listMatch && currentTrigger !== undefined) {
      currentActions.push(listMatch[1]!.trim());
    }
  }

  flushSchedule();

  return {
    source: entry.source,
    intents,
    diagnostics: [],
  };
}
