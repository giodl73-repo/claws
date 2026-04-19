/**
 * Multi-format audit chain export — CEF, JSON, syslog.
 *
 * Provides three output formats for SIEM integration and log aggregation:
 * - **CEF** (Common Event Format): ArcSight-compatible event strings
 * - **JSON**: Parseable JSON array for programmatic consumption
 * - **Syslog** (RFC 5424): Structured data for traditional log aggregation
 *
 * All formats apply consistent PII redaction before output. The streaming
 * export mode handles chains with >10K entries without loading the full
 * chain into memory, using a generator-based approach that processes
 * entries in batches.
 *
 * @module claws-sdk/audit/export
 */

import { canonicalJson } from '../util/canonical-json.js';
import type { ChainEntry, RedactionOptions, StreamExportOptions } from './types.js';

/**
 * Evidence format version stamped on every evidence package.
 * Incremented when the output schema changes for forward compatibility.
 */
export const EVIDENCE_FORMAT_VERSION = '1.1.0';

// ---------------------------------------------------------------------------
// RFC 8785 Canonical JSON
// ---------------------------------------------------------------------------

/**
 * Export chain entries in RFC 8785 canonical JSON (JCS).
 *
 * Produces deterministic output:
 * - Keys sorted lexicographically at all nesting levels
 * - Numeric values normalized (no trailing zeros, no leading zeros)
 * - No trailing whitespace or BOM
 * - LF line endings only (no CRLF)
 *
 * Each entry is individually canonicalized, then the array is formed
 * with deterministic formatting.
 *
 * @param entries - Chain entries to export.
 * @param redaction - Optional PII redaction settings.
 * @returns RFC 8785 canonical JSON string.
 */
export function exportCanonicalJson(
  entries: readonly ChainEntry[],
  redaction?: RedactionOptions,
): string {
  const redacted = entries.map((e) => redactEntry(e, redaction));
  // Canonicalize each entry individually, then form a canonical array
  // RFC 8785 mandates no whitespace outside of string values
  const canonicalEntries = redacted.map((e) => canonicalJson(e as unknown as Record<string, unknown>));
  return '[' + canonicalEntries.join(',') + ']';
}

// ---------------------------------------------------------------------------
// Line-ending normalization
// ---------------------------------------------------------------------------

/**
 * Normalize line endings in exported content.
 *
 * Converts all CRLF (\r\n) and bare CR (\r) sequences to LF (\n).
 * Strips any trailing whitespace from each line.
 * Removes byte-order marks (BOM).
 *
 * This ensures consistent output across Windows, macOS, and Linux for
 * reproducible serialization of evidence packages.
 */
export function normalizeLineEndings(content: string): string {
  return content
    .replace(/\uFEFF/g, '')     // Remove BOM
    .replace(/\r\n/g, '\n')     // CRLF → LF
    .replace(/\r/g, '\n')       // Bare CR → LF
    .replace(/[ \t]+$/gm, '');  // Strip trailing whitespace per line
}

// ---------------------------------------------------------------------------
// PII Redaction
// ---------------------------------------------------------------------------

/**
 * Apply PII redaction to a chain entry.
 * Returns a shallow copy with redacted field values.
 */
function redactEntry(
  entry: ChainEntry,
  redaction?: RedactionOptions,
): ChainEntry {
  if (!redaction || redaction.redactFields.length === 0) {
    return entry;
  }
  const replacement = redaction.replacement ?? '[REDACTED]';
  const redacted: Record<string, unknown> = { ...entry };
  for (const field of redaction.redactFields) {
    if (field in redacted) {
      redacted[field] = replacement;
    }
  }
  return redacted as unknown as ChainEntry;
}

// ---------------------------------------------------------------------------
// CEF (Common Event Format)
// ---------------------------------------------------------------------------

/**
 * Severity mapping: claws severity 1-5 → CEF severity 0-10.
 * CEF uses 0-10 scale; we map linearly: 1→2, 2→4, 3→6, 4→8, 5→10.
 */
function mapCefSeverity(severity: number): number {
  return Math.min(severity * 2, 10);
}

