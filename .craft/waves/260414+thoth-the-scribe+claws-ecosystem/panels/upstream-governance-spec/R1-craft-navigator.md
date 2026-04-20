# Panel Review: Navigator on Upstream Governance Spec

**Type**: spec
**Role**: craft/navigator
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
| M1 | openclaw-governance-spec.md | Abstract / Table of Contents | **No "Start Here" signpost for the adoption funnel.** The spec lists 6 packages in sections 3-8 but never tells a new OC developer which one to install first or what the minimum viable adoption looks like. A community developer reading this cold has no progressive entry point -- they face 6 packages at equal weight. The ToC reads like a reference manual, not an adoption guide. | Add a "Quick Start" or "Where to Begin" section after the Abstract. Three paths: (1) "I want to add governance to my host" -- start with GuardrailProvider + ShellExecProvider; (2) "I want audit trails" -- `npm install @openclaw/audit-chain`; (3) "I want the approval protocol" -- `npm install @openclaw/approval-events`. One sentence per path. The funnel should be: interface spec first, then approval-events or audit-chain, then the rest. |
| M2 | openclaw-governance-spec.md | Section 2, lines 583-611 | **Sequence diagram uses `allowed: true` but the TypeScript interface uses `decision: 'allow'`.** The diagram on line 585 shows `{ allowed: true, requiresExternalApproval: true, riskLevel: 5 }` but `AuthorizationDecision` (line 111) has `decision: AuthorizationOutcome` not `allowed: boolean`. A community reviewer will immediately flag this as inconsistent. This also appears in approval-event-schema.md lines 14, 29-31, 37, 249 where `allowed: true/false` is used instead of the canonical `decision` field. | Align the sequence diagram and the design rationale doc to use the canonical TypeScript interface shape: `{ decision: 'allow', requiresExternalApproval: true, riskLevel: 5 }`. Search both files for every occurrence of `allowed:` and replace with the `decision:` form. |
| M3 | approval-event-schema.md | Lines 14, 29-31, 37, 248-250 | **Design rationale doc uses stale interface shape throughout.** The rationale doc was likely written before the canonical spec was finalized. Every reference to `{ allowed: true, ... }` and `{ allowed: false }` contradicts the canonical spec's `AuthorizationDecision` type. If a host developer reads the rationale doc to understand "why," they will learn the wrong field names for "how." | Do a full pass on approval-event-schema.md replacing all `allowed: true/false` with the canonical `decision: 'allow'/'deny'` form. The rationale doc must be consistent with the canonical spec it references. |
| M4 | openclaw-governance-spec.md | Section 1, lines 406-415 | **Fail-mode spec has a chicken-and-egg problem for community developers.** The fail-mode is determined by "the tool's risk level as reported by the provider that threw." But if the provider threw an exception, it may not have classified the tool yet. The spec says "if the provider didn't classify the tool, the Gateway defaults to fail-closed" -- but this is buried in prose after the table. A host implementor scanning the table will miss this critical default. | Move the "default to fail-closed when unclassified" rule INTO the table as a fourth row: "Unknown / unclassified | Fail-closed | No risk level reported -- safety default." This makes the fail-safe visible at a glance. |

