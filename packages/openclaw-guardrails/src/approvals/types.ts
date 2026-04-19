/**
 * @bic/openclaw-guardrails/approvals — Core types (absorbed from the prior approval-events orphan).
 *
 * Standardized JSON schema for approval request/response events.
 *
 * `RiskLevel` is re-exported from the default export (guardrails.md §RiskLevel),
 * keeping the whole package on one 0..5 cardinality. R0 is the UNCLASSIFIED
 * sentinel; `RiskClassification` covers the 1..5 production range.
 */

import type { RiskLevel as RiskLevelBase } from '../types.js';

export type RiskLevel = RiskLevelBase;

export type RiskClassification =
  | { level: 1; capability: 'read' }
  | { level: 2; capability: 'write' }
  | { level: 3; capability: 'communicate' }
  | { level: 4; capability: 'execute' }
  | { level: 5; capability: 'transact' };

export interface ApprovalRequestEvent {
  schemaVersion: 1;
  type: 'approval_request';
  requestId: string;
  timestamp: string;
  toolCall: {
    server: string;
    tool: string;
    arguments?: Record<string, unknown>;
  };
  risk: RiskClassification & {
    reason: string;
  };
  governance: {
    provider: string;
    ruleId?: string;
    fleetPolicyApplied: boolean;
  };
  context: {
    conversationId: string;
    workspaceId?: string;
    agentId?: string;
  };
  extensions?: Record<string, unknown>;
}

export interface ApprovalResponseEvent {
  schemaVersion: 1;
  type: 'approval_response';
  requestId: string;
  timestamp: string;
  decision: {
    status: 'approved' | 'denied' | 'timeout';
    decidedBy: {
      type: 'user' | 'policy' | 'system';
      identity?: string;
    };
    reason?: string;
    durationMs?: number;
  };
  extensions?: Record<string, unknown>;
}

export interface ApprovalTimeoutPolicy {
  readonly defaultTtlSeconds: number;
  readonly onTimeout: 'deny' | 'escalate';
  readonly escalationTargets?: readonly string[];
}

export type Sensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

export interface GovernanceApprovalMetadata {
  readonly approvalHandle: string;
  readonly contentHash: string;
  readonly riskLevel?: RiskLevel;
  readonly sensitivity?: Sensitivity;
  readonly category?: 'tool_call' | 'file_ingest' | 'snapshot_promote' | 'policy_generate';
}
