# Panel Review: Navigator on Upstream Governance Spec (R2)

**Type**: spec
**Role**: craft/navigator
**Round**: 2
**Date**: 2026-04-15

---

## R1 Finding Resolution

| R1 ID | Status | Notes |
|-------|--------|-------|
| M1 | RESOLVED | Quick Start section added after Abstract with 3 clear entry points: "I want to add governance to my OC host," "I want portable approval UX," "I want audit trails / budget controls / secret scanning." Each links to the relevant section. The adoption funnel is clear and progressive. |
| M2 | RESOLVED | Sequence diagram (lines 649-682) now uses `decision: 'allow'`, `requiresExternalApproval: true`, `riskLevel: 5` -- fully aligned with the `AuthorizationDecision` discriminated union. Zero `allowed: true/false` references remain in the canonical spec (confirmed via grep). |
| M3 | RESOLVED | The design rationale doc (`approval-event-schema.md`) is fully updated. Lines 11, 31-37, 245-257 now use `{ decision: 'allow', requiresExternalApproval: true }` and `{ decision: 'deny' }`. The `RiskLevel` type replaces bare `number` for `risk.level` (line 95) and `alwaysDenyRiskLevels` (line 197). No stale `allowed:` references remain. |
| M4 | RESOLVED | Fail-mode table (line 110-116) now has 4 rows including "Unknown / Missing / Invalid | Fail-closed | No risk classification = treat as R5. Non-negotiable." The fail-safe is visible at a glance in the table, not buried in prose. |
| W1 | RESOLVED | Open questions (section 11) are reframed as community co-design invitations. Each question uses "Option A / Option B" structure with "The community should weigh: [tradeoff]" framing. Questions that recommend a default use "Recommended default" instead of "Current proposal." The rubber-stamp tone is gone. |
| W2 | RESOLVED | The GuardrailProvider slide (line 741) now opens with the transition bridge: "The eval pipeline checks skills at build time. But who checks tool calls at runtime?" This connects eval (compile-time) to GuardrailProvider (runtime) and gives the audience the conceptual link before showing the interface. |
| W3 | RESOLVED | Every package section now includes error-handling examples. audit-chain (line 723-727): shows `result.intact === false` with remediation guidance. budget-meter (line 830-834): shows `status.throttled` check with options (wait, alert, degrade). identity-bridge (line 908-914): shows `try/catch` with typed error codes. siem-emitter (line 976-979): shows `on('error')` handler. secret-scanner (line 1043-1050): shows findings loop with remediation guidance. |
| W4 | PARTIALLY RESOLVED | The `#8081` issue reference was removed. RBAC line now reads "most-requested governance feature (28+ reactions)" -- self-contained demand signal. However, "OC Firewall exists" and "Clawprint (3rd party) exists" still assume the audience knows what these are. These are named projects (better than issue numbers) but a first-time deck audience still has no context. Downgrading from WARNING to NOTE since the worst offender (#8081) was fixed. |
| W5 | RESOLVED | The spec now leads with Composition Model (line 69, diagram at lines 72-100) before the TypeScript interfaces (line 134). The ordering is: Problem -> Solution -> Composition Model (mental model) -> Fail-Mode (safety guarantees) -> Migration Path (adoption story) -> TypeScript Interface (contract). Concept before contract before code. |
| N1 | RESOLVED | The 100ms SLA now has a justification paragraph (lines 117-119): "The 100ms SLA on preAuthorize() exists because governance must not add perceptible latency to tool execution. If a provider exceeds 100ms, the registry treats it as a provider exception and applies the fail-mode table above." |
| N2 | RESOLVED | Plan H1 now says "6 runtime packages" (line 16) and explicitly lists all 6 including `@openclaw/approval-events`. The discrepancy between plan and spec is eliminated. |
| N3 | RESOLVED | The Aether integration plan (lines 29-32) now uses `{ decision: 'allow', requiresExternalApproval: true }` and `{ decision: 'deny' }` consistently. Zero `allowed:` references remain (confirmed via grep). |
| N4 | N/A | Positive observation (Approval Events slide structure). Still holds -- the slide at lines 770-805 remains the best-structured of the upstream slides. |
| N5 | ACKNOWLEDGED | The roadmap still uses relative weeks (lines 1167-1197). This is appropriate for the community-facing spec. The cross-reference to internal phase names (Ptah, Ra) exists in the plan file, not the spec -- correct separation. |

---

## New Findings (R2)

### Major (M)

| # | File | Section | Finding | Suggested fix |
|---|------|---------|---------|---------------|
| (none) | | | | |

### Warning (W)

| # | File | Section | Finding | Suggested fix |
|---|------|---------|---------|---------------|
| W1 | why-claws.md | Line 721 | **KEEP (8) lists only 6 items.** The "Upstream: What We Give Back" slide says "KEEP (8)" but enumerates only 6 items: Policy compiler, Guard passes, @claws/sift, Cross-format compilation, CGR emitter, Risk classification. Either 2 items are missing or the count is wrong. | Either add the 2 missing KEEP items (candidates: claws CLI surface, Expression policy enforcement -- both appear in the canonical spec's Contribute/Keep Boundary section 9) or change the header to "KEEP (6)". |
| W2 | why-claws.md | Lines 842-844 | **"OC Firewall exists" and "Clawprint (3rd party) exists" lack context for a deck audience.** A first-time viewer does not know what OC Firewall or Clawprint are. These are self-evident to OC community insiders but opaque to the target audience (enterprise decision-makers, new OC developers). | Expand to self-contained descriptions: "Cost control: OC Firewall (community project) exists but no standard API" and "Audit: Clawprint (3rd-party audit tool) exists but host-specific." One clause of context per item. |

### Notes (N)

| # | File | Section | Finding |
|---|------|---------|---------|
| N1 | openclaw-governance-spec.md | Section 1, line 134 | The TypeScript interface section is now ~290 lines (lines 134-421) -- longer than the R1 version (~240 lines) because it added the discriminated union variants, `RiskClassification`, `ExecutedResult`/`BlockedResult`, and the `ProviderRegistry` JSDoc. This is acceptable because the conceptual anchors (Composition Model, Fail-Mode, Migration Path) now precede it, so the reader already has the mental model before encountering the types. The progressive disclosure ordering is correct. |
| N2 | openclaw-governance-spec.md | Section 8 | The JSON Schema section (lines 1116-1134) addresses U-M2 from the consolidated findings. The schema generation strategy is documented: TypeScript types are source of truth, `typescript-json-schema` generates the JSON Schema files, and the invariants (`RiskClassification` constraint, `extensions` size limit, `alwaysDenyRiskLevels` contains 5) are baked into the generated schema. This is a credible delivery strategy. |
| N3 | approval-event-schema.md | Lines 192-199 | The `ApprovalTimeoutPolicy` in the rationale doc now includes JSDoc comments stating "R5 (transact) MUST always be present" and the `readonly` modifier on all fields. This aligns with the canonical spec and the R5 invariant enforcement from CONSENSUS-M3. |
| N4 | openclaw-governance-spec.md | Sections 3-7 | The `@openclaw/audit-chain` section (line 688-693) now explicitly explains the overlap with `@openclaw/siem-emitter`: "The export functionality covers historical chain data (full trail replay). For live event streaming to SIEM systems, see @openclaw/siem-emitter." The siem-emitter section (lines 948-949) mirrors this: "For historical chain export, see @openclaw/audit-chain. Both packages share the ExportFormat type." This addresses U-W1 (export overlap) from the consolidated findings. |

---

## Lens Checklist (R2)

| Verify item | R1 | R2 | Notes |
|-------------|:--:|:--:|-------|
| First-5-minutes path | FAIL | PASS | Quick Start section with 3 entry points. A new OC developer knows immediately: governance host -> read S1; portable approval UX -> read S2 + install @openclaw/approval-events; audit/budget/scanning -> jump to the package. Clear funnel. |
| Error messages user-actionable | WARN | PASS | Every package section now has an error-handling example showing what to do when things go wrong: audit-chain (broken chain remediation), budget-meter (throttled state recovery), identity-bridge (typed error codes), siem-emitter (error event handler), secret-scanner (findings loop with remediation). |
| Progressive disclosure holds | WARN | PASS | Spec leads with Composition Model diagram, then Fail-Mode table, then Migration Path, then TypeScript interfaces. Simple-first ordering is respected. The rationale doc leads with the flow diagram before the detailed schema. |
| User mental model matches spec | FAIL | PASS | Zero `allowed: true/false` references remain in any document (canonical spec, design rationale, Aether integration plan, upstream-contrib plan). All documents use `decision: 'allow'/'deny'/'review'/'modify'` consistently. The discriminated union (AllowDecision / DenyDecision / ReviewDecision / ModifyDecision) eliminates the flat-interface confusion. One mental model across all documents. |
| Journey coherence maintained | WARN | PASS | The deck now flows: eval pipeline (compile-time) -> transition bridge ("But who checks tool calls at runtime?") -> GuardrailProvider (runtime interface) -> Approval Events (runtime protocol) -> @openclaw/* packages (ecosystem). The arc is: problem -> solution -> proof -> enterprise -> platform (with compile-time to runtime bridge). Two minor deck issues remain (KEEP count, demand signal context) but these are cosmetic, not journey-breaking. |

---

## Summary

The rewrite addresses all 4 Major findings, all 5 Warning findings (one partially), and all 5 Notes. The most impactful fixes are: (1) the Quick Start section, which transforms the spec from a reference manual into an adoption guide; (2) the full `allowed` -> `decision` alignment across all documents, which eliminates the split mental model; and (3) the concept-before-contract reordering, which lets a non-TypeScript reader understand the governance model before facing 290 lines of type definitions. Two new warnings remain -- a KEEP count mismatch on the deck slide (8 claimed, 6 listed) and unnamed community projects in the demand signal -- both cosmetic and easily fixed. The spec is ready for upstream PR submission pending those two minor deck fixes.
