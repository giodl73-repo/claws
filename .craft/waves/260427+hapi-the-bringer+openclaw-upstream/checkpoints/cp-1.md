---
checkpoint: 1
pulse_range: [01, 03]
depends_on_cp: null
review_panel: [claws:gateway-eng, claws:compliance, claws:claws-release-eng, claws:claws-repo-steward, architect, testing]
---

# Checkpoint 1 · Prep Artifacts

## Pulse Range

Pulses 01 through 03 (3 pulses).

## Dispatch Plan

All three pulses are runtime-independent and can dispatch in parallel.

- **Batch 1** (parallel, no dependencies): pulse 01, pulse 02, pulse 03

## Pulses

- [ ] Pulse 01 · `adapter-audits-guide` — Write `docs/upstream/guides/adapter-audits.md` covering both adapter audits (emitted-plugin registration + audit-stream wire-shape). HARD DEPENDENCY for cp-3 (PR-3 cannot open without this).
- [ ] Pulse 02 · `bot-preempt-checklist` — Write `docs/upstream/guides/bot-preempt-checklist.md` operationalizing UG-upstream § 2.1's 10 constraints.
- [ ] Pulse 03 · `post-merge-verification-runbook` — Write `docs/upstream/guides/post-merge-verification.md` runbook for confirming H1–H5 against trunk after each merge.

## Gate

cp-1 closes when all 3 guide files exist + are non-empty + cite the right anchors. No upstream PRs open during cp-1.

**Critical**: pulse 01's adapter-audits.md § 3 (audit-stream wire-shape) must be complete with field-by-field mapping table before cp-3 (PR-3) can open. This is the F-38 HC-BLOCK gate.

## Review Panel

Roles: claws:gateway-eng, claws:compliance, claws:claws-release-eng, claws:claws-repo-steward, architect, testing
Write to: `panels/cp-1/`

The review checks: do the guides actually answer "is the adapter shape OK"? Is the bot-preempt checklist copy-paste-able into a PR description? Does the verification runbook give the right command sequence for each headline?
