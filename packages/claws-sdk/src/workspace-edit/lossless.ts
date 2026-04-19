/**
 * Format-preserving write engine for OC markdown files.
 *
 * Parses a file into line-level regions anchored on H2 sections, applies
 * the edit to the targeted region only, and serialises the result back
 * preserving BOM, line endings, trailing whitespace, comments, blank lines,
 * and indentation in every non-targeted region byte-for-byte.
 *
 * The writer never reformats, re-indents, or re-wraps content. Line
 * endings (LF vs CRLF) are detected from the input and reused on any
 * lines the edit inserts.
 *
 * @module claws-sdk/workspace-edit/lossless
 */

import type { EditOperation } from './types.js';
import { EditTargetError } from './types.js';

interface Region {
  /** H2 heading for this region, or null for the preamble region. */
  readonly heading: string | null;
  /** Lines inside the region INCLUDING the heading line (if any). */
  readonly lines: string[];
}

interface ParsedFile {
  /** Byte-order mark, preserved verbatim (empty string if none). */
  readonly bom: string;
  /** Line-ending string used by this file (`\r\n` or `\n`). */
  readonly eol: string;
  /** True when the original file ended with a trailing line break. */
  readonly trailingEol: boolean;
  readonly regions: Region[];
}

const BOM = '\uFEFF';

/**
 * Detect the dominant line ending in `raw`. Defaults to `\n` when the file
 * contains no line endings.
 */
function detectEol(raw: string): string {
  const stripped = raw.startsWith(BOM) ? raw.slice(1) : raw;
  if (stripped.includes('\r\n')) return '\r\n';
  return '\n';
}

function parse(raw: string): ParsedFile {
  const hasBom = raw.startsWith(BOM);
  const bom = hasBom ? BOM : '';
  const body = hasBom ? raw.slice(1) : raw;
  const eol = detectEol(raw);
  const trailingEol = body.endsWith('\n');

  const normalised = body.replace(/\r\n/g, '\n');
  const trimmedForSplit = trailingEol ? normalised.slice(0, -1) : normalised;
  const lines = trimmedForSplit.length === 0 ? [] : trimmedForSplit.split('\n');

  const regions: Region[] = [];
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      regions.push({ heading: current.heading, lines: current.lines });
      current = { heading: line.slice(3).trim(), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  regions.push({ heading: current.heading, lines: current.lines });

  return { bom, eol, trailingEol, regions };
}

function serialise(parsed: ParsedFile): string {
  const allLines: string[] = [];
  for (const region of parsed.regions) {
    for (const line of region.lines) allLines.push(line);
  }
  const joined = allLines.join(parsed.eol);
  const withTrailing = parsed.trailingEol ? joined + parsed.eol : joined;
  return parsed.bom + withTrailing;
}

function findRegion(parsed: ParsedFile, heading: string): Region {
  const region = parsed.regions.find((r) => r.heading === heading);
  if (!region) {
    throw new EditTargetError(
      `Section "## ${heading}" not found`,
      'EDIT_SECTION_NOT_FOUND',
    );
  }
  return region;
}

/**
 * Locate the index of a `- Field: value` line within a region.
 * Case-insensitive match on the field name.
 */
function findFieldLineIndex(region: Region, field: string): number {
  const lowerField = field.toLowerCase();
  for (let i = 0; i < region.lines.length; i++) {
    const line = region.lines[i]!;
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('- ')) continue;
    const rest = trimmed.slice(2);
    const colonIdx = rest.indexOf(':');
    if (colonIdx === -1) continue;
    const key = rest.slice(0, colonIdx).trim().toLowerCase();
    if (key === lowerField) return i;
  }
  return -1;
}

/**
 * Rewrite a `- Field: value` line, preserving the original indentation and
 * the original key casing. Only the value segment is replaced.
 */
