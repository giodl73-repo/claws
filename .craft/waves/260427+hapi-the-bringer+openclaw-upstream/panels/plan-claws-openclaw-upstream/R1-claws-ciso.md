# Plan Review · claws-openclaw-upstream · R1

**Reviewer**: claws:ciso
**Date**: 2026-04-27
**Verdict**: APPROVE-WITH-WARNINGS

## Summary

The plan delivers four critical governance packages upstream with sound approval-handle binding and fail-closed R5 enforcement at generation time. Two structural risks remain: audit events lack plugin-source attribution (weakening forensics), and the OC-7 merger assumes all plugins complete their pre-auth phase (fails conjunctive invariant if one crashes mid-emission). Both are fixable pre-merge; neither blocks the gateway-level governance model.

## Findings

### HC-BLOCK (0)

### HC-WARN (2)

1. **Approval-handle binding lacks plugin-source audit attribution** — `HandleBinding` includes `providerId` in the signed payload, but `AuditEntrySummary` has optional `actor` with no `sourcePluginId` field. A provider emits an approval decision and posts audit, but the audit entry cannot be traced back to the plugin that issued it. Consequence: SIEM export and forensic queries cannot answer "which plugin approved this action" — audit trail breaks the chain of custody for approval decisions. Suggested fix: add `sourcePluginId: string` (non-optional) to `AuditEntrySummary`; verify it matches `providerId` at post-audit time in `ProviderRegistryImpl.postAudit()`.

2. **OC-7 merger conjunctive invariant vulnerable to plugin crash mid-emission** — The plan asserts "non-downgradable / conjunctive — all must be approved," but `composeDecisions` in `registry.ts` assumes all plugins complete their `preAuthorize` call. If plugin-A emits `requireApproval: {…}` then throws an error before returning, and plugin-B never runs (or returns allow), the framework downgrades to plugin-B's decision. Consequence: R5 approval requirement silently lost if an earlier plugin fails. Suggested fix: wrap provider invocation in try-catch; if a provider throws during approval emission, propagate the error or force deny/review (never allow).

### HC-NOTE (3)

1. **R5 fail-closed enforcement is generation-time only** — The generator validates R5 + failOpen pairs and rejects them (`validateR5FailOpen` in policy package), but the emitted `policy-ir.json` + `gateway-plugin.ts` have zero runtime tamper defense. If a downstream consumer modifies the JSON to insert `failOpen: true` on an R5 tool, the runtime runtime has no fail-closed enforcement — it falls to each provider's `postAudit` hook. This is acceptable if the policy artifact is signed/sealed before hand-off (not mentioned in the plan). Ensure H2/H3/H5 PRs cite a signed-artifact or sealed-envelope design in the adapter audits.

2. **Audit chain rotation breaks tamper-evidence across boundaries** — The hash-chained audit uses `GENESIS_HASH` as the anchor for the first event. When events are pruned (retention policy kicks in) or the chain is rotated, a new genesis begins — but there is no cross-rotation link (e.g., last-pruned-hash → new-genesis). If a SIEM exporter loses entries mid-stream and the local chain rotates, the exporter cannot reconstruct the tamper-evident proof. This is complex and likely out-of-scope for upstream contribution, but should be documented in `docs/upstream/guides/adapter-audits.md` as a known limitation: "chain rotation is supported for retention but is not tamper-evident across rotation boundaries."

3. **Trust-set key rotation policy deferred** — The plan mentions `keyId` in approval-handle binding to support rotation, but no rotation policy (grace period, old-key acceptance window, revocation timeline) is specified. This is out-of-scope per the wave and deferred to follow-up, but should be flagged in the H5 OC-7 PR description as a "follow-up: trust-set rotation policy" note. The framework supports it; the policy does not.

## Strengths

- **Approval-handle binding is cryptographically sound**: The 8-field canonical evaluation order (signature → providerId → contentHash → sequenceNumber → approverPrincipal → keyId → ttl → nonce) is enforced in both the validator and the test matrix; replay and handle-swap are blocked by design.
- **R5 fail-closed is non-negotiable at generation time**: The generator refuses to emit R5 + failOpen pairs; downstream plugins that escape this gate (via manual JSON tampering) still have per-provider `postAudit` defensein-depth.
- **Audit trail is hash-chained and tamper-evident within rotation windows**: The `append` + `verify` round-trip in guardrails/audit/chain.ts uses RFC 8785 JCS canonicalization (byte-identical across platforms), ensuring forensic auditors can detect tampering.
