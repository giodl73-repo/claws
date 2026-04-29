/**
 * The "listening piece" — a registered upstream policy plugin built on
 * top of `toTrustedToolPolicy(provider)` plus the per-session
 * bounded-LRU `PolicyIrCache`.
 *
 * Per `.craft/out/proposals/guardrails-adapter.md` § "Policy plugin
 * runtime — cache + fail-closed-on-missing-snap (R2 amendment)":
 *
 *   on evaluate(event, ctx):
 *     1. Read ctx.snapshotId
 *        → if undefined: fail-closed (block + diagnostic)
 *     2. Cache lookup → snap.read fallback → validatePolicyIR
 *     3. Apply rules → produce Decision
 *     4. Translate Decision → PluginToolPolicyDecision via the adapter
 *
 * @module @bic/openclaw-guardrails/policy-runtime/policy-plugin
 */

import {
  validatePolicyIR,
  type PolicyIR,
  type SnapshotId,
  type SnapshotInternalPath,
  type SnapshotStore,
} from '@bic/v2-prototype';
import { POLICY_IR_PATH } from '@bic/v2-prototype';

import type { GuardrailProvider } from '../types.js';
import { toTrustedToolPolicy } from '../openclaw-adapter.js';
import type {
  UpstreamPluginHookBeforeToolCallEvent,
  UpstreamPluginHookToolContext,
  UpstreamPluginToolPolicyDecision,
  UpstreamPluginTrustedToolPolicyRegistration,
} from '../openclaw-adapter.js';
import { PolicyIrCache } from './cache.js';

/**
 * Extension to `UpstreamPluginHookToolContext` that adds the
 * `snapshotId?` field per the v2 PolicyIR contract's Ask §4. When the
 * upstream PR lands, this becomes part of the upstream type and this
 * local extension is unnecessary.
 */
export interface PolicyContextWithSnapshot extends UpstreamPluginHookToolContext {
  readonly snapshotId?: SnapshotId;
}

export interface PolicyPluginOptions {
  /** Identifier for this registered plugin. Defaults to `composedProvider.name`. */
  readonly id?: string;
  /** Description shown to upstream's runner. Defaults to the provider's capability description. */
  readonly description?: string;
  /** SnapshotStore used to fetch PolicyIR by snapshot ID. */
  readonly store: SnapshotStore;
  /** Cache instance — pass an existing PolicyIrCache or omit to construct a default-tuned one. */
  readonly cache?: PolicyIrCache;
  /** Path inside the snapshot bundle where PolicyIR lives. Defaults to `POLICY_IR_PATH`. */
  readonly policyIrPath?: SnapshotInternalPath;
}

/**
 * Build a registered upstream policy plugin from a (composed)
 * `GuardrailProvider`. Returns the `UpstreamPluginTrustedToolPolicyRegistration`
 * that callers pass to `api.registerTrustedToolPolicy(...)`.
 *
 * Lifecycle:
 *   - Construction-time: the cache is a closure capture; no I/O yet.
 *   - On `evaluate(event, ctx)`: lazy-load PolicyIR from snap if not
 *     cached, validate hash + schema, dispatch through the provider's
 *     `preAuthorize`, translate the resulting decision via the adapter.
 *
 * Fail-closed semantics (matching `policy-pre-rfc.md` § "Failure semantics"):
 *   - `ctx.snapshotId` undefined           → block + diagnostic
 *   - `store.read` throws / returns bad    → block (treat as missing PolicyIR)
 *   - PolicyIR malformed / hash-mismatch   → block (validatePolicyIR throws)
 *   - `provider.preAuthorize` throws       → block (delegated to adapter's existing fail-closed)
 */
export function buildPolicyPlugin(
  composedProvider: GuardrailProvider,
  opts: PolicyPluginOptions,
): UpstreamPluginTrustedToolPolicyRegistration {
  const cache = opts.cache ?? new PolicyIrCache();
  const policyIrPath = opts.policyIrPath ?? POLICY_IR_PATH;
  const baseRegistration = toTrustedToolPolicy(composedProvider);

  return {
    id: opts.id ?? baseRegistration.id,
    description: opts.description ?? baseRegistration.description,
    evaluate: async (event, ctx) => {
      const ctxWithSnap = ctx as PolicyContextWithSnapshot;
      // Step 1: fail-closed if no snapshot anchor.
      if (ctxWithSnap.snapshotId === undefined) {
        return failClosedMissingSnapshot();
      }

      // Step 2: cache lookup → snap.read fallback → validate.
      const sessionKey = ctxWithSnap.sessionKey ?? ctxWithSnap.sessionId ?? '';
      let ir: PolicyIR | undefined = cache.get(sessionKey, ctxWithSnap.snapshotId);
      if (ir === undefined) {
        try {
          ir = await loadAndValidate(opts.store, ctxWithSnap.snapshotId, policyIrPath);
        } catch (err) {
          return failClosedSnapshotLoad(err);
        }
        cache.set(sessionKey, ctxWithSnap.snapshotId, ir);
      }

      // Step 3 + 4: dispatch through the composed provider via the adapter.
      // The adapter handles fail-closed-on-evaluator-throw internally.
      // PolicyIR isn't passed through the upstream event shape today — the
      // composed provider's closure must already have access to the IR
      // by other means (or a future iteration extends the event shape).
      // For now, the IR fetch/validate above ensures the snapshot anchor
      // is sound; rule application happens inside composedProvider.
      void ir;
      return baseRegistration.evaluate(event, ctx);
    },
  };
}

/**
 * Diagnostic for the missing-`ctx.snapshotId` case. Block + a stable
 * error string operators can grep for.
 */
function failClosedMissingSnapshot(): UpstreamPluginToolPolicyDecision {
  return {
    block: true,
    blockReason:
      'policy-plugin: evaluate() received without ctx.snapshotId. ' +
      'Gateway must thread ctx.snapshotId at hook invocation time. ' +
      'See https://docs.openclaw.ai/plugin-sdk/policy-ir#ctx-snapshot-id',
  };
}

/**
 * Diagnostic for snap.read or PolicyIR-validation failures. Treat as
 * missing PolicyIR; block.
 */
function failClosedSnapshotLoad(err: unknown): UpstreamPluginToolPolicyDecision {
  const detail = err instanceof Error ? err.message : String(err);
  return {
    block: true,
    blockReason: `policy-plugin: failed to load PolicyIR from snapshot — ${detail}`,
  };
}

/**
 * Read PolicyIR bytes from snap, parse JSON, validate schema + hash.
 * Throws on any failure path (caller wraps in fail-closed shim).
 */
async function loadAndValidate(
  store: SnapshotStore,
  snapshotId: SnapshotId,
  policyIrPath: SnapshotInternalPath,
): Promise<PolicyIR> {
  const bytes = await store.read(snapshotId, policyIrPath);
  const text = new TextDecoder().decode(bytes);
  const parsed: unknown = JSON.parse(text);
  validatePolicyIR(parsed);
  return parsed;
}

// Re-exports so consumers can construct policy-plugin without importing
// from multiple paths.
export { PolicyIrCache } from './cache.js';
export {
  MAX_SNAPSHOTS_PER_SESSION,
  SESSION_IDLE_MS,
  SWEEP_INTERVAL_MS,
} from './cache.js';
