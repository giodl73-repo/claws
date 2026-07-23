# Signals fork stack consolidation

## Decision

Keep the reviewed fork drafts #145-#150 frozen as evidence snapshots. Do not
combine, squash, or routinely rebase them. They are six owner-local candidates,
not one deployable runtime stack.

When an owner selects a candidate, promote only that slice onto then-current
`openclaw/openclaw` main or its required owner branch, regenerate artifacts
there, rerun its focused proof, and open no upstream PR without explicit user
approval.

## Live inventory

| PR   | Commit        | Files |    Delta | Owner surface                        |
| ---- | ------------- | ----: | -------: | ------------------------------------ |
| #145 | `381c85fea31` |     5 |  +135/-1 | Telegram draft delivery              |
| #146 | `0ac31a744a5` |    12 | +544/-64 | Codex-native tool results            |
| #147 | `aa2b1420ba8` |     1 |   +37/-0 | Contributor testing guidance         |
| #148 | `d6978e25f6c` |     9 | +179/-16 | Outbound Plugin SDK hooks            |
| #149 | `a614815a4ce` |     8 |  +251/-6 | Subagent diagnostics-otel projection |
| #150 | `06ed6cb65ba` |     2 |  +111/-1 | Runtime LLM usage diagnostics        |

All six PRs were live-checked after the review corrections on 2026-07-21. They
are open fork-only drafts. Each contains exactly one commit whose parent tree
matches its advertised base. Their Markdown bodies match the local body files,
and they have no review comments or submitted reviews. Current check failures
are limited to fork-inapplicable `auto-response` and, on #147 and #149,
`label` workflows. Seven checks succeeded per head while 30 to 50 checks were
skipped; these fork runs do not prove every standalone upstream lane.

The cumulative branch changes 36 files, +1257/-88. No later slice edits a file
touched by an earlier slice.

## Independence audit

Temporary-index three-way application against `origin/main` at
`8f31892b5509606399eb56cad3650a0acb9ed124` showed:

- #146, #147, #148, #149, and #150 patches apply independently;
- #145 conflicts only in the contributor-owned Telegram warning test; and
- no runtime or source dependency requires #146-#150 to remain stacked.

Patch application is not standalone CI proof. The reviewed #146 and #148
commits now carry generated records for their exact stacked parents, but a
fresh independent promotion still requires regeneration from its owner base.

PR #145 is intentionally based on the preserved pre-Signals tree of contributor
PR openclaw/openclaw#111065 at
`9a49d40a94700a9581868e0b6e39ff5b9a3af980`. Contributor head
`917815b6049364b51497dbb7a4c519eccef42c71` contains the Signals commit
followed by its scope-reduction revert, leaving the same tree as the fork base.
Fast-forwarding the fork base to that head would put the candidate and its
revert into base history and erase the useful PR boundary. Recreate #145 on the
accepted owner base when it is promoted instead.

Both current-main applicability and contributor-tree equivalence are
point-in-time evidence. Recheck the owner seam and branch relationship at
promotion rather than assuming the old fixtures can simply be replayed.

## Generated-artifact finding

PR #148 regenerated `plugin-sdk-api-baseline.sha256` on top of #146. Its
`agent-harness` and `agent-harness-runtime` hashes therefore account for #146's
new exported native-relay context, while its `channel-message`,
`channel-outbound`, and `infra-runtime` hashes account for #148.

The initial stack review found that #146 lacked its own generated API records
and #148 carried a stale cumulative `infra-runtime` hash. The corrected stack
regenerates the manifest at both owner commits:

- #146 owns the hashes caused by its native-relay export; and
- #148 owns the further hashes caused by outbound run correlation.

The cumulative manifest passes its generator check. Promotion branches must
still regenerate from their then-current base rather than cherry-picking a
historical generated manifest unchanged.

## Formal review closeout

Commit-level Codex review reported four P2 candidates:

- rejected for #145: delivery terminal events are explicitly self-contained in
  current OTel and Prometheus consumers, not paired to
  `message.delivery.started`;
- fixed in #146: failed structured Codex items no longer wait ten seconds for a
  success-only `PostToolUse` callback;
- fixed in #148: durable recovery records no longer persist a live `runId`; and
- fixed in #150: runtime LLM usage now includes derived `promptTokens`.

PRs #147 and #149 were clean. The corrected cumulative patch completed a final
`codex review --uncommitted` with no actionable findings.

## FACES evaluation

### Gateway/runtime owner

- Accept each candidate only at its existing owner transition.
- Do not make runtime slices depend on the testing guide or another subsystem's
  implementation.
- Preserve disabled/inactive behavior and existing asynchronous projections.

### Operator

- The candidates are useful independently: delivery failure, structured tool
  result, run correlation, subagent termination, and usage attribution answer
  different operational questions.
- Do not describe the cumulative branch as a complete observability platform.
- Refresh mixed-version and exporter proof only for a selected promotion.

### Maintainer and skeptical simplicity

- No umbrella implementation PR, shared package, event envelope, registry, or
  central conformance suite is justified.
- #146 is the largest and highest-coupling candidate; route it separately to
  agent-runtime and Plugin SDK owners.
- Hold #147 as documentation evidence until at least two runtime owners accept
  the pattern; do not use documentation to pre-approve the contracts.

## Promotion map

| Candidate | Promotion posture                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #145      | Recreate after Telegram and diagnostics owners decide the relationship to #111065.                                                                                  |
| #146      | Promote independently; regenerate its Plugin SDK API hashes and rerun the native relay/projector proof.                                                             |
| #147      | Hold until two independent semantic owners accept the exact conformance obligations demonstrated by their slices.                                                   |
| #148      | Promote independently; regenerate its resulting Plugin SDK API hashes and preserve recovery omission.                                                               |
| #149      | Promote independently to diagnostics-otel and subagent lifecycle owners.                                                                                            |
| #150      | Do not promote unchanged. Use it as minimal evidence against upstream #107937; omit plugin-completion duration if owners select the compatibility-preserving shape. |

The fork stack is now an evidence catalog. Owner selection, not stack order,
determines the next implementation branch.
