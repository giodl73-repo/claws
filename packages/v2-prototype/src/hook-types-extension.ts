/**
 * @bic/v2-prototype/hook-types-extension — local fork of the
 * `PluginHookToolContext.snapshotId` extension proposed at upstream
 * `src/plugins/hook-types.ts:393-401`.
 *
 * **Replace with the upstream `@openclaw/plugin-sdk/hook-types`
 * extended `PluginHookToolContext` when the upstream PR lands.**
 *
 * Per `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/pr-drafts/
 * v2-policy-ir.md` § "What changed" item 3 and `.craft/out/proposals/
 * policy-pre-rfc.md` Ask §4. The gateway threads the active snapshot
 * ID into the hook context at `before_tool_call` invocation time so
 * policy decisions are anchored to a known point in time, eliminating
 * the TOCTOU race that comes from resolving "current snapshot" via
 * plugin-private state.
 *
 * @module @bic/v2-prototype/hook-types-extension
 */

import type { SnapshotId } from "./snapshot.js";

/**
 * Extension to upstream's existing `PluginHookToolContext`. The
 * upstream type has 6+ optional fields today (`agentId`, `sessionKey`,
 * `sessionId`, `runId`, `trace`, `toolName`, `toolCallId`); the v2
 * extension adds one more.
 *
 * In the prototype, consumers can either:
 *   - Use this interface directly when threading the field (e.g., in
 *     a fixture or local mock).
 *   - Use TypeScript declaration merging to extend the upstream type
 *     in-place (see the example below) — this approach is what the
 *     downstream consumer should use once `@openclaw/plugin-sdk` is
 *     consumed; the merge is a no-op once upstream lands the field.
 *
 * Example declaration merging:
 * ```ts
 * declare module '@openclaw/plugin-sdk/hook-types' {
 *   interface PluginHookToolContext {
 *     snapshotId?: SnapshotId;
 *   }
 * }
 * ```
 */
export interface PluginHookToolContextExtension {
  /**
   * Active snapshot ID for this hook invocation. Threaded by the
   * gateway at `before_tool_call` invocation time so policy plugins
   * can anchor decisions to a known snapshot rather than resolving
   * via plugin-private state (which has TOCTOU race conditions,
   * multi-tenant policy bleed, and promotion-observation skew).
   *
   * Optional: `undefined` when the gateway is not threading the field
   * (transitional state, before the extension lands at upstream OR a
   * non-snapshot-aware tenant). Per `policy-pre-rfc.md` Ask §4 and
   * the consumer-side `claws-guardrails` runtime decisions, missing
   * `snapshotId` MUST be treated as fail-closed by PolicyIR-driven
   * evaluators.
   */
  readonly snapshotId?: SnapshotId;
}
