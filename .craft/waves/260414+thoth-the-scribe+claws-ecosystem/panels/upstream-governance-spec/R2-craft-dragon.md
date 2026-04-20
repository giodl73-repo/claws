# Panel Review: Dragon on Upstream Governance Spec (R2)

**Type**: spec
**Role**: craft/dragon
**Round**: 2
**Date**: 2026-04-15

---

## R1 Finding Resolution

| R1 ID | Status | Notes |
|-------|--------|-------|
| M1 | RESOLVED | Empty registry now returns `{ decision: 'deny', reason: 'No governance providers registered' }`. Stated in the composition model (L102-104) and repeated in the ProviderRegistry JSDoc (L394-395). Fail-closed, not permissive. Bypass path (a) is closed. |
| M2 | RESOLVED | ProviderRegistry composition logic now explicitly forces `requiresExternalApproval: true` when ANY provider reports `riskLevel: 5`, regardless of what individual providers set. Stated in the composition model diagram (L83-84), ProviderRegistry JSDoc (L384-389), and the AllowDecision comment (L205-206). The field remains optional on AllowDecision (L208), but the registry overrides it. Bypass path (b) is closed at the composition layer. |
| M3 | RESOLVED | `alwaysDenyRiskLevels` now has: (1) `readonly` modifier on the field (L632), (2) `readonly RiskLevel[]` element type preventing mutation (L632), (3) INVARIANT comment stating R5 MUST always be present (L626), (4) JSON Schema enforcement via `contains: { const: 5 }` (L628), (5) explicit "Hosts MUST NOT override this" directive (L628). The JSON Schema for the `@openclaw/approval-events` package bakes this constraint in (L1120). Bypass path (c) is closed at the schema validation layer. |
| M4 | RESOLVED | Fail-mode table now has a fourth row: `Unknown / Missing / Invalid | Fail-closed | No risk classification = treat as R5. Non-negotiable.` (L115). Explicit in the table, not buried in prose. |
| W1 | RESOLVED | `extensions` field on both ApprovalRequestEvent (L555) and ApprovalResponseEvent (L607) now carries: "MUST NOT exceed 4KB serialized. MUST NOT contain credentials, tokens, or PII." Size constraint and sanitization guidance present. The JSON Schema generation (L1119) also mentions the extensions size limit being baked in. |
| W2 | RESOLVED | Threat model section added to audit-chain (L786-791). Documents: HMAC-SHA256 protects against non-key-holders; Ed25519 recommended for separate trust boundaries. Ed25519 is now a supported algorithm in the audit-chain API (L707-709) with `publicKey/privateKey` config. The threat model is explicit about what each algorithm protects against. |
| W3 | RESOLVED | Design rationale doc (approval-event-schema.md) now uses `RiskLevel` (1-5 union) for `risk.level` (L94-95) with explicit comment `// RiskLevel = 1 | 2 | 3 | 4 | 5`. The `RiskLevel` type is also defined explicitly at L182-183 in the same file. No more `number` type drift. |
| W4 | RESOLVED | Design rationale doc now uses `readonly RiskLevel[]` for `alwaysDenyRiskLevels` (L197) with `RiskLevel` defined at L183. The comment at L194-195 states: "R5 (transact) MUST always be present in this array -- it cannot be removed. Hosts MUST enforce that RiskLevel 5 always denies on timeout regardless of failMode." Aligned with canonical spec. |
| W5 | RESOLVED | The canonical spec's empty registry behavior (L102-104, L394-395) now returns deny, matching the aether-sim's "Unknown tool -> R5 fail-closed -> gated" expectation (claws-aether-integration.md L72). The gap between the sim's assumption and the spec's guarantee is closed. Additionally, the `defaults` section in host-approval-policies.json (claws-aether-integration.md L128-129) explicitly sets `unknown_tool: { requires_approval: true, risk_level: 5 }`, providing a second layer of defense at the HOST level. |
| W6 | RESOLVED | Deck (why-claws.md L467) now says: "HMAC-SHA256 (default). Ed25519 available in @claws/audit (enterprise tier)." This matches the canonical spec, which defines HMAC-SHA256 as default (L704-706) and Ed25519 as a supported algorithm (L707-709) in `@openclaw/audit-chain`. The deck claim "@claws/audit (enterprise tier)" correctly scopes Ed25519 to the enterprise package, not the contributed `@openclaw/*` package. The canonical spec also supports Ed25519 in `@openclaw/audit-chain` now, so the deck is actually conservative. |
| N1 | RESOLVED | ShellExecProvider (L450-466) still returns `{ decision: 'allow', requiresExternalApproval: true, riskLevel: 5 }` for unknown tools, but now the ProviderRegistry composition logic (L384-389) enforces R5 -> `requiresExternalApproval: true` regardless. The safety guarantee is no longer split across two components -- the registry is the enforcement point. Even if a host ignores the provider's `requiresExternalApproval`, the registry forces it. |
| N2 | ACKNOWLEDGED | `ToolCall.arguments` "MUST NOT modify" remains prose only (L169). No deep-clone or Object.freeze documented. This is still a note-level concern -- the Gateway SHOULD clone before passing to providers. Not a safety regression since R1 was a note. |
| N3 | RESOLVED | Plan H1 (claws-upstream-contrib.md L16) now says "6 runtime packages" consistently throughout. Count matches across H1 headline, scope section, validation lines, and notes. |

## New Findings (R2)

### Major (M)

| # | File | Section | Finding | Suggested fix |
|---|------|---------|---------|---------------|

No new major findings.

