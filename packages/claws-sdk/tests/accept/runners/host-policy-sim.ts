/**
 * Host-policy-sim runner — mock host policy resolver + approval flow simulator.
 *
 * Loads policies from host-approval-policies.json and resolves
 * tool calls with specific→wildcard→global order, matching the
 * Aether PR #5067 resolution algorithm.
 *
 * Approval flow simulation: given a decision config, simulates
 * the full approval round-trip (request → decision → response)
 * without importing from openclaw-governance.
 *
 * Resolution order:
 * 1. Exact server + tool match
 * 2. Wildcard server (*) + tool match
 * 3. Global default: fail-closed (requires approval)
 *
 * @module claws-sdk/tests/accept/runners/host-policy-sim
 */

import type { HostApprovalPolicy, HostApprovalPoliciesDocument } from '../../../src/emit/host-approval-policy-types.js';

// ---------------------------------------------------------------------------
// Inline approval event types (mirrors @openclaw/approval-events schema v1)
// ---------------------------------------------------------------------------

/**
 * Simulated approval request event.
 * Mirrors ApprovalRequestEvent from @openclaw/approval-events without importing.
 */
export interface SimApprovalRequestEvent {
  readonly schemaVersion: 1;
  readonly type: 'approval_request';
  readonly requestId: string;
  readonly timestamp: string;
  readonly toolCall: {
    readonly server: string;
    readonly tool: string;
  };
  readonly risk: {
    readonly level: number;
    readonly reason: string;
  };
}

/**
 * Simulated approval response event.
 * Mirrors ApprovalResponseEvent from @openclaw/approval-events without importing.
 */
export interface SimApprovalResponseEvent {
  readonly schemaVersion: 1;
  readonly type: 'approval_response';
  readonly requestId: string;
  readonly timestamp: string;
  readonly decision: {
    readonly status: 'approved' | 'denied' | 'timeout';
    readonly decidedBy: {
      readonly type: 'user' | 'policy' | 'system';
    };
    readonly reason?: string;
    readonly durationMs?: number;
  };
}

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

/**
 * Configuration for approval flow simulation decisions.
 */
export interface ApprovalSimConfig {
  /** Map of "server:tool" or "*:tool" or "*:*" to decision. */
  readonly decisions: Map<string, 'approve' | 'deny' | 'timeout'>;
  /** Default decision when no config matches (default: 'approve'). */
  readonly defaultDecision?: 'approve' | 'deny' | 'timeout';
  /** Simulated timeout duration in ms (for timeout decisions). */
  readonly timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Approval result types
// ---------------------------------------------------------------------------

/** Result when the policy does not require approval. */
export interface ApprovalSkippedResult {
  readonly approved: true;
  readonly skipped: true;
  readonly reason: 'no-approval-required';
}

/** Result when the approval flow completes (approve or deny). */
export interface ApprovalDecisionResult {
  readonly approved: boolean;
  readonly skipped: false;
  readonly timedOut: false;
  readonly request: SimApprovalRequestEvent;
  readonly response: SimApprovalResponseEvent;
  readonly resolution: 'specific' | 'wildcard' | 'global-default';
}

/** Result when the approval request timed out. */
export interface ApprovalTimeoutResult {
  readonly approved: false;
  readonly skipped: false;
  readonly timedOut: true;
  readonly reason: 'timeout';
  readonly request: SimApprovalRequestEvent;
  readonly resolution: 'specific' | 'wildcard' | 'global-default';
}

export type ApprovalFlowResult =
  | ApprovalSkippedResult
  | ApprovalDecisionResult
  | ApprovalTimeoutResult;

// ---------------------------------------------------------------------------
// Policy resolution types
// ---------------------------------------------------------------------------

/**
 * Result of a policy resolution.
 */
export interface PolicyResolutionResult {
  /** The resolved policy. */
  readonly policy: HostApprovalPolicy;
  /** How the policy was resolved. */
  readonly resolution: 'specific' | 'wildcard' | 'global-default';
  /** Whether the tool call requires approval. */
  readonly requiresApproval: boolean;
}

/**
 * HostPolicySim — mock host policy resolver for acceptance tests.
 *
 * Implements the same resolution algorithm as Aether PR #5067:
 * specific server → wildcard (*) → global fail-closed default.
 */
export class HostPolicySim {
  private readonly specificIndex: Map<string, Map<string, HostApprovalPolicy>>;
  private readonly wildcardIndex: Map<string, HostApprovalPolicy>;
  private readonly decisionConfig: ApprovalSimConfig | undefined;
  private requestCounter = 0;

