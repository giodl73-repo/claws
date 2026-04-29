# R2 — claws:claws-repo-steward — v2 OpenClaw contribution proposal

**Reviewer**: claws:claws-repo-steward
**Round**: 2
**Subject**: v2 OpenClaw contribution proposal — four documents (post R1-amended + R1-follow-on)
- `.craft/out/proposals/snap-pre-rfc.md`
- `.craft/out/proposals/policy-pre-rfc.md`
- `.craft/out/proposals/guardrails-adapter.md`
- `.craft/out/proposals/realigned-story.md`
**Date**: 2026-04-29
**Verdict (preview)**: APPROVE-WITH-WARNINGS — 4 of 4 R1 BLOCKs cleared; 3 new HC-WARN findings on residual workspace-contract bookkeeping, one wave-spelling inconsistency in the dependency table, and a cross-doc reference to a hapi-amendment plan that should be cross-linked.

---

## Lens summary

The repo-steward's job is the boundary: spec conformance, workspace invariants, codename-leak guards, and naming discipline. The R1 BLOCKs all centered on **structural integrity** problems — types that didn't typecheck, narratives that contradicted the in-flight worktree, renames that didn't propagate to the workspace contract. After R1-amended + R1-follow-on, the four documents now form an internally coherent type system around `OcPath`, `WorkspaceId`, `SnapshotInternalPath`, with `claws-*` package naming applied symmetrically across all three downstream packages, and the hapi worktree state is described honestly (with a follow-on plan at `.craft/plans/hapi-amendment-to-contract-first.md` capturing the next concrete action).

The remaining R2 concerns are all in the "structural bookkeeping" tier rather than the "structural integrity" tier — the proposals describe the renames as a fait accompli in narrative voice, but the workspace contract (root `package.json` workspaces array, `RB-repo-boundary.md` rules + diagram, `.no-craftworks-allowlist.yaml` paths, manifest `sourceRepo` literals) hasn't been updated and the proposal package doesn't list those updates as explicit trim-wave deliverables. From R1 these were called out as part of HC-BLOCK 3; the type-discipline part of HC-BLOCK 3 cleared cleanly, but the "make the rename complete" deliverable list did not get added. That's the residue this R2 surfaces.

---

## Disposition of R1 findings

### HC-BLOCK 1 — `OcPath` shape mismatch with hapi's actual oc-path contract

**Status**: **RESOLVED**.

Evidence the type-level concerns are addressed:

- `snap-pre-rfc.md:31-44` — comment block explicitly states "this contract does NOT import OcPath. OcPath addresses live workspace files... snapshot-internal addressing is a different concept." `WorkspaceId` introduced at `:44`; `SnapshotInternalPath` introduced at `:52`. Both are typed as `string` brands with explicit contract documentation.
- `snap-pre-rfc.md:60-64` — `SnapshotStore.read(snap: SnapshotId, path: SnapshotInternalPath)`; `capture(workspace: WorkspaceId)`; `list(workspace: WorkspaceId, ...)`. The signatures now use the right types throughout.
- `policy-pre-rfc.md:37` — `import type { SnapshotId, SnapshotInternalPath } from './snapshot';` — the policy contract correctly imports from snap.
- `policy-pre-rfc.md:82` — `export const POLICY_IR_PATH: SnapshotInternalPath = '.openclaw/policy/policy-ir.json';` — typed as `SnapshotInternalPath`, not as `OcPath`, not as bare `string`. The R1 type-incorrect-three-ways finding cleared cleanly.
- `policy-pre-rfc.md:75-81` — JSDoc explicitly disambiguates: "NOT an OcPath (OcPath addresses live workspace files via the `oc://{file}/...` scheme, where `file` MUST be one of the 9 entries in `OC_WORKSPACE_FILES`; PolicyIR lives INSIDE a snapshot, not as a workspace file). Typed as the `SnapshotInternalPath` brand from the snap contract."
- `realigned-story.md:139-145` (oc-path section) and `:147-149` (snap section) — both explicitly call out the live-workspace-vs-snapshot-internal distinction.
- `guardrails-adapter.md:103-104` — flow diagram references `snap.read(snap=ctx.snapshotId, POLICY_IR_PATH)`; consistent with the contract.

