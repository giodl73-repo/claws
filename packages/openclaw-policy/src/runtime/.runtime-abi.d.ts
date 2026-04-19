// @bic/openclaw-policy/runtime — LOCKED ABI SNAPSHOT
//
// Do not hand-edit outside of a deliberate version-bump commit. This file is
// the ground truth that the runtime ABI drift test (L1) compares against.
// Any change requires a `PolicyIR.version` or package major-version bump AND
// a corresponding entry in the package CHANGELOG.
//
// Locked at: 2026-04-18 (pulse 51)
// Policy spec: docs/claws/proposals/openclaw-upstream/policy.md §Waffles
//
// Signatures (normative):
//   asHookResult(decision: Decision): HookResult
//   issueHandle(ctx: HostContext, event: Event): Promise<string>
//   propagatedSensitivity(
//     provenance: Record<string, ProvenanceSource[]> | undefined,
//     ir: PolicyIR,
//   ): Sensitivity
//   matchDenyRules(event: Event, rules: DenyRule[]): DenyRule | null

import type {
  DenyRule,
  PolicyIR,
  ProvenanceSource,
  Sensitivity,
} from '../types/index.js';

export type Decision =
  | { decision: 'allow'; riskLevel?: number; requiresExternalApproval?: boolean }
  | { decision: 'deny'; reason: string }
  | { decision: 'review'; reason: string; approvalHandle: string };

export interface HookResult {
  status: 'allow' | 'deny' | 'review';
  reason?: string;
  approvalHandle?: string;
  riskLevel?: number;
  requiresExternalApproval?: boolean;
}

export interface HostContext {
  auditSink: { append(event: Record<string, unknown>): void | Promise<void> };
  approvals: { issue(subject: string, context: Record<string, unknown>): Promise<string> };
}

export interface Event {
  toolName?: string;
  path?: string;
  args?: Record<string, unknown>;
  provenance?: Record<string, ProvenanceSource[]>;
}

export declare function asHookResult(decision: Decision): HookResult;
export declare function issueHandle(ctx: HostContext, event: Event): Promise<string>;
export declare function propagatedSensitivity(
  provenance: Record<string, ProvenanceSource[]> | undefined,
  ir: PolicyIR,
): Sensitivity;
export declare function matchDenyRules(event: Event, rules: DenyRule[]): DenyRule | null;
