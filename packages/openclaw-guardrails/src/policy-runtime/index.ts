/**
 * @bic/openclaw-guardrails/policy-runtime — the listening piece.
 *
 * Exports `buildPolicyPlugin(composedProvider, opts)` which returns an
 * `UpstreamPluginTrustedToolPolicyRegistration` ready to pass to
 * upstream's `api.registerTrustedToolPolicy(...)`. Composes the
 * existing `toTrustedToolPolicy` adapter with a per-session
 * bounded-LRU `PolicyIrCache` and the lazy-load + fail-closed
 * lifecycle from `.craft/out/proposals/guardrails-adapter.md`.
 *
 * @module @bic/openclaw-guardrails/policy-runtime
 */

export {
  buildPolicyPlugin,
  PolicyIrCache,
  MAX_SNAPSHOTS_PER_SESSION,
  SESSION_IDLE_MS,
  SWEEP_INTERVAL_MS,
} from './policy-plugin.js';
export type {
  PolicyContextWithSnapshot,
  PolicyPluginOptions,
} from './policy-plugin.js';

export {
  buildPolicyPluginFromLKG,
  policyIrTracker,
} from './policy-plugin-lkg.js';
export type { PolicyPluginLKGOptions } from './policy-plugin-lkg.js';