**Cross-doc consistency on path constants**: all four docs now agree the canonical address is `.openclaw/policy/policy-ir.json` typed as `SnapshotInternalPath`. The four-different-path-conventions chaos from R1 is gone. The hapi PR-6 `oc://snapshot/<id>/...` form is no longer cited as the canonical reference in any v2 doc.

### HC-BLOCK 2 — Hapi worktree wave/PR sequencing diverges from what the proposals claim

**Status**: **RESOLVED**.

Evidence:

- `realigned-story.md:13-27` — entire new "Hapi wave coordination" section spells out the honest current state of the hapi worktree: PR-1 = `@openclaw/workspace` (oc-path), PR-2 = OC-4 stripFrontMatter, PR-5 = policy generator, PR-6 = snap daemon. **No claim of a "PR-7" anywhere**. The "Earlier drafts of this story claimed 'PR-7 retired' — that's wrong; there is no PR-7 to retire" sentence at `:17` is the explicit retraction the R1 finding asked for.
- `realigned-story.md:139` — "1. oc-path (in-flight, Hapi PR-1)" — corrected from R1's wrong "Hapi PR-2" to the actual `wave.yaml` value.
- `policy-pre-rfc.md:165` — table row reads `in-flight (in @openclaw/workspace package; bundled with PR-1 in Hapi wave per current wave.yaml)`. Corrected from R1's wrong "PR-2 in Hapi wave."
- `realigned-story.md:19-27` — the five concrete coordination steps are listed (wave.yaml v2-absorption block, PROGRESS.md row, pulse supersession, PR-draft archival, new PR-drafts). The doc explicitly notes these are "out-of-scope for this docs-only fix-pass" so the proposal package does not pretend they're done.
- `.craft/plans/hapi-amendment-to-contract-first.md` exists as the load-bearing follow-on: 209 lines documenting precisely what gets retired (PR-3, PR-5, PR-6), what stays (PR-1, PR-2, PR-4), how the retired PR-drafts and pulses move to `superseded/`, and the order-of-operations gating the actual rewrite on R2 verdict.

**Lens question post-resolve**: does this R2 review want to demand the hapi-amendment plan be cross-linked from the proposal docs themselves? The realigned-story `Sister docs` section at `:325-335` cross-links the audits and panel R1 — but does NOT yet cross-link the hapi-amendment plan. See HC-WARN 7 below.

### HC-BLOCK 3 — Renames break the residue-grep Pass 3 allowlist contract assumptions

**Status**: **PARTIALLY-RESOLVED**.

**Resolved sub-findings**:

1. **Asymmetric rename**: cleared. `realigned-story.md:289` and `:291` document the symmetric rename: `openclaw-snap` → `claws-snap-server`, `openclaw-policy` → `claws-policy-generator`, `openclaw-guardrails` → `claws-guardrails`. The earlier-draft "guardrails is the meeting point" justification is explicitly retracted at `:291`. The `claws-guardrails` name is used consistently across all four docs (snap-pre-rfc:8, policy-pre-rfc:156, guardrails-adapter:11/46/84/128, realigned-story:159/161/171/183/204).
2. **Layer-flip semantics**: cleared by implication. The renamed packages now wear the `claws-*` prefix per `RB-repo-boundary.md` rule 2 ("internal-only"), which matches their actual graduate-vs-incubator status (none graduate; all consume the upstream contracts). The realigned-story `:289` explanation ("Drop the `openclaw-` prefix since it's not the contract package") captures the layer semantics correctly.

**Unresolved sub-findings** (these are the R2-residue):

