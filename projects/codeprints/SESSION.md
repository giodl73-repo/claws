# Codeprints Session

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read `C:\src\codeprints\CONTEXT.md`, `README.md`, and `PRODUCT_PLAN.md`.
4. Check both worktrees before acting.

## Baseline

- Area: Codeprints repository factorization
- Primary repo: `giodl_microsoft/CODEPRINTS`
- Local worktree: `C:\src\codeprints`
- Current branch: `main`, synced with private origin at `28b9762`
- Main tracking file: `C:\src\codeprints\PRODUCT_PLAN.md`
- Skill to use: `faces-development-loop`

## Current Session

- Last updated: 2026-08-06
- Last agent: Copilot CLI
- Current focus: The FLETCH owner loop is complete. Retain target-neutral
  compatibility; reject Rust generation and FLETCH adoption.
- Active branch / PR: `user/giodl/factor-draft-projection` in
  `C:\src\codeprints-factor-draft`; no PR or commit.
- Known dirty state: The draft worktree contains the intended uncommitted
  draft and Phase A implementation and docs. Codeprints `main` remains clean
  at `28b9762`.
  `claws-hapi` has unrelated user changes; touch only Codeprints project files.
- Blocking question: None.

## Completed Proof

- `codeprints factor` is read-only and emits language-neutral, deterministic
  proposal records with `target: null`.
- The C# V1 analyzer accepts only public sealed property objects with closed
  property/accessor modifiers and literal initializers.
- Repository traversal uses component-wise capability handles, no-follow opens,
  raw-byte hashing, bounded reads, and actual repository path casing.
- UTF-8 spans retain byte offsets and report one-based Unicode scalar columns.
- The final independent review is clean after resolving symlink races, partial
  and static false positives, accessor visibility, closed-directory ancestry,
  Unicode columns, and Windows path casing.
- Full workspace tests, factor CLI tests, Clippy with warnings denied, and
  `git diff --check` pass.
- The Lobster `TeamsNotifier` run reports 6 sources, 11 declarations, no
  findings, and only `TeamsNotifierOptions` as a candidate. All owner file
  hashes are unchanged.
- The unchanged Lobster project restored with an ephemeral Azure DevOps token,
  built under .NET SDK 10.0.302, and passed all 29 `TeamsNotifier.Tests`.
  Private-feed vulnerability metadata emitted non-blocking `NU1900` warnings.
- The Rust analyzer accepts only public, non-generic named-field structs with
  public fields, a closed derive set, and a complete implementation index.
- Inherent and trait implementations are associated across selected files,
  qualified and simple imported targets, inline modules, and workspace crate
  boundaries. Ambiguous imports remain conservative.
- Invalid Rust files prevent false candidates elsewhere through the
  `implementation-index-incomplete` retained-native reason.
- ICELINES `team_depth.rs` produced 12 candidates, 4 retained implemented
  types, and 4 unsupported shapes. `schema.rs` produced 2 candidates, 7
  retained types, and 2 unsupported shapes. Both files were hash-identical
  after analysis with no findings.
- All 325 native `icelines-core` and `icelines-fetch` tests passed under
  `--locked`. The broader ICELINES workspace passed 1,224 tests and has two
  unrelated date-sensitive TUI score-test baseline failures.
- Codeprints passed 154 workspace tests, Clippy with warnings denied, formatting,
  and diff checks. Final `codex review --uncommitted` reported no findings.
- `factor` now emits a canonical `proposalDigest`; optional strict acceptance
  JSON binds explicit owner stable IDs only to candidates from that exact
  fresh proposal.
- Acceptance rejects stale, malformed, duplicate, unknown, invalid-ID, and
  non-candidate decisions through structured `factor-input` codes. It uses the
  same confined, no-follow, bounded repository read and writes nothing.
- The ICELINES proof accepted `PlayerContract` as
  `cp:icelines:fetch:player-contract`; proposal and acceptance digests were
  emitted, source and decision hashes remained unchanged, and the temporary
  decision file was removed.
- The acceptance slice passed 167 workspace tests, full Clippy/format/diff
  checks, and clean `codex review --uncommitted`.
- Accepted Rust candidates can now consume a second strict decision bound to
  the exact `acceptanceDigest`. It supplies explicit field IDs, presence,
  nullability, order, JSON names, and omission semantics.
- Draft V1 maps only exact Rust `String` and `bool` fields. C# drafts,
  collections, named types, numeric types, optional/null/omit semantics,
  missing fields, stale decisions, and colliding IDs fail closed.