  constructor(doc: HostApprovalPoliciesDocument, decisionConfig?: ApprovalSimConfig) {
    this.specificIndex = new Map();
    this.wildcardIndex = new Map();
    this.decisionConfig = decisionConfig;

    for (const policy of doc.policies) {
      if (policy.server === '*') {
        this.wildcardIndex.set(policy.tool, policy);
      } else {
        if (!this.specificIndex.has(policy.server)) {
          this.specificIndex.set(policy.server, new Map());
        }
        this.specificIndex.get(policy.server)!.set(policy.tool, policy);
      }
    }
  }

  /**
   * Resolve the approval policy for a tool call.
   *
   * @param server - MCP server name
   * @param tool - Tool name
   * @returns Resolution result with policy and resolution method
   */
  resolve(server: string, tool: string): PolicyResolutionResult {
    // 1. Specific server + tool
    const serverMap = this.specificIndex.get(server);
    if (serverMap) {
      const policy = serverMap.get(tool);
      if (policy) {
        return {
          policy,
          resolution: 'specific',
          requiresApproval: policy.requires_approval,
        };
      }
    }

    // 2. Wildcard server + tool
    const wildcardPolicy = this.wildcardIndex.get(tool);
    if (wildcardPolicy) {
      return {
        policy: wildcardPolicy,
        resolution: 'wildcard',
        requiresApproval: wildcardPolicy.requires_approval,
      };
    }

    // 3. Global default: fail-closed
    const defaultPolicy: HostApprovalPolicy = {
      server,
      tool,
      requires_approval: true,
      risk_level: 'critical',
      reason: 'Unknown tool — fail-closed at R5',
    };

    return {
      policy: defaultPolicy,
      resolution: 'global-default',
      requiresApproval: true,
    };
  }

  /**
   * Get the total number of indexed policies.
   */
  get policyCount(): number {
    let count = this.wildcardIndex.size;
    for (const map of this.specificIndex.values()) {
      count += map.size;
    }
    return count;
  }

  /**
   * Simulate an approval round-trip for a tool call.
   *
   * 1. Resolves the policy via resolve()
   * 2. If requires_approval is false → skipped result
   * 3. If requires_approval is true → builds request event, looks up
   *    decision from config (specific → wildcard → global → default),
   *    returns decision or timeout result
   *
   * @param server - MCP server name
   * @param tool - Tool name
   * @returns Approval flow result
   */
  requestApproval(server: string, tool: string): ApprovalFlowResult {
    const resolved = this.resolve(server, tool);

    // No approval required → skip
    if (!resolved.requiresApproval) {
      return { approved: true, skipped: true, reason: 'no-approval-required' };
    }

    // Build request event
    const requestId = `sim-${++this.requestCounter}`;
    const now = new Date().toISOString();
    const riskLevelNum = riskLevelToNumber(resolved.policy.risk_level);

    const request: SimApprovalRequestEvent = {
      schemaVersion: 1,
      type: 'approval_request',
      requestId,
      timestamp: now,
      toolCall: { server, tool },
      risk: { level: riskLevelNum, reason: resolved.policy.reason },
    };

    // Look up decision: "server:tool" → "*:tool" → "*:*" → defaultDecision
    const decision = this.lookupDecision(server, tool);

    // Timeout
    if (decision === 'timeout') {
      return {
        approved: false,
        skipped: false,
        timedOut: true,
        reason: 'timeout',
        request,
        resolution: resolved.resolution,
      };
    }

    // Approve or deny
    const approved = decision === 'approve';
    const response: SimApprovalResponseEvent = {
      schemaVersion: 1,
      type: 'approval_response',
      requestId,
      timestamp: new Date().toISOString(),
      decision: {
        status: approved ? 'approved' : 'denied',
        decidedBy: { type: 'user' },
        reason: approved ? 'Approved by sim config' : 'Denied by sim config',
      },
    };

    return {
      approved,
      skipped: false,
      timedOut: false,
      request,
      response,
      resolution: resolved.resolution,
    };
  }

  /**
   * Look up the decision for a server:tool pair from the decision config.
   *
   * Resolution order: "server:tool" → "*:tool" → "*:*" → defaultDecision → 'approve'.
   */
  private lookupDecision(server: string, tool: string): 'approve' | 'deny' | 'timeout' {
    if (!this.decisionConfig) {
      return 'approve';
    }

    const { decisions, defaultDecision } = this.decisionConfig;

    // Exact match
    const exact = decisions.get(`${server}:${tool}`);
    if (exact !== undefined) return exact;

    // Wildcard server match
    const wildcard = decisions.get(`*:${tool}`);
    if (wildcard !== undefined) return wildcard;

    // Global wildcard
    const global = decisions.get('*:*');
    if (global !== undefined) return global;

    return defaultDecision ?? 'approve';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_LEVEL_MAP: Record<string, number> = {
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

function riskLevelToNumber(level: string): number {
  return RISK_LEVEL_MAP[level] ?? 0;
}