3. **Workspace contract artifacts NOT updated and NOT listed as trim-wave deliverables**:
   - The root `C:\src\claws\package.json` workspaces array still contains `packages/openclaw-snap`, `packages/openclaw-policy`, `packages/openclaw-guardrails` (not yet renamed; the rename is gated on contract merge upstream, but the proposal package should at minimum list this update as an explicit trim-wave deliverable).
   - `C:\src\claws\docs\repo\specs\RB-repo-boundary.md` package-location rules and dependency-direction diagram still reference the `@bic/openclaw-*` names. Not listed as a trim-wave deliverable.
   - `C:\src\claws\.no-craftworks-allowlist.yaml` paths (if any reference the old package names) — not listed.
   - `C:\src\claws\scripts\residue-grep.sh:33` `PASS3_ALLOWED='^(workspace|guardrails|policy|snap|lsp)$'` — when the three packages rename to `claws-*`, the Pass 3 allowlist still works (Pass 3 only restricts the `openclaw-*` suffix space; `claws-*` packages are out of its scope), but the post-rename state should be acknowledged in the trim-wave deliverable list so a future maintainer doesn't re-introduce `@bic/openclaw-snap` and accidentally re-trip Pass 3 inappropriately.
   - `sync-manifest.json` `sourceRepo` literals — flagged in R1 HC-WARN 5 and not addressed in any of the four amended docs.

   This is a real bookkeeping gap; the rename narrative is well-formed but the **deliverable list of "what else has to change in lockstep with the rename"** is missing from `realigned-story.md` "Renames + new packages" subsection.

   See HC-WARN R2-1 below.

### HC-BLOCK 4 — Cross-doc LoC math doesn't add up, and the discrepancy is load-bearing

**Status**: **PARTIALLY-RESOLVED** (acceptable).

**Resolved**:

- The trim figure is now pinned at 6,200 LoC firm with explicit arithmetic: `realigned-story.md:200` shows "gross sum 7,889 (1,556 + 1,726 + 3,107 + 1,500) − ~1,689 LoC of audit×snapshot overlap = ~6,200 LoC". Per user-decision (8) "Trim figure pinned at 6,200 LoC firm" this is the canonical number. The `:11` TLDR uses "~6,200 LoC"; `:191` body uses "**6,200 LoC**"; `:200` arithmetic; `:283` confirms ~6,200 in the trim-wave-scope subsection. Internally consistent.
- The upstream-surface headline number is now stated consistently as **~390-510 LoC** in the dependency table at `realigned-story.md:172`. The TLDR at `:11` states "~380–520 LoC" which is a 10-LoC drift from the table — this is a tiny residual inconsistency but small enough not to block (see HC-WARN R2-2).
- The helper-file size is consistent: `policy-pre-rfc.md:118` says "~50 LoC, optional"; `realigned-story.md:153` says "Optional companion `policy-ir-runtime.ts` (~50 LoC)". The R1 50-vs-70 contradiction cleared.
- `policy-pre-rfc.md:12` TLDR says "~380–520 LoC of new upstream surface across all four contracts" — drift from the table's 390-510. Acceptable (within rounding) but worth tightening (HC-WARN R2-2).

**Net assessment**: the math is now within rounding error and the canonical figures are documented with explicit arithmetic. R1's "this team can't add three numbers" risk is gone. The residue is the 380-520-vs-390-510 drift at the headlines, which is one search-and-replace away from clean.

---

## R2 lens.verify checklist

The role's `lens.verify` items are migration-focused (originally written for the craftworks→claws split), so they don't all map cleanly to a proposal-package review. The applicable items as adapted for "is the proposal package internally coherent":

### Type-system consistency: are `OcPath`, `WorkspaceId`, `SnapshotInternalPath` used correctly throughout?

**Verified clean.**

- `OcPath` is referenced as a structured type in 6 places across the 4 docs; every reference correctly distinguishes it from `SnapshotInternalPath`. No doc treats `OcPath` as a string-typed alias.
- `WorkspaceId` is introduced in `snap-pre-rfc.md:39-44` with full semantics and used consistently in `capture(workspace: WorkspaceId)` / `list(workspace: WorkspaceId, ...)` signatures and in `CanonicalManifest.workspace`.
- `SnapshotInternalPath` is introduced in `snap-pre-rfc.md:46-52` with full semantics and used consistently for `read(snap, path: SnapshotInternalPath)`, the `POLICY_IR_PATH` constant, and the manifest-entry path field.
- The `SnapshotErrorCode` enum at `snap-pre-rfc.md:178-187` correctly references `SnapshotInternalPath` semantics in the `SNAP_INVALID_PATH` code description.
- No "stringly-typed path" slips remain. Every place that previously used `'oc://workspace/.openclaw/policy-ir.json'` (a fictitious URI form) has been corrected.

