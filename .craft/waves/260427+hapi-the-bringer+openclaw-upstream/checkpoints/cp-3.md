---
checkpoint: 3
pulse_range: [06, 07]
depends_on_cp: 2
review_panel:
  [claws:ciso, claws:compliance, claws:gateway-eng, claws:claws-release-eng, architect, testing]
---

# Checkpoint 3 · Wave B — Small Surgical + Governance

## Pulse Range

Pulses 06 + 07 (2 pulses).

## Dispatch Plan

Pair a small surgical PR with the heavy governance package PR. Reviewers can fast-track the small one while the big one accumulates inline comments.

- **Batch 1** (parallel, depend on cp-2 merge): pulse 06 (PR-2 OC-4 stripFrontMatter), pulse 07 (PR-3 @openclaw/guardrails)

## Pulses

- [ ] Pulse 06 · `pr3-oc4-stripfrontmatter` — Open PR-2 at openclaw/openclaw modifying `src/agents/workspace.ts:91`. ~1 line change + regression test. Surgical pair to PR-3.
- [ ] Pulse 07 · `pr4-openclaw-guardrails` — Open PR-3 at openclaw/openclaw adding `@openclaw/guardrails`. HARD DEPENDENCY: pulse 01's adapter-audits.md § 3 must publish the audit-stream wire-shape mapping FIRST per HC-BLOCK F-38. Audit entries cite `oc://...` URIs natively (consumes vocabulary from PR-1+PR-2).

## Gate

cp-3 closes when BOTH PRs MERGE at openclaw/openclaw AND post-merge verification reports:

- H2 GREEN against trunk: hash-chain integrity + approval-handle replay-resistance + zero-`@microsoft/*` gate
- H5-partial GREEN (OC-4 portion): round-trip on templated SOUL.md / TOOLS.md emits byte-identical bytes via `result.raw`
- Audit-stream adapter audit verdict re-checked against post-merge trunk (no drift since cp-2 merged)
- Audit entries in test fixtures show `oc://...` URIs (workspace + config) as actor / source / location fields where appropriate

**Critical**:

- adapter-audits.md § 3 must be complete BEFORE pulse 07 opens (F-38 hard dependency).
- Both PRs must cite the bot-preempt checklist + Wave A merge SHAs in their descriptions.
- Audit-attribution invariant (sourcePluginId mandatory) lands in PR-3 — first PR to ship that.

## Review Panel

Roles: claws:ciso, claws:compliance, claws:gateway-eng, claws:claws-release-eng, architect, testing
Write to: `panels/cp-3/`

CISO + compliance lead this review because cp-3 carries the security-invariant changes (audit-stream wire shape, audit attribution mandatory `sourcePluginId`, approval-handle binding). Gateway-eng verifies OC-4's surgical change. Release-eng watches the upstream audit-stream wire shape against bot-reviewer pushback patterns from cp-2's merged PRs.