### Warning (W)

| # | File | Section | Finding | Suggested fix |
|---|------|---------|---------|---------------|
| W1 | claws-aether-integration.md | L174, Notes | **Plan note says `requiresExternalApproval` defaults to `false` without mentioning R5 override.** The note reads: "Providers that don't set it default to `false` (no host gate). This preserves backward compatibility." This is technically true at the individual provider level, but a reader of the plan (without reading the canonical spec) would conclude that omitting the field for an R5 tool means no host gate. The canonical spec's R5 override (registry forces `true` for R5) is the safety net, but this plan note does not reference it. | Amend the note to add: "...default to `false` (no host gate) *except for R5 tools, where the ProviderRegistry forces `requiresExternalApproval: true` regardless of what individual providers set (see canonical spec, ProviderRegistry composition logic).*" |
| W2 | claws-aether-integration.md | L73, aether-sim | **aether-sim scenario "HOST disabled (empty policies) -> all tools auto-allow at HOST layer" is confusing alongside the registry's fail-closed empty behavior.** The HOST layer (Aether's `ApprovalPolicyRegistry`) and the provider layer (ProviderRegistry) are distinct enforcement points. When the HOST layer has empty policies, tools auto-allow at that layer. When the ProviderRegistry has no providers, it denies. The scenario is correct (L2-L4 still enforce), but a reader could conflate "HOST empty" with "registry empty." | Add a clarifying note to the aether-sim scenario: "Note: 'HOST disabled' means Aether's ApprovalPolicyRegistry has no policies. The ProviderRegistry (L2-L4 enforcement) is a separate layer that fails closed when empty." |

### Notes (N)

| # | File | Section | Finding |
|---|------|---------|---------|
| N1 | openclaw-governance-spec.md | L208, AllowDecision.requiresExternalApproval | The field is still `requiresExternalApproval?: boolean` (optional, defaults to `false`). The R5 enforcement lives in the ProviderRegistry composition logic (L384-389), not in the type system. A provider implementing `AllowDecision` directly (outside the registry) can still return `{ decision: 'allow', riskLevel: 5 }` without `requiresExternalApproval: true` and the type system will accept it. The fix is correct (registry enforces), but this means safety depends on all tool calls flowing through the registry. If any code path bypasses the registry and calls a provider directly, the R5 invariant is not enforced. This is acceptable for a spec document (the registry is the documented composition point), but implementation tests should verify no bypass paths exist. |
| N2 | openclaw-governance-spec.md | L509, schemaVersion | `schemaVersion: number` in ApprovalRequestEvent is now generic (not literal `1`), with version negotiation documented (L561-565). The type-system role's R1 finding about no version negotiation strategy is addressed. This is an improvement. |

## Lens Checklist (R2)

| Verify item | R1 | R2 | Notes |
|-------------|:--:|:--:|-------|
| No validation weakened | FAIL | PASS | R5 enforcement moved from prose to composition logic (L384-389). `RiskClassification` mapped type couples level+label (L152-157). Design doc aligned to `RiskLevel` throughout. `extensions` has 4KB size constraint. No weakening found. |
| Error paths exhaustive | FAIL | PASS | Fail-mode table has 4 rows including Unknown/Missing/Invalid (L115). Empty registry returns deny (L102-104). ShellExecProvider handles unknown tools as R5 (L453-459). Provider timeout treated as exception per fail-mode table (L301). Error handling examples added to identity-bridge (L909-914), budget-meter (L830-834), siem-emitter (L976-979), and secret-scanner (L1044-1050). |
| No invariant made conditional | FAIL | PASS | `alwaysDenyRiskLevels` is `readonly` with JSON Schema `contains: { const: 5 }` enforcement (L626-632). R5 in the registry is "hardcoded in composition logic, NOT configurable" (L384). ReviewDecision has `requiresExternalApproval: true` as a literal (L247), not optional. No invariant is configurable. |
| R5 fail-closed preserved everywhere | FAIL | PASS | All three R1 bypass paths are closed: (a) empty registry -> deny (L102-104), (b) provider omitting `requiresExternalApproval` for R5 -> registry forces `true` (L384-389), (c) host overriding `alwaysDenyRiskLevels` -> JSON Schema enforces R5 present + `readonly` prevents mutation (L626-632). Additionally, unknown/missing risk level -> treat as R5 (L115). No new bypass paths found. |
| Timeout safety guaranteed | FAIL | PASS | `alwaysDenyRiskLevels` is `readonly RiskLevel[]` with JSON Schema `contains: { const: 5 }` (L626-632). The `failMode` field only applies to risk levels NOT in `alwaysDenyRiskLevels`. A host setting `failMode: 'allow'` still blocks R5 on timeout because R5 is in the always-deny set and cannot be removed. The design doc (approval-event-schema.md L194-196) reinforces: "Hosts MUST enforce that RiskLevel 5 always denies on timeout regardless of failMode." |

## Summary

All 4 major and 6 warning findings from R1 are resolved. The three independent R5 bypass paths -- empty registry, provider omitting `requiresExternalApproval`, and host overriding `alwaysDenyRiskLevels` -- are all closed. The fixes are structural (composition logic, `readonly` types, JSON Schema constraints, discriminated unions), not just prose amendments. Two new warnings are noted in the Aether integration plan where the notes section could mislead a reader about R5 defaults, but neither represents a safety invariant violation -- the canonical spec is correct, and the plan notes are technically accurate at the individual-provider level. All 5 lens checklist items pass. The spec is safe for upstream contribution from the safety/invariant perspective.