### Package naming consistency: does `claws-guardrails` rename hold across all 4 docs?

**Verified clean.**

- snap-pre-rfc: 1 mention (footer revision note, `:8`); references `claws-guardrails` rename context. No bare `openclaw-guardrails` in active spec.
- policy-pre-rfc: 2 mentions (revision note `:8`, adoption story `:156`, dependency table `:169`). Both use `claws-guardrails`. Footer at `:205` references the rename. No bare `openclaw-guardrails` in active spec.
- guardrails-adapter: 5 mentions, all `claws-guardrails`. Header at `:11` retracts the prior naming and explicitly states the new one. Adapter location pinned at `claws-guardrails/src/openclaw-adapter.ts:46` (correctly: the `openclaw-adapter.ts` filename is the **adapter inside** the `claws-guardrails` package, which is the right layering — file named for what it adapts to, package named for what it adapts from).
- realigned-story: 7 mentions across §-1/§-5 and the dependency table; all use `claws-guardrails`. The R1-follow-on retraction sentence at `:291` is the load-bearing place where the asymmetric-rename HC-BLOCK 3 sub-finding is explicitly retired.

The only remaining bare-`openclaw-guardrails` references in the proposal docs are in:
- `realigned-story.md:289` — past-tense reference to the **current pre-rename state** (`packages/openclaw-snap/` → `packages/claws-snap-server/`); this is correct narrative voice for a renaming-in-progress doc.
- `realigned-story.md:291` — "the bare `openclaw-guardrails` name has been retracted" — explicit historical-context reference. Correct.

No active spec slips into the bare `openclaw-guardrails` name. Verified clean.

### Boundary discipline: are the proposed contracts respecting the `core ↔ plugin-sdk ↔ plugins` boundary correctly?

**Verified clean** with one subtle observation.

The contracts respect the upstream's own three-layer model:

- `src/plugin-sdk/snapshot.ts` (snap-pre-rfc:28) — types-only, in plugin-sdk; correct.
- `src/plugin-sdk/policy-ir.ts` (policy-pre-rfc:34) — types-only, in plugin-sdk; correct.
- `extensions/snapshot/` (snap-pre-rfc:69) — reference plugin in extensions/, calling `api.registerHttpRoute`; correct (mirrors `extensions/diagnostics-prometheus`).
- `bin/openclaw snap *` (snap-pre-rfc:73) — CLI verb in bin/; correct.
- `policy-ir-runtime.ts` (policy-pre-rfc:118) — optional companion in plugin-sdk; correct.
- `ctx.snapshotId` extension (policy-pre-rfc:198) — small extension to existing `PluginHookToolContext`; correct.

The downstream side respects claws's `RB-repo-boundary.md` model:

- `claws-snap-server/` (renamed from `openclaw-snap`) — claws-side server; correct under rule 2 of `RB-repo-boundary.md` ("internal-only `claws-*` package").
- `claws-policy-generator/` — same.
- `claws-guardrails/` — same.

**Subtle observation**: per `RB-repo-boundary.md` rule 1, `packages/openclaw-*/` was reserved for "incubating packages destined for `@openclaw/*` upstream." Post-rename, none of the renamed packages occupies that incubator slot. That's correct **because none graduate** — snap and policy graduate as upstream contract types in `src/plugin-sdk/`, not as full packages, and guardrails has no upstream package at all. So the incubator slot is empty post-rename, which is fine; but the spec's rule 1 implies the incubator slot **exists for a reason**, and a future v3 contract that does want a graduating package will need that slot. The realigned-story should note this gracefully — see HC-NOTE R2-3 below.

