# Panel Review: Dragon on Upstream Governance Spec

**Type**: spec
**Role**: craft/dragon
**Domain lens**: claws
**Round**: 1
**Files reviewed**:
1. `docs/claws/ecosystem/openclaw-governance-spec.md`
2. `docs/claws/ecosystem/approval-event-schema.md`
3. `.craft/plans/claws-upstream-contrib.md`
4. `.craft/plans/claws-aether-integration.md`
5. `docs/claws/presentations/why-claws.md`

**Date**: 2026-04-15

---

## Findings

### Major (M)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| M1 | openclaw-governance-spec.md | L282-286, ProviderRegistry.preAuthorize | **Empty registry allows all.** When no providers are registered, the registry returns `{ decision: 'allow' }` with only a WARNING log. This means a deployment with zero providers has zero governance -- every tool call passes, including R5/transact. A misconfigured deployment (providers fail to load, registry cleared by bug) silently becomes fully permissive. A WARNING is not a safety gate. | Empty registry MUST return `{ decision: 'deny', reason: 'No governance providers registered' }`. Fail-closed is the only safe default for a governance system. If the intent is to be non-breaking for legacy deployments with no providers, add an explicit `allowEmptyRegistry: true` config flag that must be set deliberately -- never default to allow. |
| M2 | openclaw-governance-spec.md | L131, AuthorizationDecision | **`requiresExternalApproval` defaults to false -- R5 invariant not enforced in type system.** The field is optional (`requiresExternalApproval?: boolean`) with a default of `false`. The comment says "R5 tools: MUST be true. Non-negotiable." but this is documentation, not enforcement. A provider that returns `{ decision: 'allow', riskLevel: 5 }` without setting `requiresExternalApproval` gets the default `false` -- R5 tool executes with no approval gate. The "non-negotiable" invariant is negotiable by omission. | The ProviderRegistry composition logic MUST enforce: if ANY provider in the chain reports `riskLevel: 5` on a tool call, the composed decision MUST have `requiresExternalApproval: true` regardless of what individual providers set. This moves the invariant from documentation to the registry's composition algorithm. Add to the ProviderRegistry spec: "If the composed riskLevel is 5, requiresExternalApproval is forced to true." |
| M3 | openclaw-governance-spec.md | L551-564, ApprovalTimeoutPolicy | **`alwaysDenyRiskLevels` is a runtime config array, not a compile-time invariant.** The spec says R5 always denies on timeout, but this is expressed as a default value in a configurable array: `alwaysDenyRiskLevels: RiskLevel[]` with `Default: [5]`. Nothing prevents a host from setting `alwaysDenyRiskLevels: []` and `failMode: 'allow'` -- effectively making R5 tools auto-approve on timeout. The R5 fail-closed guarantee evaporates if any host overrides this array. | Split into two fields: (1) `configurableDenyRiskLevels: RiskLevel[]` for levels hosts CAN configure, and (2) a hardcoded invariant in the spec text and JSON Schema that R5 is ALWAYS in the deny set and MUST NOT be removed. The JSON Schema for ApprovalTimeoutPolicy should enforce `alwaysDenyRiskLevels` contains `5` as a minimum via schema validation (`contains: { const: 5 }`). |
| M4 | openclaw-governance-spec.md | L412-415, Fail-Mode Specification | **Unknown risk level has no fail-mode row.** The fail-mode table covers R1-R2 (open), R3-R4 (configurable), R5 (closed). The text says "If the provider didn't classify the tool (no riskLevel), the Gateway defaults to fail-closed." But the type system allows `riskLevel?: RiskLevel` (optional). What about a provider that returns `riskLevel: undefined` vs one that never returns `riskLevel` at all? What about a corrupt or out-of-range value? The table should have an explicit row for unknown/missing/invalid risk level. | Add a fourth row to the fail-mode table: `Unknown/Missing/Invalid | Fail-closed | Treat as R5. Non-negotiable.` This makes the default explicit in the table, not buried in prose below it. Also specify that any `riskLevel` value outside the `1|2|3|4|5` union is treated as R5 for fail-mode purposes. |

