/**
 * @bic/v2-prototype/policy-ir — local fork of the v2 upstream `PolicyIR`
 * contract that's being proposed to `openclaw/openclaw` at
 * `src/plugin-sdk/policy-ir.ts`.
 *
 * **Replace with `@openclaw/plugin-sdk/policy-ir` when the upstream PR lands.**
 *
 * Mirrors the exact shape from `.craft/waves/260427+hapi-the-bringer+
 * openclaw-upstream/pr-drafts/v2-policy-ir.md` § "The contract" and
 * `.craft/out/proposals/policy-pre-rfc.md`. Pure types, no runtime.
 *
 * @module @bic/v2-prototype/policy-ir
 */

import type { SnapshotId, SnapshotInternalPath } from './snapshot.js';

/** Risk tier on a tool spec (or any policy-bearing artifact). */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Sensitivity tier on data the tool sees / produces. */
export type Sensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

/** Per-tool spec that policy evaluates against. */
export interface ToolSpec {
  readonly id: string;
  readonly capabilities: readonly string[];
  readonly risk: RiskLevel;
  readonly sensitivity: Sensitivity;
}

/** Deny-rule that a policy evaluator checks. */
export interface DenyRule {
  readonly id: string;
  readonly when: {
    readonly tool?: string;
    readonly capability?: string;
    readonly tag?: string;
  };
  readonly reason: string;
}

/** Decision returned by a policy evaluator for a tool call. */
export type Decision =
  | { readonly kind: 'allow' }
  | { readonly kind: 'deny'; readonly reason: string; readonly rule?: string }
  | { readonly kind: 'requires-approval'; readonly reason: string }
  | { readonly kind: 'params'; readonly mutate: Readonly<Record<string, unknown>> };

/**
 * The compiled, content-addressable policy artifact that rides inside
 * snapshots at `POLICY_IR_PATH`.
 *
 * `policyId := lower-hex(sha256(jcs(this body excluding policyId)))` —
 * same RFC 8785 JCS rule as snap's `SnapshotId`. Two generators
 * producing semantically-identical PolicyIR (same fields, possibly
 * different field-order or formatting) MUST produce the same `policyId`.
 */
export interface PolicyIR {
  readonly version: string;
  /** Content-hash of this body (excluding `policyId`). */
  readonly policyId: string;
  /** ISO-8601 UTC timestamp of generation. */
  readonly generatedAt: string;
  /** Snapshot whose validated content produced this IR. */
  readonly generatedFrom: SnapshotId;
  readonly tools: readonly ToolSpec[];
  readonly denyRules: readonly DenyRule[];
}

/**
 * Generator interface — types-only contract. Each consumer ships their
 * own implementation:
 * - claws ships `claws-policy-generator/` (parses SOUL/TOOLS/AGENTS).
 * - OPA users ship a `.rego → PolicyIR` shim.
 * - CEL users ship `.cel → PolicyIR`.
 * - yaml users ship `yaml → PolicyIR`.
 *
 * `TValidated` is the consumer's input convention. The validated content
 * is fed in by the gateway's policy-generation flow; the generator
 * produces a `PolicyIR` anchored to the snapshot whose bytes were
 * validated.
 */
export interface PolicyGenerator<TValidated> {
  generate(content: TValidated, snapshotId: SnapshotId): Promise<PolicyIR>;
}

/**
 * Conventional snapshot-internal path where guardrails look for the
 * active PolicyIR. Typed as `SnapshotInternalPath` (NOT `OcPath`) —
 * PolicyIR lives INSIDE a snapshot, not as a workspace file, so the
 * 9-entry `OC_WORKSPACE_FILES` registry constraint does not apply.
 */
export const POLICY_IR_PATH: SnapshotInternalPath = '.openclaw/policy/policy-ir.json';