### Crates/packages naming: any other naming asymmetry surface?

**Verified clean** with one minor file-name observation.

The package-name level is symmetric: `claws-sdk`, `claws-serve`, `claws-snap-server`, `claws-policy-generator`, `claws-guardrails`. All `claws-*`. Consistent.

The file-name level: `claws-guardrails/src/openclaw-adapter.ts` is the adapter file inside the claws-guardrails package. The naming is correct (the file adapts **to** the openclaw runner, hence `openclaw-adapter.ts`), but a passing reader could parse `openclaw-adapter.ts` as "this file belongs to openclaw-* namespace" if they don't understand the layering. Consider documenting this convention once in the realigned-story or guardrails-adapter — see HC-NOTE R2-4 below.

### Cross-doc consistency matrix (R2 update)

| Item | snap-pre-rfc | policy-pre-rfc | guardrails-adapter | realigned-story | Hapi worktree (per amendment plan) |
|---|---|---|---|---|---|
| Path constant form | `SnapshotInternalPath` (typed) | `SnapshotInternalPath` (typed; constant value `.openclaw/policy/policy-ir.json`) | uses `POLICY_IR_PATH` symbol | `.openclaw/policy/policy-ir.json` typed as `SnapshotInternalPath` | (n/a; PR-6 superseded per amendment) |
| Total upstream LoC | ~280 | ~135–205 (with `~380–520 LoC across all four contracts`) | 0 | ~390–510 (table) / ~380–520 (TLDR) | (n/a) |
| Helper-file size | (n/a) | ~50 LoC | (n/a) | ~50 LoC | (n/a) |
| Snap type name | `Snapshot` (with open question 4 noting `WorkspaceSnapshot` candidate) | `Snapshot` (imported from snap) | uses `Snapshot` indirectly via PolicyIR closure | open question 4 lists `WorkspaceSnapshot` as default | (n/a) |
| Hapi PR ref | (n/a) | "PR-1 in Hapi wave" (correct) | (n/a) | "PR-1" + "PR-5/PR-6 superseded per amendment plan" | per `wave.yaml` (PR-1, PR-2, PR-4 kept; PR-3, PR-5, PR-6 superseded) |
| Snap shape | contract + plugin + CLI | (cites snap) | composes upstream runner | three layers, daemon retired | per amendment plan: PR-6 superseded by `v2-snap-contract.md` |
| Renamed package set | uses `claws-*` consistently | uses `claws-*` consistently | uses `claws-guardrails` consistently | uses `claws-*` consistently with explicit retraction of asymmetric exception | per amendment plan: cherry-pick into rename targets |

