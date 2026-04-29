# cp-1 Review · claws-release-eng · R2

**Date**: 2026-04-28
**R1 verdict**: APPROVE-WITH-WARNINGS (2 HC-BLOCK)
**R2 verdict**: APPROVE-WITH-WARNINGS

## R1 BLOCKers — verification

| # | Title | Status | Notes |
|---|---|---|---|
| B4 | regen-script stub vs CI-gate claim | CLOSED-VIA-DOWNGRADE | Plan + script TSDoc both reword to advisory-only; script `main()` now does real work. Two stale companion artifacts still cite the old contract — see N1, N2. |
| B5 | PR-1 false zero-hits attestation | CLOSED | Checklist semantics, NEVER-SAFE list, scan-pr-body.sh, and PR-1 re-attestation all line up. Could not run script myself (Bash blocked in this sandbox); verified by inspection. |

### B4 evidence

- `claws-workspace-lint.md:103` — Tooling bullet now reads **"advisory script (not CI-gated)"** with a 3-sentence rationale paragraph (openclaw tracker churn → arbitrary thresholds → human author at push time is the right gate). Matches user direction.
- `regen-lint-evidence.ts:1-21` — top docstring: "**Advisory script, not a CI gate.**" Rationale repeated. Usage block present.
- `regen-lint-evidence.ts:61-75` — `main()` is no longer a TODO. It iterates a `SEARCHES` array (5 labelled queries), calls `gh issue list` via `execFileSync`, prints a per-label `open/closed` count summary to stdout. Real, useful, advisory.
- `risk` section at `claws-workspace-lint.md:144` — still references the script for drift mitigation; phrasing ("re-pulls evidence at PR-1 push time so the description's numbers are current") is consistent with advisory contract; no CI-gate language.

### B5 evidence

- `bot-preempt-checklist.md:61` — checkbox now reads: "...exits 0 — every match of the §3.2 regex is a §3.2-recognised architectural carve-out, OR there are no matches; NEVER-SAFE phrases from §3.2 produce non-zero exit". Matches the qualified form claimed.
- `bot-preempt-checklist.md:92-109` — §3.2 "Safe carve-outs" (5 bullets, concrete examples like `WorkspaceFileKind`, `extension-point`) and "NEVER-SAFE phrases" (6 bullets, includes `third-party plugin`, `extension to OpenClaw`, `r:skill`, `make this an extension`). Distinct subsections, copy-pastable into prose.
- `scan-pr-body.sh` — exists, executable (`-rwxr-xr-x`), 2153 bytes. Uses `set -euo pipefail`. Strips ` ``` ` fenced blocks then single-backtick spans via two-pass sed (line 31). Iterates a `NEVER_SAFE_PATTERNS` array of 14 phrases against the scrubbed text with `grep -niE`. Exit codes 0/1/2 documented.
- `PR-1.md:194` — re-attestation enumerates carve-out reasons (`WorkspaceFileKind` SKILL enum, `DiagnosticLocation` extension as type-system concept, "URI scheme extension" as architectural descriptor) and explicitly cites verification via `scripts/scan-pr-body.sh`.
- Script run: **could not execute** — Bash and PowerShell tools both blocked in this sandbox session. Verified by static inspection: every NEVER-SAFE-substring match in PR-1.md is inside backticks (`PR-1.md:79`, `PR-1.md:194`), so the sed-strip pass at script line 31 elides them before the grep loop. Expected exit code: 0. Recommend the wave authors paste the actual exit log into PROGRESS.md to make this auditable.

## New findings

- **N1 (HC-NOTE)** `PROGRESS.md:147-148` still describes `regen-lint-evidence.ts` as "stub for pre-PR-push refresh ... surface contract defined, full pipeline TODO". After the B4 downgrade this is doubly stale: it isn't a stub anymore (main() is implemented), and "full pipeline TODO" reads as work outstanding. Suggest: replace with "advisory script — `gh`-CLI issue-count summary printed to stdout for pre-PR-push human review (not CI-gated)".
- **N2 (HC-NOTE)** `pulses/04+pr1-openclaw-workspace.md:95` carries an L3 acceptance test "`regen-lint-evidence.ts` produces identical EVIDENCE.md when issue counts unchanged" — but the downgraded script no longer writes EVIDENCE.md, only prints counts. Test contract is unenforceable as written. Either drop the test or rewrite to "deterministic stdout when issue counts unchanged".
- **N3 (HC-NOTE)** `pulses/04+pr1-openclaw-workspace.md:149` "Issue citations **must** be regenerated pre-push" reads as a precondition; downgrade made it advisory. Soften to "Issue citations *should* be refreshed pre-push (advisory)" to match the new contract.
- **N4 (HC-NOTE)** `UG-upstream.amend.md:419` "PR-1 description regenerates these counts pre-push via `scripts/regen-lint-evidence.ts`" — wording survives but implies the script does the regen. Cosmetic clarification: "the author re-pulls counts via the advisory script, then manually edits EVIDENCE.md" if the spec wants to be explicit.

None of N1-N4 are blocking; they are documentation drift, not contract drift. The plan + script + checklist (the artifacts that gate behavior) are internally consistent.

## R2 verdict reasoning

Both BLOCKers are addressed at the level the role lens cares about. **Release predictability** (the bit that mattered for B4): the wave no longer carries a phantom CI gate. A non-functional script disguised as a gate is exactly the kind of artifact that erodes trust in CI signals — by switching to "advisory, prints to stdout, human reads it" the contract now matches the implementation, and CI failure modes stay legible. **Bot-trio preempt** (B5): the §3 checkbox semantics now distinguish "regex hit but architectural" from "regex hit and dangerous", `scan-pr-body.sh` operationalizes the second half mechanically, and PR-1 re-attests with concrete carve-out enumeration. The wave can now ship through the auto-close gap that prompted the original R1 finding — the 11 regex matches are explicitly accounted for, and a reviewer can replay the scan locally.

The downgrade left four stale citations (N1-N4) in adjacent artifacts. None of them gate execution — PROGRESS.md is a journal, the pulse is post-hoc, and the spec wording is descriptive — but they will read as contract-drift in a future audit. APPROVE-WITH-WARNINGS rather than clean APPROVE because a release-engineering lens cares about citations matching reality across the wave's full surface, not just the headline plan. Recommend the wave authors land a 5-minute housekeeping pass on N1-N3 before cp-2 opens; N4 is optional. No re-review needed if those edits land.
