/**
 * MockGateway — simulates OC Gateway before_tool_call event lifecycle.
 *
 * Enables unit testing of governance-aware skills without the OC runtime.
 * Uses the same event types as the real Gateway but runs entirely in-memory.
 *
 * Key design decisions (gateway-eng role lens):
 * - No global state — each MockGateway instance is independent
 * - No async blocking in event handlers — handlers are synchronous
 * - No unbounded loops — event dispatch is O(n) in registered listeners
 * - Fail-open for allow, explicit deny for deny/require-approval
 *
 * @module @bic/claws-skill-kit/mock/mock-gateway
 */

import type { SkillHandler, SkillGovernanceMetadata } from '../types.js';
import { GOVERNANCE_METADATA_KEY } from '../types.js';
import type { ApprovalProvider } from './mock-approval.js';

/**
 * Gateway decision types — mirrors OC Gateway decisions.
 */
export type GatewayDecision = 'allow' | 'deny' | 'require-approval';

/**
 * before_tool_call event shape — mirrors OCBeforeToolCallEvent.
 */
export interface BeforeToolCallEvent {
  readonly toolName: string;
  readonly decision: GatewayDecision;
  readonly governanceMetadata: SkillGovernanceMetadata;
  readonly timestamp: string;
}

/**
 * Event listener type.
 */
export type GatewayEventListener = (event: BeforeToolCallEvent) => void;

/**
 * MockGateway configuration.
 */
export interface MockGatewayConfig {
  /** Default decision for all registered tools. */
  defaultDecision?: GatewayDecision;
  /** Approval provider for require-approval decisions. */
  approvalProvider?: ApprovalProvider;
}

/**
 * MockGateway — in-memory test double for the OC Gateway event system.
 *
 * Usage:
 * ```ts
 * const gateway = new MockGateway({ defaultDecision: 'allow' });
 * gateway.register(mySkillHandler);
 * const result = await gateway.invoke(mySkillHandler, input);
 * ```
 */
export class MockGateway {
  private readonly _config: MockGatewayConfig;
  private readonly _registered = new Set<string>();
  private readonly _handlers = new Map<string, SkillHandler>();
  private readonly _decisions = new Map<string, GatewayDecision>();
  private readonly _listeners = new Map<string, GatewayEventListener[]>();

  constructor(config?: MockGatewayConfig) {
    this._config = config ?? {};
  }

  /**
   * Register a skill handler with the mock gateway.
   */
  register(handler: SkillHandler): void {
    this._registered.add(handler.skillName);
    this._handlers.set(handler.skillName, handler);
  }

  /**
   * Set a per-tool decision override.
   */
  setDecision(toolName: string, decision: GatewayDecision): void {
    this._decisions.set(toolName, decision);
  }

  /**
   * Register an event listener.
   */
  on(eventType: 'before_tool_call', listener: GatewayEventListener): void {
    const listeners = this._listeners.get(eventType) ?? [];
    listeners.push(listener);
    this._listeners.set(eventType, listeners);
  }

  /**
   * Invoke a skill through the mock gateway.
   *
   * Lifecycle:
   * 1. Check registration
   * 2. Determine decision (per-tool override > default > deny)
   * 3. Fire before_tool_call event
   * 4. If deny -> throw
   * 5. If require-approval -> consult approval provider
   * 6. Execute handler
   * 7. Return result
   */
  async invoke<TInput, TOutput>(
    handler: SkillHandler<TInput, TOutput>,
    input: TInput,
  ): Promise<TOutput> {
    const toolName = handler.skillName;

    // 1. Check registration
    if (!this._registered.has(toolName)) {
      throw new Error(`[MockGateway] Skill "${toolName}" is not registered with this gateway`);
    }

    // 2. Determine decision (default-deny posture)
    const decision = this._decisions.get(toolName)
      ?? this._config.defaultDecision
      ?? 'deny';

    // 3. Read governance metadata
    const metadata = handler[GOVERNANCE_METADATA_KEY];

    // 4. Fire before_tool_call event
    const event: BeforeToolCallEvent = {
      toolName,
      decision,
      governanceMetadata: metadata,
      timestamp: new Date().toISOString(),
    };

    const listeners = this._listeners.get('before_tool_call') ?? [];
    for (const listener of listeners) {
      listener(event);
    }

    // 5. Handle deny
    if (decision === 'deny') {
      throw new Error(
        `[MockGateway] Tool "${toolName}" denied by governance policy`,
      );
    }

    // 6. Handle require-approval
    if (decision === 'require-approval') {
      const provider = this._config.approvalProvider;
      if (!provider) {
        throw new Error(
          `[MockGateway] Tool "${toolName}" requires approval but no approval provider is configured`,
        );
      }

      const result = await provider.requestApproval(toolName, metadata as unknown as Record<string, unknown>);
      if (!result.granted) {
        throw new Error(
          `[MockGateway] Tool "${toolName}" approval denied: ${result.reason ?? 'no reason'}`,
        );
      }
    }

    // 7. Execute handler
    return handler(input);
  }
}