### Warning (W)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| W1 | openclaw-governance-spec.md | Section 11, lines 1087-1112 | **Open questions are framed as Craftworks asking for permission, not as community design decisions.** Questions 1, 2, 3, 5, 6, 7 all say "Current proposal: ..." which reads as "we decided, please rubber-stamp." Compare to how RFCs frame alternatives: "Option A: ... Option B: ... Tradeoffs: ..." The tone matters for positioning -- this should feel like the community is being invited to co-design, not approve a fait accompli. | Reframe each question as: "Context: [why this matters]. Option A: [current proposal]. Option B: [alternative]. The community should weigh: [tradeoff]." Drop the phrase "Current proposal" -- it implies the decision is already made. Use "Recommended default" if you want to signal preference without claiming authority. |
| W2 | why-claws.md | Slides 690-762 (GuardrailProvider slide) | **The GuardrailProvider slide (line 737+) jumps from "exec-approvals.json is binary" to a 6-column sequence without intermediate explanation.** The slide expects the reader to already understand what a "provider" is in this context. In the deck flow, the previous slide is the eval pipeline -- a completely different topic. There is no transition slide that says "governance needs an interface, here's why." | Add a one-line transition at the top of the GuardrailProvider slide or a bridge slide before it: "The eval pipeline checks skills. But who checks tool calls at runtime? Today: a static JSON file. Tomorrow: a composable provider chain." This connects the eval pipeline (compile-time) to GuardrailProvider (runtime). |
| W3 | openclaw-governance-spec.md | Sections 3-8, package descriptions | **Package sections lack error handling examples.** Every API example shows the happy path. A community developer implementing `@openclaw/audit-chain` will immediately ask: "What happens when `chain.verify()` finds a broken chain? What do I do with `brokenAt`?" The types define `brokenAt` and `brokenReason` but the usage example never shows the failure path. Same for `BudgetMeter` -- what happens after `throttled: true`? | Add one error-handling example per package section. For audit-chain: show `result.intact === false` and what to do (re-anchor? alert? quarantine?). For budget-meter: show the `throttled: true` state and how to recover (reset? wait?). These don't need to be long -- 3-4 lines each showing the developer what to do when things go wrong. |
| W4 | why-claws.md | Lines 809-845 (@openclaw/* slide) | **The @openclaw/* packages slide lists "COMMUNITY DEMAND" evidence but the evidence is Craftworks-internal.** "#8081" and "OC Firewall" and "Clawprint" are references that only make sense if you already follow the OC issue tracker. A deck audience seeing this for the first time won't know what "#8081" is. The slide mixes internal knowledge with external positioning. | Either link the references (if the deck is shared digitally) or replace with self-contained descriptions: "RBAC: 28+ reactions on the most-requested governance feature" rather than "RBAC: 28+ reactions on #8081." The audience should understand the demand signal without opening a browser. |
| W5 | openclaw-governance-spec.md | Section 1, lines 59-297 | **The TypeScript interface block is 240 lines before the first diagram.** A community developer who is not a TypeScript author (Python host implementor, Go gateway contributor) faces a wall of TypeScript before understanding the conceptual model. The composition diagram (line 374) and migration path (line 419) are the conceptual anchors, but they come after the full type system. | Move the Composition Model diagram and Migration Path BEFORE the full TypeScript interface. Lead with the mental model ("here's how providers compose"), then the types ("here's the contract"), then the reference implementation ("here's a working example"). Concept before contract before code. |

### Notes (N)

| # | File | Line/Section | Finding |
|---|------|-------------|---------|
| N1 | openclaw-governance-spec.md | Section 1, line 173 | `preAuthorize()` has a 100ms SLA ("MUST complete within 100ms"). This is good for the spec but the number is not justified. A note explaining why 100ms (human-perceptible latency threshold) would help community reviewers who will inevitably ask "why not 50ms? why not 200ms?" |
| N2 | claws-upstream-contrib.md | Line 16 | Plan says "5 runtime packages" but the canonical spec defines 6 packages (audit-chain, budget-meter, identity-bridge, siem-emitter, secret-scanner, approval-events). The plan's H1 headline excludes approval-events from the count. This creates a small but confusing discrepancy between the plan and the spec. |
| N3 | claws-aether-integration.md | Lines 29-32 | Validation criteria use `{ allowed: true, requiresExternalApproval: true }` -- same stale interface shape as M2/M3. These should also be updated to `{ decision: 'allow', requiresExternalApproval: true }` for consistency with the canonical spec. |
| N4 | why-claws.md | Lines 766-802 (Approval Events slide) | The Approval Events slide is strong -- it leads with the problem (every host invents its own format), shows the schema visually, and ends with the npm install. This is the best-structured of the 3 new slides. Good progressive disclosure: problem, then schema, then package. |
| N5 | openclaw-governance-spec.md | Section 10, lines 1046-1083 | The delivery roadmap says "Wave 1 (Weeks 1-4)" but does not anchor to a calendar date. For a community-facing spec, relative weeks are fine. But internally, the plan references "Phase 1 (Ptah)" and "Phase 4 (Ra)" -- ensure these are cross-referenced somewhere so the team knows the mapping. |

---

## Lens Checklist

| Verify item | Pass? | Notes |
|-------------|-------|-------|
| First-5-minutes path works | FAIL | No "start here" signpost. A new OC developer cannot determine which package to install first or what the minimum viable integration looks like. The spec reads as a reference, not as an onboarding path. (M1) |
| Error messages user-actionable | WARN | The TypeScript types define error states (`brokenAt`, `blockReason`, `throttled`) but the usage examples never show what to do with them. A developer who hits an error has types but no guidance. (W3) |
| Progressive disclosure holds | WARN | The spec puts the full 240-line TypeScript interface before the conceptual diagrams. Simple-first ordering is violated: types before mental model. The approval-events slide in the deck does this right -- the spec should match that pattern. (W5) |
| User mental model matches spec | FAIL | The canonical spec uses `decision: 'allow'` but the design rationale and sequence diagrams use `allowed: true`. Two mental models for the same concept. A developer reading both docs will be confused about which is correct. (M2, M3, N3) |
| Journey coherence maintained | WARN | The 3 new deck slides (GuardrailProvider, Approval Events, @openclaw/*) tell a coherent story individually but the transition from eval pipeline to GuardrailProvider is abrupt. The deck arc is: problem, solution, proof, enterprise, platform -- the new slides sit in "platform" but need a bridge from compile-time (eval) to runtime (governance interface). (W2) |

---

## Summary

The spec is architecturally sound and the contribute/keep boundary is clear -- this is a genuine ecosystem contribution, not a trojan horse. However, the document fails the first-5-minutes test: a community developer reading it cold cannot find their entry point, faces 240 lines of TypeScript before understanding the conceptual model, and will hit contradictory field names (`allowed` vs `decision`) between the canonical spec and its companion documents. The two highest-priority fixes are (1) adding a "start here" adoption funnel and (2) aligning every document to the canonical `AuthorizationDecision` type shape -- the field-name inconsistency is the kind of thing that gets a spec PR rejected on first review.