function rewriteFieldLine(existing: string, newValue: string): string {
  const indentLen = existing.length - existing.trimStart().length;
  const indent = existing.slice(0, indentLen);
  const trimmed = existing.trimStart();
  const rest = trimmed.slice(2);
  const colonIdx = rest.indexOf(':');
  const key = rest.slice(0, colonIdx);
  return `${indent}- ${key}: ${newValue}`;
}

/**
 * Find the insertion index for a new list item (append to the end of the
 * trailing `- ` block in the region). If the region contains no list items,
 * insert after the last non-blank content line.
 */
function findAppendIndex(region: Region): number {
  let lastListIdx = -1;
  for (let i = 0; i < region.lines.length; i++) {
    const trimmed = region.lines[i]!.trimStart();
    if (trimmed.startsWith('- ')) lastListIdx = i;
  }
  if (lastListIdx !== -1) return lastListIdx + 1;

  for (let i = region.lines.length - 1; i >= 0; i--) {
    if (region.lines[i]!.trim().length > 0) return i + 1;
  }
  return region.lines.length;
}

function findListItemIndex(region: Region, item: string): number {
  const target = item.trim();
  for (let i = 0; i < region.lines.length; i++) {
    const line = region.lines[i]!;
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('- ')) continue;
    if (trimmed.slice(2).trim() === target) return i;
  }
  return -1;
}

function booleanToYesNo(value: boolean): string {
  return value ? 'true' : 'false';
}

/**
 * Apply an edit operation to `raw` and return the new file contents.
 *
 * Byte-for-byte preservation guarantee: regions that do not carry the
 * target heading are copied verbatim. The targeted region is rewritten
 * line-by-line with only the changed line modified — all surrounding
 * blank lines, comments, and indentation inside the region are kept.
 */
export function applyLossless(raw: string, op: EditOperation): string {
  const parsed = parse(raw);
  const region = findRegion(parsed, op.section);

  switch (op.kind) {
    case 'toggle': {
      const idx = findFieldLineIndex(region, op.field);
      if (idx === -1) {
        throw new EditTargetError(
          `Field "${op.field}" not found in section "## ${op.section}"`,
          'EDIT_FIELD_NOT_FOUND',
        );
      }
      region.lines[idx] = rewriteFieldLine(region.lines[idx]!, booleanToYesNo(op.value));
      break;
    }
    case 'set': {
      const idx = findFieldLineIndex(region, op.field);
      if (idx === -1) {
        throw new EditTargetError(
          `Field "${op.field}" not found in section "## ${op.section}"`,
          'EDIT_FIELD_NOT_FOUND',
        );
      }
      region.lines[idx] = rewriteFieldLine(region.lines[idx]!, op.value);
      break;
    }
    case 'append': {
      const insertAt = findAppendIndex(region);
      region.lines.splice(insertAt, 0, `- ${op.item}`);
      break;
    }
    case 'remove': {
      const idx = findListItemIndex(region, op.item);
      if (idx === -1) {
        throw new EditTargetError(
          `List item "${op.item}" not found in section "## ${op.section}"`,
          'EDIT_ITEM_NOT_FOUND',
        );
      }
      region.lines.splice(idx, 1);
      break;
    }
  }

  return serialise(parsed);
}

/**
 * Produce an in-memory preview without touching disk.
 *
 * Returns the `after` string plus a per-line diff of changed indices.
 * Unchanged regions are not reported.
 */
export function previewLossless(raw: string, op: EditOperation): {
  before: string;
  after: string;
  changedLines: Array<{ line: number; from: string; to: string }>;
} {
  const after = applyLossless(raw, op);
  const beforeLines = raw.split(/\r\n|\n/);
  const afterLines = after.split(/\r\n|\n/);
  const changedLines: Array<{ line: number; from: string; to: string }> = [];
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i++) {
    const b = beforeLines[i] ?? '';
    const a = afterLines[i] ?? '';
    if (b !== a) changedLines.push({ line: i + 1, from: b, to: a });
  }
  return { before: raw, after, changedLines };
}