/**
 * Escape special characters in CEF values.
 * CEF requires escaping backslash, pipe in header fields and
 * backslash, equals, newlines in extension fields.
 */
function escapeCefHeader(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function escapeCefExtension(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/=/g, '\\=')
    .replace(/\n/g, '\\n');
}

/**
 * Format a chain entry as a CEF string.
 *
 * CEF format:
 * CEF:0|Vendor|Product|Version|SignatureID|Name|Severity|Extensions
 */
function formatCef(entry: ChainEntry): string {
  const vendor = escapeCefHeader('claws');
  const product = escapeCefHeader('audit-chain');
  const version = escapeCefHeader('1.0');
  const signatureId = escapeCefHeader(entry.ruleId);
  const name = escapeCefHeader(`${entry.eventType}: ${entry.action}`);
  const severity = mapCefSeverity(entry.severity);

  const extensions = [
    `rt=${escapeCefExtension(entry.timestamp)}`,
    `src=${escapeCefExtension(entry.actor)}`,
    `dst=${escapeCefExtension(entry.target)}`,
    `act=${escapeCefExtension(entry.action)}`,
    `outcome=${escapeCefExtension(entry.outcome)}`,
    `cs1=${escapeCefExtension(entry.hash)}`,
    `cs1Label=chainHash`,
    `cn1=${entry.seq}`,
    `cn1Label=chainSeq`,
    `cs2=${escapeCefExtension(entry.policyVersion)}`,
    `cs2Label=policyVersion`,
  ].join(' ');

  return `CEF:0|${vendor}|${product}|${version}|${signatureId}|${name}|${severity}|${extensions}`;
}

/**
 * Export chain entries in ArcSight Common Event Format.
 *
 * @param entries - Chain entries to export.
 * @param redaction - Optional PII redaction settings.
 * @returns Newline-separated CEF strings.
 */
export function exportCef(
  entries: readonly ChainEntry[],
  redaction?: RedactionOptions,
): string {
  return entries
    .map((e) => formatCef(redactEntry(e, redaction)))
    .join('\n');
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/**
 * Export chain entries as a JSON array string.
 *
 * @param entries - Chain entries to export.
 * @param redaction - Optional PII redaction settings.
 * @returns Valid JSON array string.
 */
export function exportJson(
  entries: readonly ChainEntry[],
  redaction?: RedactionOptions,
): string {
  const redacted = entries.map((e) => redactEntry(e, redaction));
  return JSON.stringify(redacted, null, 2);
}

// ---------------------------------------------------------------------------
// Syslog (RFC 5424)
// ---------------------------------------------------------------------------

/**
 * Map severity 1-5 to RFC 5424 severity (0=Emergency .. 7=Debug).
 * claws 5→2 (Critical), 4→3 (Error), 3→4 (Warning), 2→5 (Notice), 1→6 (Informational).
 */
function mapSyslogSeverity(severity: number): number {
  const mapping: Record<number, number> = { 5: 2, 4: 3, 3: 4, 2: 5, 1: 6 };
  return mapping[severity] ?? 6;
}

/**
 * Escape structured data values per RFC 5424 (escape \, ], ").
 */
function escapeSdValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\]/g, '\\]');
}

/**
 * Format a chain entry as an RFC 5424 syslog message.
 *
 * Format: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID [SD-ID SD-PARAMS] MSG
 * PRI = facility * 8 + severity. We use facility 10 (security/authorization).
 */
function formatSyslog(entry: ChainEntry): string {
  const facility = 10; // security/authorization messages
  const severity = mapSyslogSeverity(entry.severity);
  const pri = facility * 8 + severity;

  const timestamp = entry.timestamp;
  const hostname = '-';
  const appName = 'claws';
  const procId = '-';
  const msgId = entry.ruleId;

  const sd = [
    `[audit@claws`,
    ` actor="${escapeSdValue(entry.actor)}"`,
    ` target="${escapeSdValue(entry.target)}"`,
    ` action="${escapeSdValue(entry.action)}"`,
    ` outcome="${escapeSdValue(entry.outcome)}"`,
    ` eventType="${escapeSdValue(entry.eventType)}"`,
    ` chainHash="${escapeSdValue(entry.hash)}"`,
    ` chainSeq="${entry.seq}"`,
    ` policyVersion="${escapeSdValue(entry.policyVersion)}"`,
    `]`,
  ].join('');

  const msg = `${entry.eventType}: ${entry.action} on ${entry.target} by ${entry.actor} -> ${entry.outcome}`;

  return `<${pri}>1 ${timestamp} ${hostname} ${appName} ${procId} ${msgId} ${sd} ${msg}`;
}

