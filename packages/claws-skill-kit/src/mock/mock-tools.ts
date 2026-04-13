/**
 * MockTools — simulated tool call/response pairs for testing.
 *
 * Provides a registry of tool names and their expected responses
 * for use in MockGateway testing scenarios.
 *
 * @module @bic/claws-skill-kit/mock/mock-tools
 */

/**
 * A tool call record for inspection after test execution.
 */
export interface ToolCallRecord {
  readonly toolName: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly timestamp: string;
}

/**
 * MockTools — records tool invocations for test assertions.
 */
export class MockTools {
  private readonly _calls: ToolCallRecord[] = [];

  /**
   * Record a tool invocation.
   */
  record(toolName: string, input: unknown, output: unknown): void {
    this._calls.push({
      toolName,
      input,
      output,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * All recorded tool calls.
   */
  get calls(): readonly ToolCallRecord[] {
    return this._calls;
  }

  /**
   * Get calls for a specific tool.
   */
  callsFor(toolName: string): readonly ToolCallRecord[] {
    return this._calls.filter((c) => c.toolName === toolName);
  }

  /**
   * Clear all recorded calls.
   */
  clear(): void {
    this._calls.length = 0;
  }
}
