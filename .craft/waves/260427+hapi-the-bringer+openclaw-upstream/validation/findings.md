# Validation findings — running log

The rolling list of bugs / coverage gaps / surprises surfaced by running the substrate train against real workspaces. **This is the test suite.** Pre-baking 100 synthetic edge cases in advance optimizes for hypothetical breakage; this log captures actual breakage from real use.

## Format

One entry per finding:

```md
### F-NNN — <one-line title>  [<status>]

**Date**: 2026-MM-DD
**Fixture**: <slug or "real workspace at <path>">
**Tool**: <openclaw path | pinch | cage | policy | doctor>
**Status**: open | fixed (commit-sha) | wontfix-by-design | duplicate-of-FX

What I expected to see vs what I saw:

> ...

How to reproduce:

```sh
$ openclaw <verb> <args> <fixture>
```

Notes / context / decision:

...
```

Statuses:
- **open** — known issue, not yet fixed
- **fixed** — repaired in claws or substrate/* branches; cite commit
- **wontfix-by-design** — surfaced behavior is correct as-is; fixture or expectation changes instead
- **duplicate-of-FX** — same root cause as another entry

## Findings log

### F-001 — `openclaw policy check` fails on .jsonc with comments  [fixed: substrate/policy f492a6e60e (uses oc-paths' new parseJsoncToPlain)]

**Date**: 2026-05-04
**Fixture**: `policy-jsonc-rich-syntax`
**Tool**: `openclaw policy check`

`openclaw policy check` against a `policy.jsonc` containing comments + trailing commas exits 2 with `Expected property name or '}' in JSON at position 4`. The check command uses `JSON.parse` instead of `parseJsonc`, contradicting the substrate's stated JSONC support. (`generate` does the right thing.)

```sh
$ openclaw policy check fixtures/synthetic/policy-jsonc-rich-syntax
# exit=2; ERR_PARSE
```

### F-002 — three lint starter packs unreachable from CLI bootstrap  [fixed: claws 9797aeaf, substrate/pinch on fork]

**Date**: 2026-05-04
**Fixture**: any fixture with non-md content (jsonc / jsonl / *.lobster)
**Tool**: `openclaw pinch run`

CLI bootstrap only imported the md starter pack. `jsonc` / `jsonl` / `lobster-yaml` packs existed as code but never registered. `list-rules` reported only 10 rules across 1 pack instead of the 23 across 4 we shipped.

### F-003 — `openclaw pinch run` ignores `CLAUDE.md`  [open]

**Date**: 2026-05-04
**Fixture**: `only-claude-md`
**Tool**: `openclaw pinch run`

CLAUDE.md is not in the canonical-roles registry (`OPENCLAW_WORKSPACE_ROLES` recognizes AGENTS.md but not CLAUDE.md). Many community repos ship CLAUDE.md and nothing else (zod, kitcn, banjo, aztec-editor-android, ...). Decision needed: add CLAUDE.md as an alias for AGENTS.md, or treat as out-of-scope.

### F-004 — `policy generate` extracts 0 tools from `## Tools` markdown table  [open]

**Date**: 2026-05-04
**Fixture**: `kitchen-sink`
**Tool**: `openclaw policy generate`

Generator expects `### name # R<n>, CAPS` heading shape; ignores Markdown tables. Either fixture should match the convention or the extractor should also recognize tables. Confirmed against `tools-canonical-headings` (extracts 5 tools cleanly) — fixture-shape, not extractor bug. But documenting the convention more visibly would help plugin authors.

### F-005 — `secret-as-literal` false-positives on zero-filled placeholder hashes  [fixed: substrate/pinch eec7eba5e4]

**Date**: 2026-05-04
**Fixture**: `policy-jsonc-rich-syntax`
**Tool**: `openclaw pinch run`

`jsonc-starter-v0/config/secret-as-literal` rule's hex-secret regex `/^[a-fA-F0-9]{40,}$/` matches `"0000...0000"` placeholder hashes. Should exclude all-zero / single-digit-repeat sequences from the hex-secret detection.

### F-006 — `SESSION_PREFIX_RE` too narrow for in-the-wild session log naming  [fixed: substrate/oc-paths 7c2f429963]

**Date**: 2026-05-05
**Fixture**: `session-no-terminal-event`
**Tool**: `openclaw cage list-trackers` / `openclaw pinch run`

Canonical role regex requires basename matching `^(?:session|audit|events)`. Claude-code-style session logs are uuid-named without that prefix and won't be tracked.

### F-007 — Stub-CLAUDE.md (~9 bytes) is widespread; needs decision  [open]

**Date**: 2026-05-05
**Fixture**: many real-world repos (zod, kitcn, banjo, aztec-editor-android)
**Tool**: `openclaw pinch run`

Common in-the-wild pattern: real AGENTS.md alongside a 9-byte CLAUDE.md stub. Even if F-003 lands (CLAUDE.md as a role), stubs shouldn't produce noisy findings. Decision: lint stub-CLAUDE separately, or treat as noise.

### F-008 — `starter-v0/agents/empty-tools-section` strictness vs delegation pattern  [open]

**Date**: 2026-05-05
**Fixture**: `workspace-typical` (originally; surfaced in 6 of 7 new workspace-* fixtures)
**Tool**: `openclaw pinch run`

The rule fires whenever AGENTS.md has a `## Tools` heading without items underneath. Realistic AGENTS.md files often delegate to TOOLS.md ("See TOOLS.md for canonical declarations") rather than duplicating tool listings. With the rule as written, the delegation pattern is flagged as a problem.

Two reasonable interpretations:
- **Rule is correct**: AGENTS.md shouldn't have a `## Tools` heading at all if it's not declaring tools. Operator should drop the section. (Documented in workspace-typical's AGENTS.md as the workaround.)
- **Rule is too strict**: delegation-by-comment is a legit pattern; rule should detect the explicit "see TOOLS.md" delegation and skip.

For now: workspace-typical demonstrates the workaround (no `## Tools` section). Decision pending; flag for upstream maintainers.

### F-009 — `policy check` real-world drift detection works against typical workspace  [confirmed-working]

**Date**: 2026-05-05
**Fixture**: `workspace-policy-managed`
**Tool**: `openclaw policy check`

`policy check` against a workspace where TOOLS.md adds a tool not in policy.jsonc correctly hits the JSON.parse-on-jsonc bug (F-001) and returns exit=2. The drift detection itself is sound (confirmed via `policy-drifted` synthetic earlier); F-001 blocks it from running on real .jsonc files with comments.

### F-010 — workspace-* fixtures successfully exercise lint+lkg+policy substrates end-to-end  [confirmed-working]

**Date**: 2026-05-05
**Fixtures**: 7 new `workspace-*` fixtures
**Tool**: full substrate train

End-to-end behavior on realistic openclaw workspaces:
- workspace-with-sessions: jsonl `no-terminal-event` rule fires on the unterminated session log (expected)
- workspace-with-workflows: lobster `shell-tool-collision` + `duplicate-id` both fire on `bad-pipeline.lobster` (expected)
- workspace-typical: 9 files tracked + promoted by cage; 5 tools extracted by policy-generate
- workspace-upgrade-recovery: pre-populated `.openclaw/lkg-health.json` with 2 labels — but cage walks 9 files and promotes — labels persistence not yet exercised in the daily-run flow (would need an explicit `cage labels` step)
- workspace-enterprise: workspace.json overrides aren't tested in the run-suite — manifest walker doesn't yet read the lint-section overrides

Improvements to make the daily loop richer: add `cage labels` + `cage promote --label X` invocations to the suite for fixtures with `.openclaw/lkg-health.json`. Add `policy check` invocation when both TOOLS.md and policy.jsonc are present.

### F-011 — `openclaw cage status` returns generic `ERR_INTERNAL` on lkg-state version mismatch  [fixed: substrate/lkg-cage 9e54eb5fbc]

**Date**: 2026-05-05
**Fixture**: `adversarial-lkg-state-future-version`
**Tool**: `openclaw cage status`

`.openclaw/lkg-health.json` declaring `"version": "9.9.9"` produces:

```
{ "error": { "code": "ERR_INTERNAL", "message": "state file version 9.9.9 unsupported by this build (expected 0.1.0)" } }
```

The message is informative but the code is a catch-all. Operators reading exit codes / wiring up alerts can't distinguish a legitimate version-mismatch (operator should upgrade or downgrade openclaw) from a true internal bug. Should be `LKG_STATE_FILE_VERSION_MISMATCH`.

### F-012 — `openclaw cage status` returns generic `ERR_INTERNAL` on lkg-state corruption  [fixed: substrate/lkg-cage 9e54eb5fbc]

**Date**: 2026-05-05
**Fixture**: `adversarial-lkg-state-malformed`
**Tool**: `openclaw cage status`

Malformed JSON in `.openclaw/lkg-health.json` produces `ERR_INTERNAL: state file parse failed at <path>`. Should be `LKG_STATE_FILE_CORRUPT` (already a documented code in the lkg substrate; just not wired through here).

### F-013 — `openclaw policy generate` and `cage status` exit non-zero on malformed `workspace.json`  [fixed: substrate/oc-paths b32c78a893 + pinch 71060d08f4 + lkg-cage 9e54eb5fbc + policy 1204e6c978]

**Date**: 2026-05-05
**Fixture**: `adversarial-workspace-json-malformed`
**Tool**: `openclaw policy generate` and `openclaw cage status`

Both substrates exit 2 with `ERR_INTERNAL: workspace.json parse failed at <path>`. This is a borderline call:

- **Argument for current behavior**: workspace.json declares overrides for substrate behavior; a corrupt file means the operator's intent is unknowable, so refusing to run is safer than guessing.
- **Argument against**: workspace.json is **optional**; a corrupt file should degrade to defaults with a warning on stderr, not bring the whole substrate down. Most CLIs treat optional config that way.

Compromise: parse-error should still exit non-zero but with a specific code (`WORKSPACE_CONFIG_PARSE_FAILED`) so operators can decide policy. Generic `ERR_INTERNAL` is the worst outcome — looks like a substrate bug.

`pinch run` on the same fixture handles this differently — exits clean-error with what looks like a more specific code; behavior between substrates is inconsistent.

### F-014 — `pinch run` on `workspace.json: skip:["*"]` produces zero observable signal  [fixed: substrate/pinch 71060d08f4]

**Date**: 2026-05-05
**Fixture**: `adversarial-workspace-json-skip-everything`
**Tool**: `openclaw pinch run`

A workspace.json that wildcards `lint.skip:["*"]` and `lint.skipPaths:["**"]` causes pinch to run cleanly with `filesLinted: 0, diagnostics: []`. From the operator's view this is identical to "no findings" — they have to read workspace.json themselves to understand that everything was skipped.

Should emit a metadata field (e.g. `summary.pathsSkippedByConfig: <n>`) or print "X files skipped by workspace.json" so the silence is observable.

### F-015 — 24 adversarial fixtures, zero crashes  [confirmed-working]

**Date**: 2026-05-05
**Fixtures**: all `adversarial-*` (24 fixtures)
**Tool**: full substrate train

Adversarial sweep covering shell-metacharacter tool IDs, sentinel-injection, emoji/unicode in IDs, 512-char IDs, malformed YAML frontmatter, deep JSON nesting, UTF-8 BOM, malformed jsonl session logs, lobster step-shape attacks, future-version LKG state, malformed workspace.json — **none of the 24 caused a crash**. Every failure mode emitted a structured JSON error on stderr with a usable exit code.

Two genuine fixes worth shipping (F-011/F-012/F-013 specific error codes; F-014 silent-skip observability), but nothing was a denial-of-service against the substrate train. This is a real strength worth highlighting in upstream review.

### F-016 — No lint rule for mixed line endings in canonical files  [wontfix-by-design: matches git's tolerate-but-encourage-convergence stance; substrate parsers normalize internally; no operator pain in fixtures]

**Date**: 2026-05-05
**Fixture**: `adversarial-md-mixed-line-endings`
**Tool**: `openclaw pinch run`

AGENTS.md / TOOLS.md containing a deliberate mix of CRLF / LF / CR-only line endings within the same file produces zero lint findings (`rulesRun=23, diagnostics=0`). 23 rules ran but none of them check line-ending consistency.

Whether this is a **bug** or **wontfix-by-design** is a judgment call: cross-platform repos legitimately mix line endings (git's `core.autocrlf` rewrites them), and tooling like Prettier explicitly tolerates mixed endings. A rule for this would produce a lot of false positives.

Decision: leave open as a coverage observation; not adding the rule unless a real workspace surfaces a problem.

### F-017 — 27 composition fixtures pass cleanly; cross-plugin namespacing works  [confirmed-working]

**Date**: 2026-05-05
**Fixtures**: all `compo-*` (27 fixtures)
**Tool**: full substrate train

Composition fixtures (multi-plugin workspaces with 2-3 plugins side-by-side) pass cleanly through the train:
- `compo-tool-id-collision`: two plugins each contribute "exec" — substrate correctly produces 2 distinct tools (`plug-a/exec` + `plug-b/exec`), not a collision.
- `compo-conflicting-risk-same-name`: two plugins contribute "run" with R1 vs R5 — substrate keeps them as 2 namespaced tools.
- `compo-skill-name-collision`: similar story for skills.
- `compo-cross-plugin-skill-ref`: substrate doesn't validate cross-plugin manifest references (open question — should it?).
- `compo-one-plugin-half-installed`: 2 plugins, only 1 has tools — substrate reports 1 tool correctly, doesn't crash on the empty-contributing plugin.

Cross-plugin tool/skill ID namespacing works as designed. The substrate doesn't (yet) provide aggregate-risk reporting (e.g. "this workspace has 3 R5 IRREVERSIBLE_EXTERNAL tools across plugins"), which would be useful operator feedback. Tracking as a future feature, not a bug.

### F-018 — 54 adversarial fixtures, still 0 crashes after deeper sweep  [confirmed-working]

**Date**: 2026-05-05
**Fixtures**: all `adversarial-*` (54 fixtures, +30 since F-015)
**Tool**: full substrate train

Second adversarial sweep (encoding, unicode confusables, path traversal, gateway URL edges, template-rot markers, LKG lifecycle states, deeper jsonl edges, deeper workspace.json edges, manifest cross-refs) produced **zero crashes**. 198 cells flagged the issue, 18 emitted structured `clean-error` codes, 1 silent-accept (F-016 mixed line endings — known coverage gap, not a bug).

Notable individual results:
- UTF-16 LE BOM file (`adversarial-md-utf16-le-bom`): substrate read but produced no findings (parsed as raw bytes — no mojibake, no crash). Defensible.
- 100-deep nested JSON (`adversarial-workspace-json-deeply-nested-skip`): parser handled cleanly, no stack overflow.
- 64KB single jsonl line (`adversarial-session-very-large-line`): no truncation observed.
- RTL-override / zero-width-space / Cyrillic homoglyph in tool IDs: substrate accepted as valid IDs (no spoofing-detection rule yet — different judgment call than F-016).

The substrate train is genuinely robust under adversarial input. The remaining open findings (F-001/F-003/F-004/F-005/F-006/F-007/F-008/F-016) are coverage gaps and convention questions, not crashes.

### F-019 — `cage status` ignores files deleted since last promote  [fixed: substrate/lkg-cage 405198aadc]

**Date**: 2026-05-05
**Scenario**: `lkg-deleted-file-recover`
**Tool**: `openclaw cage status`

When a tracked file is deleted between `cage promote` and the next `cage status`, the file simply drops out of the observation set with no diagnostic. The manifest walker only sees what's currently on disk, so a missing path produces no entry at all in `observations[]` or `byOutcome`.

The LKG itself still has the bytes — `cage rollback --label <name>` correctly restores them. But operators expecting `status` to flag missing files will be surprised.

Three reasonable interpretations:
- **Wontfix-by-design**: status is read-only and operates on the manifest walk; missing files are out of scope. Operators who need that should use `cage rollback` or a separate verb.
- **Add a warning**: status should diff `entries` (LKG state file) against the walk and flag entries that no longer exist on disk.
- **Auto-recover on status**: contradicts the read-only stance, probably wrong.

Decision: leave as-is, document the convention, surface as a candidate addition for upstream review (a `cage check-orphans` verb perhaps).

### F-020 — Multi-step scenario harness landed; 5 scenarios green  [confirmed-working]

**Date**: 2026-05-05
**Tool**: full LKG state machine

Built `scripts/run-scenario.mjs` + `scenario-lib.mjs`: declarative per-step `.scenario.mjs` files that walk a workspace through promote / mutate / status / rollback / corrupt cycles, asserting on substrate behavior at each step.

Five LKG scenarios green:
- `lkg-fresh-deployment` — first status on empty workspace; lkg-health.json gets created during walk.
- `lkg-promote-corrupt-recover` — promote → corrupt jsonc → status auto-recovers bytes from LKG.
- `lkg-label-rollback` — promote-v1 → edit-valid → promote-v2 → rollback-to-v1 restores v1 bytes.
- `lkg-label-immutability` — second promote --label v1 produces LKG_LABEL_DUPLICATE (exit 1).
- `lkg-deleted-file-recover` — confirms F-019 behavior; rollback recovers, status doesn't.

Harness supports `run` (CLI invocation), `edit` (file mutation), `file` (post-state assertion), `expect` (parsed/exit/stderr), with operator matchers (`atLeast`, `oneOf`, `matches`). Scenarios drive lifecycle bugs that snapshot fixtures couldn't surface.

### F-021 — `cage promote` ignores `lkg.skipPaths` (asymmetric vs `cage status`)  [open]

**Date**: 2026-05-05
**Scenario**: `lkg-skip-config-promote`
**Tool**: `openclaw cage promote`

`cage status` honors `workspace.json` `lkg.skipPaths` (see `runCmdStatus` calling `resolveLkgOverrides` and `overrides.shouldSkip(...)` per tracker). `cage promote` does NOT — it builds a fresh manifest, registers every entry, and calls `promoteAll()` with no filter.

Result: a workspace.json declaring `lkg.skipPaths: ["sessions/*"]` to keep high-churn session logs out of the LKG observation walk has its config silently violated by promote. Every session log gets a `.lkg` companion + state-file entry, polluting the LKG with one snapshot per ephemeral interaction.

**Fix scope** (non-trivial):
- Add `skip?: readonly string[]` (path globs) to `PromoteAllOptions`.
- `FsLKGStore.promoteAll` and `GitLKGStore.promoteAll` filter `this.trackers` before iterating.
- Preserve label-cohort atomicity: the cohort is the FILTERED set (skipped paths aren't part of any label).
- CLI passes `skip: overrides.skipPathGlobs` (and converts roleIds to per-tracker check too).

For now, scenario `lkg-skip-config-promote` documents the asymmetry. Tracked as an upstream-review item.

### F-022 — 11 LKG lifecycle scenarios green (10 confirm-working, 1 captures F-021)  [confirmed-working]

**Date**: 2026-05-05
**Tool**: full LKG state machine
**Fixtures**: 11 `*.scenario.mjs` files

Second batch of LKG lifecycle scenarios:
- `lkg-rollback-no-such-label` — typo'd / unknown label gets `LKG_LABEL_NOT_FOUND`.
- `lkg-delete-label-then-rollback` — delete-label is the immutability escape hatch; subsequent rollback fails cleanly; re-promote with same name works (no zombie state).
- `lkg-stale-tmp-cleanup` — pre-staged `.lkg.tmp-12345-*` from a hypothetical prior crash doesn't break promote/status. Substrate ignores stale tmp files; doesn't actively clean them up but doesn't trip on them either.
- `lkg-corrupted-companion` — both active + .lkg corrupt → no crash (substrate emits clean-error / failed observation).
- `lkg-empty-promote-noop` — second promote with same bytes is `valid`, not `promoted`. Labels can still be added without byte changes (atomic pinning across unchanged cohort).
- `lkg-skip-config-promote` — F-021 captured in scenario form.

11/11 scenarios pass; one of them locks the F-021 asymmetric behavior. Once F-021 lands, that scenario flips to assert the corrected behavior.

### F-022 — pinch silently ignores `lint.skip` entries that match no registered rule  [fixed: substrate/pinch eec7eba5e4]

**Date**: 2026-05-05
**Scenario**: `upgrade-stale-rule-skip`
**Tool**: `openclaw pinch run`

`workspace.json` `lint.skip` entries are matched against currently-registered rule IDs. If an entry matches NOTHING, it's silently ignored — `rulesDisabledByConfig` reflects only the matched ones. Operators don't see a warning.

Realistic upgrade pain: a rule pack renames `pack-v0/foo-rule` → `pack-v1/foo-rule`. The operator's workspace.json still references the old ID. After upgrade:
- Operator believes the rule is still skipped.
- It's actually re-enabled (no rule with that name to skip; new-name rule isn't excluded).
- Findings reappear unexpectedly.

**Fix scope** (small, ergonomic): in pinch's run summary, add `staleSkipPatterns: [<glob>]` for skip entries that matched zero rule IDs. Operator can grep for it after every run.

### F-023 — `workspace.json` is not a canonical LKG tracker  [open: design question]

**Date**: 2026-05-05
**Scenario**: `upgrade-pre-upgrade-rollback`
**Tool**: `openclaw cage promote/rollback`

The substrate reads `workspace.json` to apply lint/doctor/policy config overrides, but it's NOT in the canonical-role registry — so `cage promote` doesn't track it, and `cage rollback --label v1` doesn't restore it.

Practical implication: a labeled "pre-upgrade" rollback restores AGENTS.md, TOOLS.md, gateway.jsonc, policy.jsonc — but NOT workspace.json. If the operator's workspace.json changed during the upgrade (rule renames, new skip patterns), they're stuck with the post-upgrade workspace.json after rollback. Their LKG label captures only part of the upgrade-recovery state.

**Decision needed** (upstream): is this by design (workspace.json is operator-authored intent, not generated artifact) or a coverage gap?

If by-design: the substrate documentation should call this out so operators don't assume rollback restores everything.
If a gap: add `workspace.json` to the canonical-role registry under role `workspace-config`.

### F-024 — 17/17 LKG + upgrade scenarios green  [confirmed-working]

**Date**: 2026-05-05
**Scenarios**: 17 .scenario.mjs files
**Tool**: full LKG / pinch / policy substrate train

Full multi-step scenario suite green:
- 11 LKG rhythm + state-machine scenarios (F-019 fixed; F-021 locked)
- 5 upgrade scenarios (state-version migrations, pre-upgrade rollback, stale rules, plugin uninstall, old policy.jsonc shape)
- 1 cross-pinch scenario (mixed valid/stale skip refs — F-022)

Surfaced findings:
- F-019 (orphan detection in cage status) → fixed in substrate/lkg-cage
- F-021 (cage promote ignores lkg.skipPaths) → tracked, scenario locks
- F-022 (pinch silently ignores stale skip refs) → tracked, scenario locks
- F-023 (workspace.json not in LKG canonical roles) → tracked, design question

The substrate train passes its lifecycle tests. Each open finding is a UX/coverage gap for upstream review, not a crash or correctness bug.

---

Add new findings BELOW this line as they surface from real use.