/**
 * Export chain entries in RFC 5424 syslog format.
 *
 * @param entries - Chain entries to export.
 * @param redaction - Optional PII redaction settings.
 * @returns Newline-separated syslog messages.
 */
export function exportSyslog(
  entries: readonly ChainEntry[],
  redaction?: RedactionOptions,
): string {
  return entries
    .map((e) => formatSyslog(redactEntry(e, redaction)))
    .join('\n');
}

// ---------------------------------------------------------------------------
// Multi-format dispatch
// ---------------------------------------------------------------------------

/**
 * Export chain entries in the specified format.
 *
 * @param entries - Chain entries to export.
 * @param format - Target format ('cef', 'json', 'syslog').
 * @param redaction - Optional PII redaction settings.
 * @returns Formatted string.
 */
export function exportChain(
  entries: readonly ChainEntry[],
  format: 'cef' | 'json' | 'syslog',
  redaction?: RedactionOptions,
): string {
  switch (format) {
    case 'cef':
      return exportCef(entries, redaction);
    case 'json':
      return exportJson(entries, redaction);
    case 'syslog':
      return exportSyslog(entries, redaction);
  }
}

// ---------------------------------------------------------------------------
// Streaming export (generator-based for >10K entries)
// ---------------------------------------------------------------------------

/**
 * Streaming export generator for large audit chains.
 *
 * Processes entries in configurable batches (default: 500) and yields
 * formatted lines. This avoids loading the full formatted output into
 * memory for chains with >10K entries.
 *
 * For JSON format, yields the opening bracket, then comma-separated
 * entries, then the closing bracket — producing a valid JSON array
 * when concatenated.
 *
 * @param entries - Iterable of chain entries (can be a generator).
 * @param options - Export options (format, redaction, batchSize).
 * @yields Formatted string chunks.
 */
export function* streamExport(
  entries: Iterable<ChainEntry>,
  options: StreamExportOptions,
): Generator<string, void, undefined> {
  const { format, redaction, batchSize = 500 } = options;

  if (format === 'json') {
    yield '[\n';
    let first = true;
    let batch: ChainEntry[] = [];

    for (const entry of entries) {
      batch.push(entry);
      if (batch.length >= batchSize) {
        for (const e of batch) {
          const redacted = redactEntry(e, redaction);
          const prefix = first ? '  ' : ',\n  ';
          yield prefix + JSON.stringify(redacted);
          first = false;
        }
        batch = [];
      }
    }
    // Flush remaining
    for (const e of batch) {
      const redacted = redactEntry(e, redaction);
      const prefix = first ? '  ' : ',\n  ';
      yield prefix + JSON.stringify(redacted);
      first = false;
    }
    yield '\n]';
    return;
  }

  // CEF and syslog: line-oriented, straightforward batching
  const formatFn = format === 'cef' ? formatCef : formatSyslog;
  let batch: ChainEntry[] = [];
  let isFirstBatch = true;

  for (const entry of entries) {
    batch.push(entry);
    if (batch.length >= batchSize) {
      const lines = batch.map((e) => formatFn(redactEntry(e, redaction))).join('\n');
      yield isFirstBatch ? lines : '\n' + lines;
      isFirstBatch = false;
      batch = [];
    }
  }
  // Flush remaining
  if (batch.length > 0) {
    const lines = batch.map((e) => formatFn(redactEntry(e, redaction))).join('\n');
    yield isFirstBatch ? lines : '\n' + lines;
  }
}
