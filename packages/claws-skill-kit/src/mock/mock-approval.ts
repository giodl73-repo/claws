/**
 * MockApproval — simulates OC Gateway elicitation gate for testing.
 *
 * Supports three modes:
 * - approve: grants approval immediately
 * - deny: denies approval immediately
 * - timeout: rejects after a configurable delay
 *
 * @module @bic/claws-skill-kit/mock/mock-approval
 */

/**
 * Approval request record for test inspection.
 */
export interface ApprovalRequest {
  readonly toolName: string;
  readonly metadata: Record<string, unknown>;
  readonly timestamp: string;
}

/**
 * Approval result returned by the approval provider.
 */
export interface ApprovalResult {
  readonly granted: boolean;
  readonly reason?: string;
}

/**
 * Approval provider interface — MockGateway calls this when
 * the decision is 'require-approval'.
 */
export interface ApprovalProvider {
  requestApproval(toolName: string, metadata: Record<string, unknown>): Promise<ApprovalResult>;
}

/**
 * MockApproval configuration.
 */
export interface MockApprovalConfig {
  /** Approval mode: approve, deny, or timeout. */
  mode: 'approve' | 'deny' | 'timeout';
  /** Timeout in milliseconds (only used in timeout mode). */
  timeoutMs?: number;
}

/**
 * MockApproval — test double for the OC Gateway elicitation gate.
 */
export class MockApproval implements ApprovalProvider {
  private readonly _config: MockApprovalConfig;
  private readonly _requests: ApprovalRequest[] = [];

  constructor(config: MockApprovalConfig) {
    this._config = config;
  }

  /**
   * All recorded approval requests.
   */
  get requests(): readonly ApprovalRequest[] {
    return this._requests;
  }

  /**
   * Request approval for a tool invocation.
   */
  async requestApproval(
    toolName: string,
    metadata: Record<string, unknown>,
  ): Promise<ApprovalResult> {
    this._requests.push({
      toolName,
      metadata,
      timestamp: new Date().toISOString(),
    });

    switch (this._config.mode) {
      case 'approve':
        return { granted: true };

      case 'deny':
        return { granted: false, reason: 'denied' };

      case 'timeout': {
        const ms = this._config.timeoutMs ?? 5000;
        await new Promise<void>((resolve) => setTimeout(resolve, ms));
        return { granted: false, reason: 'timeout' };
      }
    }
  }
}
