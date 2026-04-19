/**
 * @bic/openclaw-guardrails/siem — Format-dispatching emitters.
 */

import type { AuditEntry } from '../audit/types.js';
import type { EmitFormat } from './types.js';
import { toCef, toNdjson, toSyslog, type SyslogOpts } from './formats.js';

/** Serialize a single AuditEntry in the requested format. */
export function emit(entry: AuditEntry, format: EmitFormat, opts?: SyslogOpts): string {
  switch (format) {
    case 'cef':
      return toCef(entry);
    case 'ndjson':
      return toNdjson(entry);
    case 'syslog':
      return toSyslog(entry, opts);
    /* c8 ignore start */
    default: {
      const exhaustive: never = format;
      throw new Error(`Unknown emit format: ${exhaustive}`);
    }
    /* c8 ignore stop */
  }
}

/** Serialize a batch of AuditEntry values, joined by `\n`. */
export function emitBatch(
  entries: readonly AuditEntry[],
  format: EmitFormat,
  opts?: SyslogOpts,
): string {
  const lines: string[] = [];
  for (const e of entries) lines.push(emit(e, format, opts));
  return lines.join('\n');
}
