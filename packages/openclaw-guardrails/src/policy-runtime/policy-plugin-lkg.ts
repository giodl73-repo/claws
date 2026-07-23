/**
 * Policy plugin variant that loads PolicyIR from an `LKGStore`
 * (last-known-good tracker) instead of from a `SnapshotStore`.
 *
 * This is the upstream-aligned shape: PolicyIR becomes one consumer
 * of the same LKG primitive that already protects gateway config in
 * `openclaw-core` (issue #70528, commit `af56926e2fc4`). When an
 * agent writes a bad PolicyIR, the LKG tracker auto-recovers; when
 * the file is good, the plugin reads through.
 *
 * Same fail-closed semantics as `buildPolicyPlugin`:
 *   - LKG `readLastKnownGood` throws (no LKG yet)         → block
 *   - PolicyIR JSON parse / `validatePolicyIR` throws     → block
 *   - composed provider throws                            → block
 *
 * The cache is keyed on `(sessionKey, fingerprint.hash)` — the
 * fingerprint hash from the LKG entry is the per-version anchor
 * that previously came from `ctx.snapshotId`. No need for a
 * separate ID surface: the LKG IS the anchor.
 *
 * @module @bic/openclaw-guardrails/policy-runtime/policy-plugin-lkg
 */

import { validatePolicyIR, type LKGStore, type PolicyIR } from "@bic/v2-prototype";
import { POLICY_IR_PATH } from "@bic/v2-prototype";

import type { GuardrailProvider } from "../types.js";
import { toTrustedToolPolicy } from "../openclaw-adapter.js";
import type {
  UpstreamPluginToolPolicyDecision,
  UpstreamPluginTrustedToolPolicyRegistration,
} from "../openclaw-adapter.js";
import { PolicyIrCache } from "./cache.js";

const TEXT_DECODER = new TextDecoder("utf-8");

export interface PolicyPluginLKGOptions {
  /** Identifier for this registered plugin. Defaults to `composedProvider.name`. */
  readonly id?: string;
  /** Description shown to upstream's runner. */
  readonly description?: string;
  /** LKG store the policy file is registered with. */
  readonly lkg: LKGStore;
  /** Absolute filesystem path the LKG store tracks. Required for `lkg.observe` and `lkg.readLastKnownGood`. */
  readonly policyIrPath: string;
  /** Cache instance — pass an existing PolicyIrCache or omit to construct a default-tuned one. */
  readonly cache?: PolicyIrCache;
}

/**
 * Build a registered upstream policy plugin from a (composed)
 * `GuardrailProvider` whose PolicyIR is sourced from an LKG-tracked
 * file. Returns the `UpstreamPluginTrustedToolPolicyRegistration` for
 * `api.registerTrustedToolPolicy(...)`.
 *
 * Lifecycle:
 *   - Construction: cache + composed adapter; no I/O.
 *   - On `evaluate(event, ctx)`:
 *     1. Get LKG fingerprint hash for the policy file (drives cache key).
 *     2. Cache lookup → fall back to `lkg.readLastKnownGood` → validate.
 *     3. Dispatch through the composed provider via the adapter.
 *
 * Fail-closed if any step fails.
 */
export function buildPolicyPluginFromLKG(
  composedProvider: GuardrailProvider,
  opts: PolicyPluginLKGOptions,
): UpstreamPluginTrustedToolPolicyRegistration {
  const cache = opts.cache ?? new PolicyIrCache();
  const baseRegistration = toTrustedToolPolicy(composedProvider);

  return {
    id: opts.id ?? baseRegistration.id,
    description: opts.description ?? baseRegistration.description,
    evaluate: async (event, ctx) => {
      // Step 1: fingerprint anchor. The LKG entry's lastPromotedGood.hash
      // is the equivalent of ctx.snapshotId — a stable per-version key.
      const entry = opts.lkg.getEntry(opts.policyIrPath);
      const fingerprint = entry?.lastPromotedGood?.hash;
      if (fingerprint === undefined) {
        return failClosedNoLKG();
      }

      // Step 2: cache lookup → LKG read fallback → validate.
      const sessionKey =
        (ctx as { sessionKey?: string }).sessionKey ??
        (ctx as { sessionId?: string }).sessionId ??
        "";
      let ir: PolicyIR | undefined = cache.get(sessionKey, fingerprint);
      if (ir === undefined) {
        try {
          ir = await loadFromLKG(opts.lkg, opts.policyIrPath);
        } catch (err) {
          return failClosedLKGLoad(err);
        }
        cache.set(sessionKey, fingerprint, ir);
      }

      // Step 3: dispatch through the adapter. PolicyIR isn't yet passed
      // through the upstream event shape; the composed provider's
      // closure must already have access to it. Same architectural
      // limit as the snapshot-shaped variant — but now resolvable
      // because the LKG entry is reachable from the provider too.
      void ir;
      return baseRegistration.evaluate(event, ctx);
    },
  };
}

function failClosedNoLKG(): UpstreamPluginToolPolicyDecision {
  return {
    block: true,
    blockReason:
      "policy-plugin (LKG): no last-known-good PolicyIR yet. " +
      "The tracker must observe at least one valid write before " +
      "evaluation can proceed. See " +
      "https://docs.openclaw.ai/plugin-sdk/lkg.",
  };
}

function failClosedLKGLoad(err: unknown): UpstreamPluginToolPolicyDecision {
  const detail = err instanceof Error ? err.message : String(err);
  return {
    block: true,
    blockReason: `policy-plugin (LKG): failed to load PolicyIR from LKG — ${detail}`,
  };
}

async function loadFromLKG(lkg: LKGStore, policyIrPath: string): Promise<PolicyIR> {
  const bytes = await lkg.readLastKnownGood(policyIrPath);
  const text = TEXT_DECODER.decode(bytes);
  const parsed: unknown = JSON.parse(text);
  validatePolicyIR(parsed);
  return parsed;
}

/**
 * Convenience: a default `LKGTracker` for `policy-ir.json` shaped
 * to use `validatePolicyIR` from `@bic/v2-prototype`. Plugins that
 * don't need custom suspicious heuristics can use this directly.
 */
export function policyIrTracker(absolutePath: string) {
  return {
    path: absolutePath,
    parse: (raw: string): unknown => JSON.parse(raw),
    validate: (parsed: unknown) => {
      try {
        validatePolicyIR(parsed);
        return { valid: true, issues: [] as readonly { path: string; message: string }[] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          valid: false,
          issues: [{ path: "", message } as const],
        };
      }
    },
  };
}

export { POLICY_IR_PATH };
