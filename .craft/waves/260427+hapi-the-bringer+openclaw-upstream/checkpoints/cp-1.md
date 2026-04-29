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

- [x] Pulse 01 · `adapter-audits-guide` — `docs/upstream/guides/adapter-audits.md` (20.3KB) — emitted-plugin registration audit + audit-stream wire-shape (field-by-field CEF/NDJSON/syslog/SARIF mapping table) + runtime-gated enforcement + re-audit cadence. F-38 HC-BLOCK closed. Verification gate green.
- [x] Pulse 02 · `bot-preempt-checklist` — `docs/upstream/guides/bot-preempt-checklist.md` (11.5KB) — 10 operating constraints + copy-paste per-PR checklist + pre-flight commands + reviewer patterns + citation anchors. Verification gate green.
- [x] Pulse 03 · `post-merge-verification-runbook` — `docs/upstream/guides/post-merge-verification.md` (14.8KB) — `gh api` recipe + per-headline H1-H5 validators + codemod gate (W1) + failure modes + CHANGELOG format. Verification gate green.

## Gate

cp-1 closes when all 3 guide files exist + are non-empty + cite the right anchors. No upstream PRs open during cp-1.

**Critical**: pulse 01's adapter-audits.md § 3 (audit-stream wire-shape) must be complete with field-by-field mapping table before cp-3 (PR-2) can open. This is the F-38 HC-BLOCK gate.

## Review Panel

Roles: claws:gateway-eng, claws:compliance, claws:claws-release-eng, claws:claws-repo-steward, architect, testing
Write to: `panels/cp-1/`

The review checks: do the guides actually answer "is the adapter shape OK"? Is the bot-preempt checklist copy-paste-able into a PR description? Does the verification runbook give the right command sequence for each headline?
