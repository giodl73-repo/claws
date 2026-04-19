/**
 * @bic/openclaw-guardrails/audit — Multi-format batch export.
 *
 * Per guardrails.md §/audit, `/audit` ships async-iterable exporters that
 * delegate to the canonical per-entry formatters in `/siem`. There is one
 * CEF dialect in the package; `/audit` does not re-implement it.
 */

import type { AuditEntry, ExportFormat } from './types.js';
import { toCef, toNdjson, toSyslog } from '../siem/formats.js';

/** Emit each entry as NDJSON (one JSON document per line). */
export async function* jsonlExport(
  iter: AsyncIterable<AuditEntry>,
): AsyncIterable<string> {
  for await (const entry of iter) {
    yield toNdjson(entry);
  }
}

/** Emit each entry as CEF (product = `guardrails-audit`). */
export async function* cefExport(
  iter: AsyncIterable<AuditEntry>,
): AsyncIterable<string> {
  for await (const entry of iter) {
    yield toCef(entry);
  }
}

/** Emit each entry as RFC 5424 syslog. */
export async function* syslogExport(
  iter: AsyncIterable<AuditEntry>,
): AsyncIterable<string> {
  for await (const entry of iter) {
    yield toSyslog(entry);
  }
}

/**
 * Collect a batch of entries into a single `\n`-separated string. Convenience
 * wrapper for callers that don't want to iterate themselves.
 */
export async function exportEvents(
  entries: readonly AuditEntry[],
  format: ExportFormat,
): Promise<string> {
  const lines: string[] = [];
  switch (format) {
    case 'cef':
      for (const e of entries) lines.push(toCef(e));
      break;
    case 'jsonl':
      for (const e of entries) lines.push(toNdjson(e));
      break;
    case 'syslog':
      for (const e of entries) lines.push(toSyslog(e));
      break;
    /* c8 ignore start */
    default: {
      const exhaustive: never = format;
      throw new Error(`Unknown export format: ${exhaustive}`);
    }
    /* c8 ignore stop */
  }
  return lines.join('\n');
}
