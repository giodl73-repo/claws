# PR-DRAFT 1 — Compliance review (claws/compliance)

**Subject**: `pr-drafts/PR-1.md` (post-2026-04-28 fold of former PR-2; oc://config + doctor migration emit now in scope)
**Lens**: regulatory defensibility, audit-chain integrity, SOC 2 / HIPAA mapping, e-discovery answerability, tamper-evidence.

---

## HC-BLOCK

| # | Concern | Where | Required change |
|---|---|---|---|
| B1 | "prevented from recurring" framing for `__OPENCLAW_REDACTED__` corruption (PR-1 L9 "Lossless write path prevents recurrence …") overclaims for an auditor reading cold. The 6 closed issues were patched **at the consumer** (reject-rules); this PR addresses the **substrate** plus a fail-safe lint. The two are not equivalent and a SOC 2 reviewer will mark the gap. | L9, L17 ("Aggregate") | Reword: "removes the substrate that produced the closed-issue cohort; `OC_CFG_REDACTED_PLACEHOLDER` (ERROR) is the defense-in-depth fail-safe if any other pipeline path emits the sentinel." Lossless-emit + lint-fail-safe is a two-control story; sell it as such. |
| B2 | Doctor migration emits `oc://config/...` URIs into diagnostics (L154-167) but the description **never asserts** the wire-shape contract by which a SIEM ingester / audit-correlation pipeline can rely on the URI as a stable correlator. `docs/upstream/guides/adapter-audits.md` §3.6 reserves correlation slots for `eventId` / `sessionId` / `runId` / `approvalHandleId` — `oc://config/...` is **not** in that mapping. PR-1 implies the URI is correlator-grade; the canonical mapping does not cover it. | L132 ("audit log entries"), L167 ("audit-log correlation") | Either drop the "audit-log correlation" claim from the description, or state explicitly that the URI is a **diagnostic-location** identifier (renderer / LSP / `snap resolve --uri`) and **not** an `AuditEntry` field per `adapter-audits.md` §3.3. As written, an auditor will read the PR as promising audit-log integration that the wire-shape mapping doesn't yet carry. |

## HC-WARN

| # | Concern | Where | Suggested change |
|---|---|---|---|
| W1 | `OC_CFG_REDACTED_PLACEHOLDER` ERROR severity is correct; message text in `redacted-placeholder.ts:32` is operator-actionable ("Restore from backup before saving") but the PR description does **not** surface the message verbatim or call it out as audit-log-triagable. An auditor reading a SIEM entry needs to know the rule fires deterministically and tells the operator the data-loss class. | L200 (one-line catalog row) | Add a sentence under the lint table: "`OC_CFG_REDACTED_PLACEHOLDER` carries an operator-actionable message ('… destroying the real secret. Restore from backup before saving.') so a SIEM entry triggered by this code is self-explaining." |
| W2 | Secret-ref vs literal-secret (#62438, L15 / L208) — the PR description names the lint code but commits to **no specific behavior contract**. `EVIDENCE.md:24, 50-51` records the negative-test contract (only suspicious partial forms flag; clean `${VAR}` does not). That contract is the audit defense and it's invisible from PR-1 alone. | L15, L208 | Add the negative-test contract inline in the row: "distinguishes `${VAR}` (clean — no flag) from `$VAR` / `${...` (ambiguous — NOTE)." This is the regulatory commitment, not the code listing. |
| W3 | Lint table at L198-211 is a code listing without per-code provenance (evidence issues, severity rationale). The provenance exists in `redacted-placeholder.ts:10` (`@evidence` JSDoc) and `EVIDENCE.md`, but a regulator's deep-dive needs the chain reachable from the PR description. | L198-211 | Add a column "evidence issues" to the lint table or link to `tests/lint/fixtures/EVIDENCE.md` from the PR description. The data exists; surfacing it costs nothing. |
| W4 | Plugin install/uninstall clobber (#31251, L11) is closed by lossless emit — good — but the PR description never ties this to a control. SOC 2 CC7.2 (audit-log coverage / accurate config state) is the natural mapping; HIPAA §164.312(b) (audit controls) likewise. Closing #31251 is a **control improvement**, not a bug fix, from a compliance standpoint. | L11 | Add a sentence: "Closes a known availability/integrity gap: prior to this PR, plugin install/uninstall could silently revert unrelated keys (#31251), creating a drift between operator-observed state and persisted state — a CC7.2 audit-log-coverage hazard. Lossless emit makes the bug structurally impossible." |

## HC-NOTE

| # | Note | Where |
|---|---|---|
| N1 | "Why this can't be an extension" (L19-21) and "Why governance must live in core" (L77-81) survive a HIPAA §164.312(a)(1) "access control" / §164.312(b) "audit controls" review **iff** the framing is governance-as-substrate, not governance-as-feature. The current text leans engineering-elegance ("zero adoption cost", "transparently"). One sentence reframing it as "governance controls cannot be opt-in if §164.312 requires uniform enforcement" would close the gap for auditors. | L21, L81 |
| N2 | The `oc://` URI scheme description (L130-167) uses "audit log entries" once (L132) without qualification. If B2 is resolved by scoping the URI as diagnostic-only, this stray phrase needs the same treatment. | L132 |
| N3 | `EVIDENCE.md` is the strongest defensibility artifact in the PR's substrate (frozen 2026-04-28, regen-script noted, negative-test contract explicit). It is **not linked** from PR-1. Auditors finding this file by accident is luck; auditors finding it via a citation is process. | n/a |
| N4 | F-86…F-97 (URI vocabulary tests, L216-227) do not include a "URI is stable across config rewrites" test. The audit-correlation use-case (if claimed) needs one. If B2 is resolved by dropping the audit-correlation claim, N4 falls away. | L216-227 |

## Strengths

- The lint surface lands as **detection-only** (L198) with class-by-class fixers deferred — the conservative posture an auditor expects when introducing new control surfaces.
- `redacted-placeholder.ts:23` carries the full `evidenceIssues` array in code (not just docs); this is provenance-as-code and is exactly the artifact that survives e-discovery cold-read.
- `EVIDENCE.md` snapshot date (2026-04-28), regen workflow, and negative-test section are textbook audit-trail hygiene. The file alone would defend the lint catalog in a regulatory deep-dive.
- L17 aggregate count cites 27 distinct issues — quantitative justification, not narrative.
- `replaceConfigFile` chokepoint conversion (L99-114) is the right control point; it makes "every consumer benefits transparently" defensible as a uniform-enforcement claim under §164.312(b).
- F-83 / F-84 backward-compat invariants (L188-189) directly address the "did this change behavior for existing audited deployments?" question every SOC 2 reviewer asks first.

## Verdict reasoning

The substrate work is sound and the evidence artifacts (`EVIDENCE.md`, `redacted-placeholder.ts` `@evidence`) are above the bar for a SOC 2 / HIPAA cold read. Two issues block: B1 (corruption "prevented from recurring" overclaim — fixable in one sentence) and B2 (audit-log correlation claim outruns the wire-shape mapping in `adapter-audits.md` §3.3 — either retract the claim or anchor it to a diagnostic-only scope). Neither is structural; both are description-only edits.

If B1 + B2 are addressed and W1-W4 land as suggested, the PR description is auditor-defensible cold.

## Verdict

**APPROVE-WITH-WARNINGS** — pending B1 and B2 description edits before push. HC-WARNs are recommended-not-required but each one closes a foreseeable auditor question.

**Pre-push gate**: not yet. Defensible after B1 + B2 land.
