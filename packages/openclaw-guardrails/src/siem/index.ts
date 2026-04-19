/**
 * @bic/openclaw-guardrails/siem
 *
 * CEF / NDJSON / RFC 5424 syslog event formatters for AuditEntry.
 * Canonical per-entry serializers for the whole guardrails family: `/audit`
 * batch exporters delegate here rather than emit a second CEF dialect.
 *
 * Per guardrails.md §/siem.
 */

export type { AuditEntry, EmitFormat, SyslogOpts } from './types.js';

export { toCef, toNdjson, toSyslog } from './formats.js';

export { emit, emitBatch } from './emitter.js';