**Consistency score**: 7 of 7 rows aligned (vs R1's 2 of 6). The 380-520 vs 390-510 drift is a sub-row mini-issue.

---

## New findings (R2)

### HC-WARN R2-1 — Trim-wave deliverable list missing the workspace-contract bookkeeping items

**Severity**: WARN. Carries forward from R1 HC-BLOCK 3 sub-finding 3 + R1 HC-WARN 5 (manifest discipline).

**Evidence**: the four docs describe the renames in narrative voice (`realigned-story.md:286-291` "Renames + new packages") but the trim-wave-scope subsection (`realigned-story.md:276-283` "Trim wave scope") only lists the **delete targets** (claws-sdk subdirs to delete), not the **rename-and-update targets**. Specifically missing:

- "Update root `package.json` workspaces array — replace `packages/openclaw-snap`, `packages/openclaw-policy`, `packages/openclaw-guardrails` with the renamed paths"
- "Update `docs/repo/specs/RB-repo-boundary.md` package-location rules and dependency-direction diagram to reference the renamed packages"
- "Audit `.no-craftworks-allowlist.yaml` for any old-package paths"
- "Audit `tools/lobster-deploy/` and `packages/claws-*/` for `sync-manifest.json` consumers; update `sourceRepo` literals to match renamed packages; bump manifest schema version if breaking"
- "Update `scripts/residue-grep.sh` Pass 3 allowlist commentary if the post-rename state changes the allowlist semantics" (low-priority — Pass 3 still works as-is, but a comment noting the post-rename state would be helpful)

**Recommended fix**: add a "Rename-wave bookkeeping" sub-subsection to `realigned-story.md` "Trim wave scope" listing these five items. Approx 8-10 lines.

This is a hygiene finding, not a correctness finding. The trim wave can be drafted later (per `realigned-story.md:307-314` "What's NOT in scope of this story" — "Trim wave plan drafting — separate doc"); but the proposal package as the input to that drafting should at minimum enumerate the bookkeeping items the trim wave inherits.

### HC-WARN R2-2 — Headline LoC drift: ~380–520 vs ~390–510 across docs

**Severity**: WARN. Cosmetic; small enough to not block but visible to a careful reviewer.

**Evidence**:
- `realigned-story.md:11` — "~380–520 LoC" (TLDR)
- `realigned-story.md:172` — "~390–510 LoC" (dependency table)
- `policy-pre-rfc.md:12` — "~380–520 LoC of new upstream surface across all four contracts" (TLDR)

The 10-LoC discrepancy at lower bound (380 vs 390) and upper bound (520 vs 510) traces to whether `WorkspaceId` (~5 LoC type) and the `SnapshotInternalPath` type (~5 LoC) are counted separately or rolled into the snap headline. The dependency table at `realigned-story.md:172` gives the precise breakdown; the TLDRs round up/down inconsistently.

**Recommended fix**: pick the dependency table's range (390-510) as the canonical headline; update both TLDRs to match. Two two-character search-and-replace edits.

This was R1 HC-BLOCK 4's residue — the math is now within rounding error, but a reviewer will spot the discrepancy.

### HC-WARN R2-3 — Hapi-amendment plan cross-link missing from realigned-story Sister docs

**Severity**: WARN. Discoverability hygiene.

**Evidence**: `realigned-story.md:325-335` "Sister docs" section cross-links the audits, the panel R1, and the three sister proposal docs, but does **not** cross-link `.craft/plans/hapi-amendment-to-contract-first.md`. The amendment plan is the load-bearing artifact for executing the "Hapi wave coordination" steps documented in §:13-27 of the same doc. A future reader who reaches §:13-27 and asks "OK, so where's the actual plan?" should be able to find the answer by scrolling to Sister docs.

**Recommended fix**: add one line to `realigned-story.md` "Sister docs":

```
- `.craft/plans/hapi-amendment-to-contract-first.md` — concrete amendment plan for retiring/reshaping hapi PR-3/PR-5/PR-6 in alignment with v2 (gated on R2 verdict)
```

### HC-NOTE R2-4 — Adapter file naming convention worth documenting

**Severity**: NOTE. Cosmetic; would help a future reader.

**Evidence**: `claws-guardrails/src/openclaw-adapter.ts` — the file naming convention is "X-adapter.ts inside Y package = adapter from Y's domain to X's runner." This is correct and matches typical adapter conventions, but the proposal package never explicitly documents it. A passing reader could parse `openclaw-adapter.ts` as belonging to the openclaw-* namespace.

**Recommended fix**: add one sentence to `guardrails-adapter.md` "Location" subsection at `:44-46`:

```
The filename `openclaw-adapter.ts` follows the convention "X-adapter.ts inside package Y = adapter from Y's domain (claws GuardrailProvider) to X's runner (upstream registerTrustedToolPolicy)."
```

### HC-NOTE R2-5 — Incubator-slot semantics unmentioned post-rename

**Severity**: NOTE. Forward-looking discipline.

**Evidence**: `RB-repo-boundary.md` rule 1 reserves `packages/openclaw-*/` for "incubating packages destined for `@openclaw/*` upstream." Post-rename, no claws-side package occupies that incubator slot (snap and policy graduate as types under `src/plugin-sdk/`, not as packages; guardrails doesn't graduate at all). The slot is empty.

That's fine **for v2**. But a future v3 contract that does propose a graduating package (e.g., `@openclaw/audit` per `realigned-story.md:76` future-tense reference) will need the incubator slot back. The realigned-story doesn't note that future v3 will reactivate the slot, which is a tiny forward-looking-discipline gap.

**Recommended fix**: optional. Add one sentence to `realigned-story.md` "Renames + new packages" subsection:

```
The incubator slot at `packages/openclaw-*/` per `RB-repo-boundary.md` rule 1 is empty post-rename for v2 (no graduating packages); future v3 contracts that propose a graduating package (e.g., `@openclaw/audit` if/when the audit format earns its own contract) will reactivate the slot.
```

This is genuinely optional — a reviewer with deep knowledge of the spec will work it out. Including it preempts the question.

---

## Codename leak audit (R2 re-sweep)

`rg -i 'claws|microsoft|bic|craftworks|gim-home'` across the four proposal docs:

- `claws` — appears throughout in expected adoption-story / package-naming context. The new `claws-guardrails` rename adds further `claws-*` references; all expected and correct.
- `Microsoft` — appears at snap-pre-rfc:5 and policy-pre-rfc:5 (author affiliation). Acceptable.
- `bic` — does NOT appear. Good.
- `craftworks` — does NOT appear. Good.
- `gim-home` — does NOT appear. Good. (The hapi-amendment plan references `gim-home` once at `:50` as a remote; that's an internal plan, not a public-share doc, so acceptable.)

**Subtler concerns** (unchanged from R1, mostly):

- `snap-pre-rfc.md:271` and `policy-pre-rfc.md:205` footers now say "Internal architecture audit notes available on request" instead of citing `.craft/out/audits/...` paths. **R1 HC-WARN 3 recommendation applied cleanly** — clean.
- `realigned-story.md:191` cites internal LoC ratios. The realigned-story is internal-only per its own header (`:4` "Status: internal architectural narrative"), so acceptable.
- Internal LoC counts at `realigned-story.md:104-107` (R1 cited line numbers) — the doc has shifted; current `:194-198` lists the four delete targets with internal LoC counts. Same caveat: realigned-story is internal-only; if any portion is excerpted for external share, those LoC counts should be rounded.

---

## Verdict

**APPROVE-WITH-WARNINGS**.

All four R1 HC-BLOCKs are resolved or partially-resolved-acceptably. The proposal package is now internally coherent: types are right, names are symmetric, hapi state is honest, math adds up within rounding error. The remaining concerns are hygiene-tier: one missing trim-wave deliverable list, one 10-LoC headline drift, one missing cross-link to the amendment plan, two cosmetic notes.

**To advance to share, the recommended priority** (none of these are share-blockers; all are improvements):

1. **HC-WARN R2-1** — add the rename-wave bookkeeping deliverable list to `realigned-story.md` "Trim wave scope" (~8-10 lines).
2. **HC-WARN R2-2** — converge the LoC headline range (search-and-replace 380-520 → 390-510 in two TLDRs).
3. **HC-WARN R2-3** — add the hapi-amendment plan cross-link to `realigned-story.md` "Sister docs" (one line).
4. **HC-NOTE R2-4** — document the `openclaw-adapter.ts`-inside-`claws-guardrails` filename convention (one sentence).
5. **HC-NOTE R2-5** — optional forward-looking note about the incubator slot.

**Boundary purity assessment**: the four documents now form a clean structural-integrity unit. The type system is right (R1 HC-BLOCK 1 cleared); the rename rule is symmetric (R1 HC-BLOCK 3 sub-finding 1 cleared); the hapi worktree state is honest (R1 HC-BLOCK 2 cleared); the math is within rounding error (R1 HC-BLOCK 4 cleared). The R2 residue is in the **ancillary bookkeeping** that orbits the structural integrity — workspace contract files that need to be touched in lockstep with the rename, but weren't yet enumerated as deliverables. That's a tractable cleanup-pass, not a re-architecture.

The proposal package is ready for channel share **after R2 fix-pass** of HC-WARN R2-1 + R2-2 + R2-3. R2-4 and R2-5 can ride into the channel share or be skipped at the user's discretion.

Boundary purity > migration convenience. The boundary holds.

— claws-repo-steward
