/**
 * ToolCallBuilder — fluent builder for constructing realistic
 * tool call payloads for GatewaySim.
 *
 * @module @bic/claws-test/tool-call-builder
 */

/**
 * A built tool call payload ready for GatewaySim.fireToolCall().
 */
export interface ToolCallPayload {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly context: Record<string, unknown>;
}

/**
 * Fluent builder for tool call payloads.
 *
 * Usage:
 * ```ts
 * const call = toolCall('send-email')
 *   .withArgs({ to: 'user@example.com' })
 *   .asUser('sarah')
 *   .build();
 * ```
 */
export class ToolCallBuilder {
  private readonly _toolName: string;
  private _args: Record<string, unknown> = {};
  private _context: Record<string, unknown> = {};

  constructor(toolName: string) {
    this._toolName = toolName;
  }

  /** Set tool call arguments. */
  withArgs(args: Record<string, unknown>): this {
    this._args = { ...this._args, ...args };
    return this;
  }

  /** Set the acting user/principal. */
  asUser(user: string): this {
    this._context['actor'] = user;
    return this;
  }

  // Risk tier is resolved from the plugin's risk map, not from call context.
  // Use GatewaySim.fromHooks() with a riskMap to control enforcement levels.

  /** Add arbitrary context values. */
  withContext(ctx: Record<string, unknown>): this {
    this._context = { ...this._context, ...ctx };
    return this;
  }

  /** Build the final payload. */
  build(): ToolCallPayload {
    return {
      toolName: this._toolName,
      args: { ...this._args },
      context: { ...this._context },
    };
  }
}

/**
 * Entry point for the fluent builder.
 *
 * ```ts
 * const call = toolCall('send-email').withArgs({ to: 'x' }).build();
 * ```
 */
export function toolCall(toolName: string): ToolCallBuilder {
  return new ToolCallBuilder(toolName);
}
