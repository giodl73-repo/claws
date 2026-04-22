# R1 Consolidated — Upstream Governance Spec Review

**Panel**: upstream-governance-spec
**Type**: spec
**Round**: 1
**Date**: 2026-04-15
**Roles**: architect (D), dragon (A), navigator (E), type-system (C)

---

## Totals

| Role | Major | Warning | Notes | Total |
|------|-------|---------|-------|-------|
| architect | 4 | 6 | 3 | 13 |
| dragon | 4 | 6 | 3 | 13 |
| navigator | 4 | 5 | 5 | 14 |
| type-system | 4 | 7 | 4 | 15 |
| **Raw total** | **16** | **24** | **15** | **55** |
| **After dedup** | **8** | **13** | **9** | **30** |

---

## Consensus Findings (flagged by 2+ roles)

These carry the highest confidence — multiple independent perspectives converged.

### CONSENSUS-M1: `allowed: true/false` vs `decision: 'allow'/'deny'` field mismatch

**Flagged by**: architect (M2, M3), navigator (M2, M3), dragon (implicit in W3/W4)
**Severity**: Major
**Files**: approval-event-schema.md, claws-aether-integration.md, openclaw-governance-spec.md (sequence diagram)

The canonical spec defines `AuthorizationDecision.decision: AuthorizationOutcome` (a string union), but the design rationale doc, the Aether integration plan, and the canonical spec's own sequence diagram all use a stale `{ allowed: true/false }` shape. An OC reviewer reading across these files will see contradictory field names.

**Fix**: Full pass across all 3 documents replacing every `allowed: true/false` with `decision: 'allow'/'deny'`.

### CONSENSUS-M2: AuthorizationDecision should be a discriminated union

**Flagged by**: type-system (M1), architect (implied by M2 field inconsistency)
**Severity**: Major
**File**: openclaw-governance-spec.md, Section 1

The flat interface with 5 optional fields allows invalid states: `{ decision: 'allow', modifiedArguments: {...} }` or `{ decision: 'modify' }` with no `modifiedArguments`. Once published as a v1.0 API, fixing this requires semver-major.

**Fix**: Replace with 4-variant discriminated union: `AllowDecision | DenyDecision | ReviewDecision | ModifyDecision`. Each variant carries only its valid fields.

### CONSENSUS-M3: R5 fail-closed has 3 independent bypass paths

**Flagged by**: dragon (M1, M2, M3), type-system (W2)
**Severity**: Major
**File**: openclaw-governance-spec.md

Three paths to R5 bypass, all enforced by prose only:
1. **Empty registry** defaults to `{ decision: 'allow' }` — all tools pass including R5
2. **Provider omitting `requiresExternalApproval`** for R5 gets `false` default — no host gate
3. **Host overriding `alwaysDenyRiskLevels: []`** — R5 auto-approves on timeout

**Fix**: (1) Empty registry → fail-closed (deny). (2) ProviderRegistry composition logic forces `requiresExternalApproval: true` when any provider reports `riskLevel: 5`. (3) Hardcode R5 in `alwaysDenyRiskLevels` via JSON Schema `contains: { const: 5 }` and `readonly` type.

### CONSENSUS-M4: Unknown/unclassified risk level has no fail-mode row

**Flagged by**: dragon (M4), navigator (M4)
**Severity**: Major
**File**: openclaw-governance-spec.md, Fail-Mode table

The table has R1-R2, R3-R4, R5 but no row for unknown/missing/invalid risk level. The prose says "default to fail-closed" but a host implementor scanning the table misses this.

**Fix**: Add a 4th row: `Unknown / Missing / Invalid | Fail-closed | Treat as R5. Non-negotiable.`

### CONSENSUS-W1: Plan says "5 packages" but spec has 6

**Flagged by**: architect (W3), navigator (N2)
**Severity**: Warning
**File**: claws-upstream-contrib.md, H1

H1 headline says "5 runtime packages" — stale count after adding `@openclaw/approval-events`.

**Fix**: Update H1 to "6 runtime packages".

### CONSENSUS-W2: Design rationale doc uses `number` where canonical uses `RiskLevel`

**Flagged by**: dragon (W3, W4), type-system (W6, W7)
**Severity**: Warning
**File**: approval-event-schema.md

`risk.level: number` and `alwaysDenyRiskLevels: number[]` in the rationale doc vs `RiskLevel` (1|2|3|4|5) in the canonical spec. A host implementing from the rationale doc gets weaker types.

**Fix**: Align rationale doc to use `RiskLevel` throughout.

### CONSENSUS-W3: Deck "CONTRIBUTE (19)" count doesn't match listed items

**Flagged by**: architect (W5), navigator (W4 tangential)
**Severity**: Warning
**File**: why-claws.md, slide ~L707

The "CONTRIBUTE (19)" header lists only 10 items visually. The number can't be verified from the slide.

**Fix**: Either enumerate all 19 or match the count to what's shown.

---

## Unique Findings (single role)

### Major

| ID | Role | Finding | File |
|----|------|---------|------|
| U-M1 | architect | ShellExecProvider uses `readFileSync` with no import — not copy-paste runnable | openclaw-governance-spec.md |
| U-M2 | architect | JSON Schema promised for approval-events but not delivered in spec | openclaw-governance-spec.md §8 |
| U-M3 | type-system | `AuditableResult` should be `ExecutedResult | BlockedResult` discriminated union | openclaw-governance-spec.md |
| U-M4 | type-system | `risk.level` and `risk.label` have no type-level coupling — mismatches compile | openclaw-governance-spec.md + approval-event-schema.md |