- JSON output retains proposal, acceptance, and draft digests. Text output is
  directly copyable, parser-valid contract text with an `id-prefix` comment.
- FLETCH `ActiveAlias` produced the accepted five-string-field proof;
  `CacheManifest.entries: Vec<CacheEntry>` produced
  `draft-unsupported-type`. Owner source remained hash-identical and temporary
  decision files were removed.
- Full workspace formatting, Clippy, tests, and diff checks passed. Codex found
  one declaration/field ID collision gap; the fix and regression passed
  focused tests, and the final review reported no actionable findings.
- Portable `uint64` now resolves to `cp:system:uint64`; existing .NET mappings
  remain coherent while the .NET JSON profile still rejects unsupported
  numeric emission.
- Target-neutral JSON compatibility now emits deterministic semantic facts,
  read/write/round-trip classifications, and an allow/block decision.
- Retained FLETCH fixtures model all seven `CacheIndexEntry` fields. Adding
  `object_path` as an alias is allowed; making it canonical while retaining
  `relative_path` as an alias is blocked for JSON write and round-trip.
- The neutral classifier conforms to every frozen .NET JSON classification
  case. A runnable example exposes both owner results without writing FLETCH.
- The full Codeprints workspace and Clippy pass. Final
  `codex review --uncommitted` exited cleanly with no actionable findings.
- TRACKER now lists CODEPRINTS as private Enterprise incubation, links a
  dedicated `dependency-systems/codeprints-usage.md`, and includes Codeprints
  in the new-repo intake checklist. Future repos can request owner-led pilots
  without treating it as required or runtime infrastructure.
- A bounded Rust/Serde plus `slice_core` owner provider emitted the exact
  43-line FLETCH module, blocked the canonical rename before bytes, and passed
  all 69 unchanged owner tests with no Codeprints dependency.
- The steady-state Codeprint alias edit produced exactly the same three
  production lines as direct native code. The provider, binding, and generated
  fixture cost 595 lines and required FLETCH-specific selector machinery.
- Phase B therefore failed the matched-native/minimalism gate. Its provider and
  adoption were deleted; FLETCH is restored to the retained 20-insertion,
  1-replacement direct-native evidence state.
- Final review found one real `omitNull` compatibility gap. Both neutral and
  .NET classifiers now emit the fact and block writers that omit a member
  required by old readers. Full workspace validation and the rerun Codex review
  are clean.

## Resume Checklist

- If continuing, evaluate packaging the retained target-neutral compatibility
  report for owner use. Do not add a Rust target from the FLETCH result.
- Tracker discovery is documented; do not broaden its availability language
  beyond owner-led local-tool pilots until the uncommitted work is published.

## Guardrails

- Keep implementation work in `C:\src\codeprints`, not `claws-hapi`.
- Native source, behavior, tests, and domain semantics remain owner authority.
- AI may propose factorization; deterministic tools must verify facts and proof.
- Do not add a second target generator or generalized plugin system.
- Require accepted extraction, structured rejection, provenance, and deletion mapping.
- Do not commit or push unless explicitly requested.

## Open Threads

- Preserve the explicit split between Tree-sitter inventory and later
  compiler-native semantic proof.
- Extraction, conversion, file publication, and generated authority remain
  intentionally unimplemented.
- Draft projection remains Rust-only and intentionally rejects all but exact
  `String` and `bool` mappings.
- Usability requires sole structural authority, native-effect preview,
  deterministic declared output, unchanged owner tests, matched direct-native
  comparison, and clean ejection.
- Selected owner baseline:
  `FLETCH@7c7aacd4fbc8753299e2fc3181368d2cc6d90337`. Its cache-index structure is
  repeated across the Rust type, manifest projection, selector catalog, and
  selector row. BISECT also consumes the Rust field.
- The isolated matched-native alias change is 20 insertions and 1 replacement
  in one file; all 69 `fletch-core` tests pass. It retains `relative_path`
  writes while accepting/querying `object_path`.
- Phase A is retained under
  `fixtures/owner-pilots/fletch-cache-index/{before,alias,rename}`. Its
  compatibility evidence proved useful; Phase B proved generated Rust was not
  preferable to native code for this surface.
- No FLETCH commit or PR exists. The experiment is dirty only in
  `C:\src\FLETCH-codeprints-native`.

## Session Checkpoints

Detailed session handoffs live in `sessions/` when needed. Keep this file as the
concise canonical resume snapshot.
