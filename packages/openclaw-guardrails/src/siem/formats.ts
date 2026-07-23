/**
 * @bic/openclaw-guardrails/siem — Per-format serializers taking AuditEntry.
 *
 * Single canonical CEF / NDJSON / RFC 5424 syslog dialect for the whole
 * guardrails family. CEF product is `guardrails-audit` so downstream SIEM
 * parsers see one product string for every guardrails-sourced event,
 * regardless of whether it was emitted through `/audit` batch export or
 * `/siem` per-entry formatting.
 */

import type { AuditEntry } from "../audit/types.js";

/** Syslog formatting options. */
export interface SyslogOpts {
  /** Hostname to embed in the RFC 5424 header. Defaults to '-'. */
  hostname?: string;
  /** App name. Defaults to 'openclaw-audit'. */
  appName?: string;
}

// ---------------------------------------------------------------------------
// CEF (ArcSight)
// ---------------------------------------------------------------------------

const OUTCOME_TO_CEF_SEVERITY: Record<AuditEntry["outcome"], number> = {
  success: 3,
  pending: 5,
  failed: 8,
};

function escapeHeader(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function escapeExtension(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/=/g, "\\=").replace(/\n/g, "\\n");
}

/** Canonical CEF serializer. Product: `guardrails-audit`. */
export function toCef(entry: AuditEntry): string {
  const severity = OUTCOME_TO_CEF_SEVERITY[entry.outcome];
  const header = [
    "CEF:0",
    escapeHeader("OpenClaw"),
    escapeHeader("guardrails-audit"),
    escapeHeader("0.1.0"),
    escapeHeader(entry.action),
    escapeHeader(`${entry.action} on ${entry.target}`),
    String(severity),
  ].join("|");

  const extensions: string[] = [
    `rt=${escapeExtension(entry.timestamp)}`,
    `src=${escapeExtension(entry.source)}`,
    `dst=${escapeExtension(entry.target)}`,
    `cs1=${escapeExtension(entry.scope)}`,
    `cs1Label=${escapeExtension("scope")}`,
    `outcome=${escapeExtension(entry.outcome)}`,
    `cs2=${escapeExtension(entry.hash)}`,
    `cs2Label=${escapeExtension("hash")}`,
    `cs3=${escapeExtension(entry.id)}`,
    `cs3Label=${escapeExtension("eventId")}`,
  ];

  if (entry.actor !== undefined) {
    extensions.push(`suser=${escapeExtension(entry.actor)}`);
  }
  if (entry.reason !== undefined) {
    extensions.push(`msg=${escapeExtension(entry.reason)}`);
  }

  return `${header} ${extensions.join(" ")}`;
}

// ---------------------------------------------------------------------------
// NDJSON
// ---------------------------------------------------------------------------

/** Canonical NDJSON serializer — one entry per line. */
export function toNdjson(entry: AuditEntry): string {
  return JSON.stringify(entry);
}

// ---------------------------------------------------------------------------
// Syslog (RFC 5424)
// ---------------------------------------------------------------------------

const OUTCOME_TO_SYSLOG_SEVERITY: Record<AuditEntry["outcome"], number> = {
  success: 6,
  pending: 4,
  failed: 3,
};

const SYSLOG_FACILITY = 10;

/** Canonical RFC 5424 syslog serializer. */
export function toSyslog(entry: AuditEntry, opts?: SyslogOpts): string {
  const severity = OUTCOME_TO_SYSLOG_SEVERITY[entry.outcome];
  const priority = SYSLOG_FACILITY * 8 + severity;
  const hostname = opts?.hostname ?? "-";
  const appName = opts?.appName ?? "openclaw-audit";
  const procId = "-";
  const msgId = entry.action;
  const sdParams = [
    `id="${entry.id}"`,
    `hash="${entry.hash}"`,
    `scope="${entry.scope}"`,
    `outcome="${entry.outcome}"`,
    `source="${entry.source}"`,
    `target="${entry.target}"`,
  ];
  if (entry.actor !== undefined) {
    sdParams.push(`actor="${entry.actor}"`);
  }
  const sd = `[audit@0 ${sdParams.join(" ")}]`;
  const msg = `${entry.action} on ${entry.target} by ${entry.actor ?? "system"}`;

  return `<${priority}>1 ${entry.timestamp} ${hostname} ${appName} ${procId} ${msgId} ${sd} ${msg}`;
}
