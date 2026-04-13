/**
 * MEMORY.md intent extraction — data labels and retention.
 *
 * Extracts memory entries with sensitivity classification and
 * retention hints from MEMORY.md content.
 *
 * @module claws-sdk/compile/intent/memory-intent
 */

import type {
  FileEntryPresent,
  MemoryIntent,
  DataSensitivity,
  IntentResult,
} from '../types.js';

/**
 * Infer data sensitivity from memory entry content.
 */
function inferSensitivity(text: string): DataSensitivity {
  const lower = text.toLowerCase();

  if (/\b(secret|credential|password|private\s+key|token)\b/.test(lower)) return 'restricted';
  if (/\b(confidential|pii|personal|customer\s+data|ssn)\b/.test(lower)) return 'confidential';
  if (/\b(internal|incident|policy|security|compliance)\b/.test(lower)) return 'internal';
  return 'public';
}

/**
 * Infer retention hint from memory entry content.
 */
function inferRetention(text: string): string {
  const lower = text.toLowerCase();

  if (/\b(permanent|forever|never\s+delete)\b/.test(lower)) return 'permanent';
  if (/\b(session|temporary|ephemeral)\b/.test(lower)) return 'session';

  // Check for date-based retention
  const dateMatch = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text);
  if (dateMatch) return 'dated';

  return 'indefinite';
}

/**
 * Extract memory intents from a MEMORY.md file entry.
 *
 * Parses ## headings as memory entry labels. Body text is analyzed
 * for sensitivity classification and retention hints.
 */
export function extractMemoryIntents(entry: FileEntryPresent): IntentResult<MemoryIntent> {
  const intents: MemoryIntent[] = [];
  const lines = entry.content.split('\n');

  let currentLabel: string | undefined;
  let currentContent: string[] = [];
  let currentLine = 0;

  function flushEntry(): void {
    if (currentLabel !== undefined) {
      const text = currentContent.join(' ').trim();
      intents.push({
        label: currentLabel,
        sensitivity: inferSensitivity(text),
        retention: inferRetention(text),
        line: currentLine,
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    const h2Match = /^##\s+(\S[^\n]*)$/.exec(trimmed);
    if (h2Match) {
      flushEntry();
      currentLabel = h2Match[1]!.trim();
      currentContent = [];
      currentLine = i + 1;
      continue;
    }

    if (trimmed.startsWith('# ')) continue;

    if (currentLabel !== undefined && trimmed.length > 0) {
      currentContent.push(trimmed);
    }
  }

  flushEntry();

  return {
    source: entry.source,
    intents,
    diagnostics: [],
  };
}