### Warning

| ID | Role | Finding | File |
|----|------|---------|------|
| U-W1 | architect | audit-chain and siem-emitter both own format serialization (SARIF/CEF/etc) — overlap | openclaw-governance-spec.md §3 |
| U-W2 | architect | 100ms SLA on preAuthorize() is advisory with no enforcement mechanism | openclaw-governance-spec.md §1 |
| U-W3 | architect | Python adapter → TypeScript audit-chain cross-language dependency unexplained | claws-aether-integration.md |
| U-W4 | architect | identity-bridge claims "zero dependencies" but OIDC needs JWKS keys | openclaw-governance-spec.md §5 |
| U-W5 | dragon | `extensions` field is an untyped escape hatch — exfiltration vector | openclaw-governance-spec.md §2 |
| U-W6 | dragon | Deck claims Ed25519 but spec only defines HMAC-SHA256 | why-claws.md vs openclaw-governance-spec.md |
| U-W7 | navigator | No "Start Here" adoption funnel in the canonical spec | openclaw-governance-spec.md |
| U-W8 | navigator | Open questions framed as "current proposal" (rubber-stamp tone) | openclaw-governance-spec.md §11 |
| U-W9 | navigator | 240 lines of TypeScript before first conceptual diagram | openclaw-governance-spec.md §1 |
| U-W10 | navigator | Package sections lack error-handling examples (happy path only) | openclaw-governance-spec.md §3-8 |
| U-W11 | type-system | `ToolCall.context` index signature silently absorbs typos | openclaw-governance-spec.md |
| U-W12 | type-system | `schemaVersion: 1` literal with no version negotiation strategy | openclaw-governance-spec.md |
| U-W13 | type-system | `ExportFormat` differs between audit-chain (`json`) and siem-emitter (`ndjson`) | openclaw-governance-spec.md |

### Notes

| ID | Role | Finding |
|----|------|---------|
| U-N1 | architect | `modify` outcome implies providers understand tool argument schemas — coupling undocumented |
| U-N2 | architect | `compilerVersion` in host-approval-policies.json is Craftworks-internal |
| U-N3 | dragon | ShellExecProvider `allow` + `requiresExternalApproval` — safety depends on host honoring optional field |
| U-N4 | dragon | `ToolCall.arguments` "MUST NOT modify" is prose only — no freeze/clone enforcement |
| U-N5 | navigator | 100ms SLA number unjustified — community will ask "why not 50ms?" |
| U-N6 | navigator | Approval Events slide is well-structured (positive) — model for other slides |
| U-N7 | type-system | `ProviderCapabilities.name` duplicates `GuardrailProvider.name` — identity contradiction possible |
| U-N8 | type-system | `register()` returns void with no error on duplicate names |
| U-N9 | type-system | `Identity.roles` and `Identity.groups` both `string[]` — no type distinction |

---

## Priority Action Items

### Must-Fix Before Spec PR (Blockers)

1. **CONSENSUS-M1**: Fix `allowed` → `decision` field mismatch across all 3 docs
2. **CONSENSUS-M2**: Refactor AuthorizationDecision to discriminated union (pre-v1.0)
3. **CONSENSUS-M3**: Enforce R5 fail-closed in composition logic, not just prose
4. **CONSENSUS-M4**: Add "Unknown/Missing" row to fail-mode table
5. **U-M4**: Couple risk.level to risk.label in a mapped type

### Should-Fix Before Spec PR (High Value)

6. **U-M2**: Provide JSON Schema content or explicit generation strategy
7. **U-M3**: Refactor AuditableResult to discriminated union
8. **U-W7**: Add "Quick Start" / adoption funnel section
9. **U-W9**: Reorder spec: concept diagram → types → reference impl
10. **CONSENSUS-W1**: Fix "5 packages" → "6 packages" in plan H1

### Fix in Round 2 (Lower Priority)

11. **U-W1**: Clarify audit-chain vs siem-emitter export overlap
12. **U-W5**: Add size constraint + sanitization guidance for extensions field
13. **U-W8**: Reframe open questions as community co-design invitations
14. **U-W10**: Add one error-handling example per package section
15. **CONSENSUS-W3**: Align deck "CONTRIBUTE" count to listed items

---

## Lens Summary Across Roles

| Lens | architect (D) | dragon (A) | navigator (E) | type-system (C) |
|------|:---:|:---:|:---:|:---:|
| Structural clarity | PASS | — | — | — |
| Contribute/keep boundary | PASS | — | — | — |
| R5 invariant enforced | — | FAIL | — | — |
| Fail-mode exhaustive | — | FAIL | — | — |
| Timeout safety | — | FAIL | — | — |
| First-5-minutes path | — | — | FAIL | — |
| Progressive disclosure | — | — | WARN | — |
| User mental model | — | — | FAIL | — |
| Discriminated unions | — | — | — | FAIL |
| Invalid states prevented | — | — | — | FAIL |

**Overall**: The architecture is sound (architect passes). The security invariants leak (dragon fails across the board). The developer journey needs a starting point (navigator fails on adoption). The type contracts need discriminated unions before v1.0 publish (type-system fails on exhaustiveness).

---

## Recommended Next Step

Fix the 5 blockers (CONSENSUS-M1 through M4 + U-M4), then run **Round 2** with the same 4 roles to verify fixes and check for regressions.
