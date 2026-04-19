/**
 * @bic/openclaw-guardrails/siem — Core types.
 *
 * Input to every `/siem` formatter is an `AuditEntry` from `/audit`. There is
 * no independent SIEM event shape: one source of truth, one CEF dialect.
 */

export type { AuditEntry } from '../audit/types.js';
export type { SyslogOpts } from './formats.js';

/** Supported SIEM emission formats. */
export type EmitFormat = 'cef' | 'ndjson' | 'syslog';
