/**
 * @bic/openclaw-policy/runtime — ABI consumed by emitted gateway plugins.
 *
 * The four functions here form the locked runtime contract (gateway-eng M3).
 * Any signature drift requires a major-version bump; the `.runtime-abi.d.ts`
 * snapshot (captured alongside this file) is what CI compares against.
 *
 * Signatures match the Waffles example in `docs/claws/proposals/openclaw-upstream/policy.md`.
 *
 * @module @bic/openclaw-policy/runtime
 */

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

/** Lock-point #1 — coerce a Decision into the HookResult shape OC expects. */
export function asHookResult(decision: Decision): HookResult {
  if (decision.decision === 'allow') {
    const result: HookResult = { status: 'allow' };
    if (decision.riskLevel !== undefined) result.riskLevel = decision.riskLevel;
    if (decision.requiresExternalApproval !== undefined) {
      result.requiresExternalApproval = decision.requiresExternalApproval;
    }
    return result;
  }
  if (decision.decision === 'deny') {
    return { status: 'deny', reason: decision.reason };
  }
  return {
    status: 'review',
    reason: decision.reason,
    approvalHandle: decision.approvalHandle,
  };
}

/** Lock-point #2 — bind an approval handle for a review decision. */
export async function issueHandle(ctx: HostContext, event: Event): Promise<string> {
  const subject = event.toolName ?? event.path ?? 'unknown';
  return ctx.approvals.issue(subject, { event });
}

/** Lock-point #3 — derive the effective sensitivity of a call's inputs. */
export function propagatedSensitivity(
  provenance: Record<string, ProvenanceSource[]> | undefined,
  ir: PolicyIR,
): Sensitivity {
  if (!provenance) return 'PUBLIC';
  const order: Sensitivity[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];
  let highest: Sensitivity = 'PUBLIC';
  for (const sources of Object.values(provenance)) {
    for (const src of sources) {
      const s = sourceSensitivity(src, ir);
      if (order.indexOf(s) > order.indexOf(highest)) highest = s;
    }
  }
  return highest;
}

/** Lock-point #4 — match an event against SOUL.md-derived deny rules. */
export function matchDenyRules(event: Event, rules: DenyRule[]): DenyRule | null {
  const hay = [event.toolName, event.path, JSON.stringify(event.args ?? {})]
    .filter(Boolean)
    .join(' ');
  for (const rule of rules) {
    const re = patternToRegex(rule.pattern);
    if (re.test(hay)) return rule;
  }
  return null;
}

function sourceSensitivity(src: ProvenanceSource, ir: PolicyIR): Sensitivity {
  if (src === 'user_prompt' || src === 'agent_literal') return 'PUBLIC';
  if (typeof src === 'object' && 'memory' in src) return src.memory;
  if (typeof src === 'object' && 'tool_output' in src) {
    const tool = ir.tools.find((t) => t.name === src.tool_output);
    if (!tool) return 'PUBLIC';
    return tool.riskLevel >= 4 ? 'CONFIDENTIAL' : 'INTERNAL';
  }
  return 'PUBLIC';
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(escaped, 'i');
}
