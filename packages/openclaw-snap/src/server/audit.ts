/**
 * @bic/openclaw-snap/server/audit — AuditEvent shape for promote/rollback.
 *
 * Emits minimal AuditEvent objects (per `@bic/openclaw-guardrails/audit`
 * schema) to a user-provided sink. Snap does NOT maintain an audit chain
 * itself; the host wires a chain store that accepts these events.
 *
 * @module @bic/openclaw-snap/server/audit
 */

import type { AuditEvent } from '@bic/openclaw-guardrails/audit';

export type AuditSink = (event: AuditEvent) => void | Promise<void>;

export interface PromoteAuditInput {
  readonly snapshotId: string;
  readonly principal: string;
  readonly tenant?: string;
  readonly timestamp: string;
  readonly priorId?: string;
  readonly bypassed?: boolean;
  readonly authFreshnessSeconds?: number;
}

function buildId(): string {
  return `evt-${String(Date.now())}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildPromoteEvent(input: PromoteAuditInput): AuditEvent {
  const reasonParts: string[] = [];
  if (input.priorId !== undefined) reasonParts.push(`prior=${input.priorId}`);
  if (input.bypassed === true) reasonParts.push('policy=bypassed');
  if (input.authFreshnessSeconds !== undefined) {
    reasonParts.push(`authFreshness=${String(input.authFreshnessSeconds)}s`);
  }
  const base: AuditEvent = {
    id: buildId(),
    timestamp: input.timestamp,
    source: 'snap',
    action: 'snapshot_promote',
    target: input.snapshotId,
    scope: input.tenant ?? 'default',
    outcome: 'success',
    hash: '',
    previousHash: '',
  };
  if (input.principal !== '') (base as { actor?: string }).actor = input.principal;
  if (reasonParts.length > 0) (base as { reason?: string }).reason = reasonParts.join(';');
  return base;
}

export function buildRollbackEvent(input: PromoteAuditInput): AuditEvent {
  const base = buildPromoteEvent(input);
  return { ...base, action: 'snapshot_rollback' };
}