### Warning (W)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| W1 | openclaw-governance-spec.md | L500-502, extensions field | **`extensions` field on ApprovalRequestEvent is an untyped escape hatch.** `extensions?: Record<string, unknown>` allows arbitrary host data in approval events. A malicious or compromised host could embed exfiltration payloads (base64-encoded secrets, PII, internal URLs) in the extensions field. Any consumer that logs, forwards, or persists these events would carry the payload. The spec says "consumers MUST ignore unknown keys" but SIEM systems, audit chains, and log aggregators will persist them verbatim. | Add a size constraint to the spec: `extensions` MUST NOT exceed 4KB serialized. Add a recommendation that consumers SHOULD sanitize/redact extensions before persisting. Add a note that extensions MUST NOT contain credentials, tokens, or PII -- violation is a security finding. Consider adding a `safeExtensionKeys` allowlist in the JSON Schema. |
| W2 | openclaw-governance-spec.md | L624-630, audit-chain HMAC-SHA256 | **Symmetric HMAC-SHA256 key means both writer and verifier hold the secret.** If the verification side (e.g., a SIEM consumer, an audit dashboard, or a fleet manager) is compromised, the attacker has the HMAC key and can forge arbitrary chain entries that pass verification. The tamper detection guarantee degrades to "tamper detection if and only if the verifier is uncompromised." | Document the threat model explicitly: HMAC-SHA256 provides tamper detection against log modification by non-key-holders (e.g., an agent that writes to the log file but doesn't hold the key). For protection against a compromised verifier, recommend Ed25519 asymmetric signing where the signing key is held by the writer and only the public key is distributed to verifiers. The enterprise tier (mentioned in the deck as "HMAC-SHA256 default or Ed25519 enterprise") should be the RECOMMENDED default for any deployment where the verifier is a separate trust boundary. |
| W3 | approval-event-schema.md | L93-94, risk.level type | **`risk.level` is typed as `number` in the design doc but `RiskLevel` (1-5 union) in the canonical spec.** The approval-event-schema.md defines `level: number` (line 93) while the canonical openclaw-governance-spec.md defines it as `level: RiskLevel` (line 476) where `RiskLevel = 1 | 2 | 3 | 4 | 5`. A host implementing from the design doc could emit `level: 0` or `level: 99`. Consumers that trust the canonical spec's union type would not validate these. | Align the design doc to use `RiskLevel` (the 1-5 union type) consistently. Add runtime validation in `@openclaw/approval-events` that rejects events with `risk.level` outside the 1-5 range. |
| W4 | approval-event-schema.md | L189, alwaysDenyRiskLevels type | **Design doc types `alwaysDenyRiskLevels` as `number[]` instead of `RiskLevel[]`.** Same type drift as W3. The design doc at line 189 uses `alwaysDenyRiskLevels: number[]` while the canonical spec at line 563 uses `alwaysDenyRiskLevels: RiskLevel[]`. A host following the design doc could set `alwaysDenyRiskLevels: [6, 7]` -- meaningless values that don't protect R5. | Align to `RiskLevel[]` in the design doc. Add JSON Schema validation that rejects values outside the 1-5 range. |
| W5 | claws-aether-integration.md | L73, aether-sim unknown tool | **aether-sim treats unknown tools as R5 fail-closed, but the ProviderRegistry spec does not.** The aether-sim scenario says "Unknown tool -> R5 fail-closed -> gated" which is the safe behavior. But the ProviderRegistry spec (openclaw-governance-spec.md L282-286) says empty registry returns `{ decision: 'allow' }`. If the unknown tool arrives at a registry with no providers, it is allowed. The sim's safety assumption is stronger than the spec's guarantee. | The ProviderRegistry spec must match the sim's expectation. Either (a) the registry fails closed on empty (per M1), or (b) the sim's expectation is documented as a host-level guarantee that sits above the registry. Either way, the gap must be closed -- the sim and the spec must agree on what happens to an unknown tool. |
| W6 | why-claws.md | L467, deck security claims | **Deck claims "HMAC-SHA256 (default) or Ed25519 (enterprise)" for audit signing, but the canonical spec only defines HMAC-SHA256.** The `@openclaw/audit-chain` API (openclaw-governance-spec.md L628) shows `algorithm: 'HMAC-SHA256'` with no Ed25519 option. The deck's security claim exceeds the spec's actual guarantee. An enterprise buyer reading the deck would expect Ed25519 support that doesn't exist in the contributed package. | Either (a) add Ed25519 as a supported algorithm in the `@openclaw/audit-chain` spec with a concrete API (`algorithm: 'Ed25519'`, `publicKey`, `privateKey` config), or (b) qualify the deck claim: "HMAC-SHA256 in @openclaw/audit-chain. Ed25519 available in @claws/audit (enterprise)." Do not claim a capability that the contributed spec does not define. |

### Notes (N)

| # | File | Line/Section | Finding |
|---|------|-------------|---------|
| N1 | openclaw-governance-spec.md | L334-340, ShellExecProvider unknown tool | The ShellExecProvider returns `{ decision: 'allow', requiresExternalApproval: true, riskLevel: 5 }` for unknown tools. This is safe (fail-closed via external approval). But the comment says "fail-closed default" while the decision is technically `allow` -- the fail-closed behavior depends entirely on the host honoring `requiresExternalApproval`. If the host ignores this field (which is optional), the unknown tool executes. The safety guarantee is split across two components. |
| N2 | openclaw-governance-spec.md | L84, ToolCall.arguments | `arguments: Record<string, unknown>` with the note "Providers MAY inspect but MUST NOT modify." This MUST NOT constraint is documentation only. Nothing in the type system prevents a provider from mutating the arguments object in-place during `preAuthorize()`. Consider documenting that the Gateway SHOULD deep-clone `toolCall` before passing to providers, or freeze the arguments object. |
| N3 | claws-upstream-contrib.md | L16-19, package count discrepancy | The plan H1 says "5 runtime packages" but the canonical spec defines 6 packages (audit-chain, budget-meter, identity-bridge, siem-emitter, secret-scanner, approval-events). The plan scope section lists all 6. The headline should say 6 packages, or clarify that approval-events is counted separately as a schema package rather than a runtime package. |

---

## Lens Checklist

| Verify item | Pass? | Notes |
|-------------|-------|-------|
| No validation weakened | FAIL | M2: `requiresExternalApproval` default of `false` weakens R5 gate for providers that omit the field. W3/W4: type drift from `RiskLevel` to `number` weakens range validation. |
| Error paths exhaustive | FAIL | M4: No fail-mode row for unknown/missing/invalid risk level. M1: Empty registry has no error path -- silently allows. |
| No invariant made conditional | FAIL | M3: R5 fail-closed on timeout is a configurable array default, not a hardcoded invariant. Can be overridden by any host. |
| R5 fail-closed preserved everywhere | FAIL | M1: Empty registry allows R5 tools. M2: Provider omitting `requiresExternalApproval` allows R5 without gate. M3: Host overriding `alwaysDenyRiskLevels` allows R5 on timeout. Three independent paths to R5 bypass. |
| Timeout safety guaranteed | FAIL | M3: `alwaysDenyRiskLevels` is a mutable default, not an invariant. A host setting `alwaysDenyRiskLevels: []` with `failMode: 'allow'` auto-approves R5 on timeout. |

---

## Summary

The R5 fail-closed invariant -- the single non-negotiable line in this governance system -- has three independent bypass paths: an empty provider registry that defaults to allow (M1), a provider that omits `requiresExternalApproval` for R5 tools and gets the `false` default (M2), and a host that overrides the `alwaysDenyRiskLevels` array to exclude R5 (M3). Each of these is documented as "MUST" or "non-negotiable" in prose, but none are enforced by the type system, the composition algorithm, or the JSON Schema. Prose invariants are not invariants -- they are suggestions. Every OC deployment that adopts these packages inherits all three bypass paths. The spec must move R5 enforcement from documentation into the ProviderRegistry composition logic, the type defaults, and the schema validation before it is safe for upstream contribution.
