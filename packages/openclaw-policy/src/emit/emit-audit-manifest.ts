/**
 * Emit audit-manifest.json — the event taxonomy the generated plugin will
 * emit at runtime. Maps to OC's exec-approval event categories (OC-5).
 */

import { canonicalize } from '../compile/canonicalize.js';
import type { PolicyIR } from '../types/index.js';

export interface AuditManifest {
  version: string;
  snapshotId: string;
  events: Array<{
    event: string;
    trigger: 'before_tool_call' | 'after_tool_call' | 'before_workspace_file_ingest' | 'after_workspace_file_ingest';
    severity: 'info' | 'warn' | 'error';
  }>;
}

export function emitAuditManifest(ir: PolicyIR, snapshotId: string): string {
  const manifest: AuditManifest = {
    version: ir.version,
    snapshotId,
    events: [
      { event: 'tool_call', trigger: 'after_tool_call', severity: 'info' },
      { event: 'tool_call_reviewed', trigger: 'before_tool_call', severity: 'warn' },
      { event: 'tool_call_denied', trigger: 'before_tool_call', severity: 'error' },
      { event: 'file_ingest', trigger: 'after_workspace_file_ingest', severity: 'info' },
      { event: 'file_ingest_denied', trigger: 'before_workspace_file_ingest', severity: 'error' },
    ],
  };
  return canonicalize(manifest);
}
