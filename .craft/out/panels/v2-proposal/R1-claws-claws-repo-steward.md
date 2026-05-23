# R1 — claws:claws-repo-steward — v2 OpenClaw contribution proposal

**Reviewer**: claws:claws-repo-steward
**Round**: 1
**Subject**: v2 OpenClaw contribution proposal — four documents
- `.craft/out/proposals/snap-pre-rfc.md`
- `.craft/out/proposals/policy-pre-rfc.md`
- `.craft/out/proposals/guardrails-adapter.md`
- `.craft/out/proposals/realigned-story.md`
**Date**: 2026-04-28
**Verdict (preview)**: REQUEST-CHANGES (4 HC-BLOCK + 6 HC-WARN + 5 HC-NOTE)

---

## Lens summary

The repo-steward's job is the boundary: spec conformance, workspace invariants, codename-leak guards, and naming discipline. On this proposal package the steward looks at three boundaries simultaneously:

1. The boundary between **the proposal as published** and **what's actually being drafted in the hapi worktree** — every public doc that misrepresents an in-flight upstream PR creates a debt that costs more to unwind than it saved to write.
2. The boundary between **claws's `packages/`** and **`@openclaw/*`** — the proposal's renames touch the npm `workspaces` array, the residue-grep Pass 3 allowlist, and `RB-repo-boundary.md`'s package-location rules.
3. The boundary between **codenames that are allowed in upstream-bound code** vs **internal codenames that must never leak**. `claws` itself is OK in our scope-flip path; `craftworks`/`bic` are the leak surfaces.

The package as a whole is directionally correct (the contract-first reframing from daemon-PR is real progress), but it has an alignment problem with the hapi worktree that, left unaddressed, will produce a pre-RFC that contradicts a parallel upstream PR drafted by the same author. That's the steward's number-one concern.

---

## Findings

### HC-BLOCK 1 — `OcPath` shape mismatch with hapi's actual oc-path contract

**Severity**: BLOCK. Both pre-RFCs use `OcPath` as if it were a string typed alias. It isn't.

**Evidence (hapi worktree)**:
- `C:/src/claws/packages/openclaw-workspace/src/path/oc-path.ts:23-34` — `OcPath` is a structured object: `{ file, section?, item?, field?, session? }`. There is no string form; the string round-trips via `parseOcPath(s) → OcPath` and `formatOcPath(OcPath) → s`.
- `C:/src/claws/packages/openclaw-workspace/src/path/oc-files.ts:20-30` — `OC_WORKSPACE_FILES` enumerates the 9 valid `file` values: `SOUL.md`, `TOOLS.md`, `AGENTS.md`, `MEMORY.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `skills/`, `lobster.yaml`. There is no `workspace` file. The first segment of an oc-workspace path must be one of these.
- `C:/src/claws/packages/openclaw-workspace/src/path/oc-uri.ts:23-25` — the proper "string" union is `ParsedOcUri` (discriminated union over workspace + config branches), not `OcPath`.

**Where the proposal is wrong**:
- `snap-pre-rfc.md:30,40-44` — `SnapshotStore.read(snap, path: OcPath)` is fine if `OcPath` is the structured form; but that's not how the type-text reads as drafted (the rest of the doc treats path-as-string).
- `policy-pre-rfc.md:69` — `export const POLICY_IR_PATH: OcPath = 'oc://workspace/.openclaw/policy-ir.json';` is **type-incorrect three ways**: (a) `OcPath` isn't a string type, so the assignment doesn't typecheck; (b) `'workspace'` isn't a valid `file`, so even if it parsed it would fail validation; (c) the underlying URI form is workspace-branch addressing, but we want a snapshot-internal path which is a different kind of address entirely.
- `realigned-story.md:33,70` — uses `.openclaw/policy/policy-ir.json` (no oc:// prefix at all), inconsistent with the policy-pre-rfc value above.
- `C:/src/claws/.craft/waves/260427+hapi-the-bringer+openclaw-upstream/pr-drafts/PR-6.md:79` — uses `oc://snapshot/3a7f.../policy/policy-ir.json` (a *snapshot*-branch URI, which doesn't exist in `oc-uri.ts` today as a recognized branch).

So we have **four different path conventions** across the chain — proposal docs alone disagree three ways, and the hapi PR-6 introduces a fourth that doesn't yet have a parser.

**Required fix before share**:
1. Pick one canonical form for the policy-IR address. Realistic options:
   - `oc://snapshot/<id>/policy/policy-ir.json` — requires extending `oc-uri.ts` with a `snapshot` branch (NEW work in hapi PR-6 or a follow-on).
   - A relative path inside a snapshot (e.g., `.openclaw/policy/policy-ir.json`), typed as `string`, **not** as `OcPath`. This is what the realigned-story implies and is the smallest move.
2. Type the constant correctly. If we keep it relative-string, declare `export const POLICY_IR_PATH: string = '.openclaw/policy/policy-ir.json';` and drop the `OcPath` annotation.
3. Reconcile snap's `read(snap, path: OcPath)` against this. If `read` takes a path *inside* a snapshot, the parameter should be a relative-string or a dedicated `SnapshotInternalPath` type, NOT `OcPath` (`OcPath` addresses live workspace files, not snapshot-internal blobs).
4. Update all four proposal docs and hapi PR-6 in lockstep.

This is the steward's #1 spec-conformance concern: an upstream-bound contract that doesn't typecheck is a maintainer no-op auto-reject.

---

### HC-BLOCK 2 — Hapi worktree wave/PR sequencing diverges from what the proposals claim

**Severity**: BLOCK. The proposals describe a sequencing that does not match `wave.yaml` in the hapi worktree.

**What the proposals say**:
- `realigned-story.md:60-63` — "**oc-path (in-flight, Hapi PR-2)**".
- `policy-pre-rfc.md:117` — table row: "**oc-path** (workspace) | small | in-flight (PR-2 in Hapi wave) | —".
- `realigned-story.md:132` — "The Hapi wave's existing PR-7 (1665 LoC daemon) gets restructured into snap-pre-rfc's three layers (contract, plugin, CLI) before opening, replacing it with a much smaller PR. PR-6 (policy) similarly collapses to PR-6a (~80-220 LoC types-only)."

**What hapi `wave.yaml` actually says** (`C:/src/claws/.craft/waves/260427+hapi-the-bringer+openclaw-upstream/wave.yaml`):
- `pr-drafts/` contains `PR-1.md` … `PR-6.md` only. There is **no PR-7**. The cp-5 final checkpoint is `PR-6` (= snap).
- `cp-2.description` (line 320-329): "Single upstream PR after the 2026-04-28 merge of former PR-2 into PR-1: **PR-1 ships @openclaw/workspace + replaceConfigFile + dual oc:// URI scheme + 13-code lint surface**." Oc-path is bundled into **PR-1**, not "PR-2."
- `cp-3.description` (line 393-403): "**PR-2 (OC-4 stripFrontMatter raw-preserve, ~1 line) + PR-3 (@openclaw/guardrails)**." Hapi's PR-2 is the OC-4 strip-front-matter surgical fix, not oc-path.
- `cp-4.description` (line 404-414): PR-4 = OC-7 conjunctive merger, PR-5 = `@openclaw/policy` + 9-verb subcommand.
- `cp-5.description` (line 415-426): **PR-6 = `@openclaw/snap` + 11-verb subcommand + HTTP server + scope-flip + acceptance**. Read PR-6.md: it is the **shipping daemon-shape**, with `openclaw snap serve --port 8443`, the `/v1/snapshots*` HTTP surface, audit invariants, and temporal-query verbs (`resolvePolicy --at`).

**The collision**: the v2 snap pre-RFC explicitly argues against the daemon-shape (lines 22-23, 87 — "Not asking to land a daemon-shape upstream as a top-level package"), while hapi's PR-6 *is* a daemon-shape with port + HTTP surface + audit chain coupling. The yankee audit (which this pre-RFC is built on) concluded the daemon shape would be rejected; hapi's PR-6 has not yet been retired or reshaped to match.

**Required fix before share**:
1. Reconcile the proposals' references to hapi PR numbers — citing "PR-2" for oc-path is plain wrong; it's PR-1 in hapi's wave (and oc-path lives inside the workspace package).
2. Decide: either retire/reshape hapi's PR-6 to match snap-pre-rfc's three-layer shape *before* the pre-RFC posts, or note explicitly in the pre-RFC that hapi PR-6 is the predecessor draft about to be restructured. Posting a pre-RFC that contradicts an open hapi PR-draft (not yet opened upstream, but documented internally) is a self-inflicted credibility wound.
3. Drop the "PR-7 retired" claim from `realigned-story.md:132` — there is no PR-7 in the current hapi wave; it was renumbered when PR-2 oc-URI was added. Either find the actual PR number or drop the historical narrative.

---

### HC-BLOCK 3 — Renames break the residue-grep Pass 3 allowlist contract assumptions

**Severity**: BLOCK if executed without coordinated changes; WARN if explicitly addressed.

**Evidence**:
- `C:/src/claws/scripts/residue-grep.sh:33` — `PASS3_ALLOWED='^(workspace|guardrails|policy|snap|lsp)$'`. Pass 3 enforces that only these five suffixes may live as `@bic/openclaw-*`.
- `C:/src/claws/docs/repo/specs/RB-repo-boundary.md:7-19` — Package location rule 1 reserves `packages/openclaw-*/` for "incubating packages destined for `@openclaw/*` upstream"; rule 2 reserves `packages/claws*/` for internal-only.
- `C:/src/claws/package.json:7-21` — workspaces array contains `packages/openclaw-snap`, `packages/openclaw-policy`, etc.

**What the proposal proposes**:
- `realigned-story.md:148-151` — rename `packages/openclaw-snap/` → `packages/claws-snap-server/`; `packages/openclaw-policy/` → `packages/claws-policy-generator/`. `packages/openclaw-guardrails/` stays.

**What the proposals don't explicitly call out**:
1. **Package name semantics shift**: post-rename, `claws-snap-server` is no longer in the `@bic/openclaw-*` namespace, so it implicitly drops out of Pass 3 allowlist scope. Pass 3 is fine with the absence (it only restricts the `openclaw-*` suffix space). But this is a *semantic* shift that flips these packages from "incubating-for-upstream" (Layer 1) to "internal-only" (Layer 2 of `RB-repo-boundary.md`). The realigned-story doesn't acknowledge that the rename downgrades them from `incubating` to `internal-cli`/`internal-sdk` per `RB-repo-boundary.md:91-105`.
2. **The kept-as-`openclaw-`-prefix asymmetry is unjustified**: `realigned-story.md:151` keeps `packages/openclaw-guardrails/` because it has no upstream contribution. But the same logic argues for renaming all three to `claws-*` (none has a *graduating* package — guardrails ships zero LoC upstream; snap ships a contract; policy ships a contract — none of the three packages graduates). The rename rule should be: "every claws-side package that is not the `@openclaw/*` graduate gets renamed to `claws-*`." Either rename guardrails too or document why guardrails is special-cased.
3. **Workspaces array update**: `realigned-story.md` does not mention updating the npm `workspaces` array in the root `package.json` (the field at lines 7-21 of the file). This must be a same-PR change to avoid a state where the workspace declares non-existent paths. Add it explicitly to the trim-wave deliverable list.
4. **`RB-repo-boundary.md` dependency-direction diagram needs updating**: lines 24-33 of `RB-repo-boundary.md` reference `snap` and `policy` by their current `@bic/openclaw-*` names; if the rename ships, the diagram references stale names.

**Required fix before share**:
1. Document the rename rule consistently: either all-three-renamed or explicitly explain why guardrails stays.
2. Add an explicit deliverable line under the trim-wave: "update root `package.json` workspaces array; update `RB-repo-boundary.md` package-rules + dependency-direction diagram; update `.no-craftworks-allowlist.yaml` paths that reference the old package names."
3. Acknowledge the layer-flip from `incubating` → internal in `RB-repo-boundary.md:91-105` semantics.

---

### HC-BLOCK 4 — Cross-doc LoC math doesn't add up, and the discrepancy is load-bearing

**Severity**: BLOCK. If the public number is wrong, every reviewer catches it on the first sweep.

**The numbers as stated**:
- `snap-pre-rfc.md:11`: "**~275 LoC total**" (= 25 contract + 100 plugin + 150 CLI).
- `policy-pre-rfc.md:11,95`: "**~80–150 LoC + ~50 LoC** ... **~130–200 LoC**".
- `guardrails-adapter.md:10,45`: "**~50 LoC adapter**, 0 upstream".
- `realigned-story.md:10`: "**~250-500 LoC** total upstream surface across three small contract PRs."
- `realigned-story.md:76-84` (the table):

  | Contract | Upstream LoC |
  |---|---:|
  | oc-path | ~25 |
  | snap | ~275 |
  | PolicyIR | ~80-220 |
  | guardrails | 0 |
  | **Total** | **~380-520** |

**The math problems**:
1. `realigned-story.md:10` says "~250-500" but the table on `:84` says "~380-520." Internal contradiction in the same doc.
2. The `:84` upper bound is `25 + 275 + 220 + 0 = 520`, which is correct. The lower bound is `25 + 275 + 80 + 0 = 380`, also correct. So `:10`'s "~250-500" is a separate, wrong, lower-bound calculation. Trace: 250 ≈ 25+150+80, treating snap as **just the contract** (not the whole 275). The headline number drops the reference plugin + CLI; the table includes them. Pick one and stick to it.
3. `policy-pre-rfc.md:11`: "**~250–500 LoC of new upstream surface across all four contracts**" — same range as realigned-story.md:10, same issue.
4. `policy-pre-rfc.md:95`: "~130–200 LoC" for policy. But realigned-story.md:84 says "~80-220 LoC". The 130 vs 80 lower-bound discrepancy traces to whether the optional ~50 LoC helper file is counted: `policy-pre-rfc.md:11,95` say "+~50 LoC" deterministically; realigned-story.md says "**optional** ~70 LoC" (note: 70, not 50 — a third number). 50 vs 70 is the actual mismatch.
5. `policy-pre-rfc.md:74` says the runtime helpers file is "~50 LoC"; `realigned-story.md:70` says "~70 LoC." Direct contradiction between sister docs.

**Required fix before share**:
1. Pick ONE canonical headline range and use it across all four docs. Recommended: `realigned-story.md:84`'s "~380-520 LoC" since it includes everything the proposals actually ship.
2. Pick ONE canonical helper-file size (50 or 70) and propagate.
3. Fix `realigned-story.md:10` → "~380-520 LoC" (or rewrite the headline to disclaim the exact total).
4. Fix `policy-pre-rfc.md:11` to use the same range.

A maintainer who pattern-matches on "this team can't add three numbers correctly" will not invest review effort. The math has to be airtight before share.

---

### HC-WARN 1 — Naming drift: WorkspaceSnapshot vs OcSnapshot vs Snapshot

**Evidence**:
- `snap-pre-rfc.md:33-44` — type is `Snapshot` (no qualifier).
- `snap-pre-rfc.md:76` (open question 4) — proposes `WorkspaceSnapshot`, `oc-snapshot`, or `governance-snapshot` to dodge collision with upstream's `src/gateway/protocol/schema/snapshot.ts` (presence/health snapshots).
- `realigned-story.md:162` — open question lists "**WorkspaceSnapshot vs OcSnapshot**".

**Risk**: PolicyIR's `Snapshot` reference (`policy-pre-rfc.md:80` — `readPolicyIR(snapshot: Snapshot): PolicyIR`) imports from snap's contract; if snap renames the type pre-merge, PolicyIR's draft drifts too.

**Recommended fix**:
- Pick `WorkspaceSnapshot` now (most informative; aligns with hapi's "workspace" framing) and use it consistently in all four proposal docs.
- Avoid `OcSnapshot` — `Oc` prefix is a redundant qualifier inside the OpenClaw codebase ("Oc" is the namespace).
- Make the open-question-4 in snap-pre-rfc still ask the channel for confirmation, but pre-commit in the doc to a default ("we'll ship as `WorkspaceSnapshot` unless told otherwise").

This is steward-flagship naming discipline: don't ship four docs that float on an unanswered name.

---

### HC-WARN 2 — POLICY_IR_PATH constant location vs spec scaffolding

**Evidence**:
- `policy-pre-rfc.md:69` declares `POLICY_IR_PATH` as a TypeScript constant in `src/plugin-sdk/policy-ir.ts`.
- claws's existing spec convention (`docs/repo/specs/`, see `RB-repo-boundary.md`) is that load-bearing constants get documented in a SPEC alongside the code (e.g., LBC, LBV, LBA, LBD pattern referenced in user prompt).

**Question for the steward's lens**: does `POLICY_IR_PATH` deserve a SPEC entry? The path is a wire-protocol-class constant — every guardrail consumer must agree on the bytes-on-disk location of the policy-IR. A typo or version-skew in this string fragments the ecosystem.

**Recommended fix**:
- For upstream-bound contracts in `plugin-sdk/`, the spec lineage lives in `src/plugin-sdk/{name}.ts`'s JSDoc + the `docs/plugins/` register entry. It does not need to mirror claws's SPEC pattern.
- HOWEVER, if claws ships a downstream adapter that consumes `POLICY_IR_PATH`, that adapter SHOULD have a claws-side SPEC entry referencing the upstream constant by SHA pin. Add a note to `realigned-story.md:148-151` (the rename section): "`claws-policy-generator/` will register a spec entry pinning the upstream `POLICY_IR_PATH` constant for change-detection."

This isn't a public-share blocker but it's a steward-side hygiene gap.

---

### HC-WARN 3 — Codename leak audit: minor drift, no breakers

**Sweep performed**: `rg -i 'claws|microsoft|bic|craftworks'` against all four proposal docs.

**Findings**:
- `claws` appears throughout the proposal docs in adoption-story / downstream-impl / package-naming context. This is **expected and correct** — `claws` is our public-facing scope and the proposals explicitly identify the author repo. Not a leak.
- `Microsoft` appears at `snap-pre-rfc.md:5` and `policy-pre-rfc.md:5` (`Author: giodl@microsoft.com (claws monorepo / Microsoft)`). Acceptable — author attribution is normal in upstream pre-RFCs and Microsoft is the legitimate author affiliation per Microsoft contribution policy.
- `bic` does NOT appear in any of the four proposal docs. Good. `bic` is the internal namespace and would be a leak.
- `craftworks` does NOT appear in any of the four proposal docs. Good. `craftworks` is the historical monorepo and would absolutely be a leak.

**Subtler concerns**:
- `snap-pre-rfc.md:99` references the internal path `packages/openclaw-snap` (~1665 LoC). This is a path inside our repo, not a leak per se — the repo is scoped `gim-home/claws` and `packages/openclaw-snap` is a public-by-design path. But it's worth confirming the `gim-home/claws` repo is public before this pre-RFC posts; if it's still private, citing internal LoC ratios may need redaction.
- `policy-pre-rfc.md:88,107` cites `claws policy generate/check/evaluate` CLI verbs. These are claws-side and downstream — fine to mention, but consider whether the maintainer cares to know our CLI shape (probably yes, as proof-of-implementation).
- `realigned-story.md:104-107` lists internal LoC counts for `claws-sdk/src/{snapshot,governance,compliance,audit}/`. Same caveat as above — internal LoC may not need to be public. Recommend dropping these or rounding to "thousands of lines" before public share.
- `snap-pre-rfc.md:110` and `policy-pre-rfc.md:150` say "All contract types and sketches are derivative of an internal audit at `.craft/out/audits/...`". `.craft/` is a craftworks-era convention path; it does NOT contain the literal `craftworks` so it doesn't trip the residue grep, but a maintainer reading the footer will pattern-match `.craft` as an internal tool reference. Recommend either rephrasing ("internal audit notes") or dropping the path reference.

**Recommended fix**:
- Drop the `.craft/out/audits/...` paths from the public-share footers (snap-pre-rfc.md:110; policy-pre-rfc.md:150). Replace with "internal audit notes; available on request."
- Round or drop internal LoC references in the public-share docs (snap-pre-rfc.md:99; realigned-story.md:104-107). The realigned-story is internal anyway, so leaving them there is fine; only snap and policy pre-RFCs are channel-shareable.
- Confirm `gim-home/claws` public visibility before post.

---

### HC-WARN 4 — Doc organization: long-term home not specified

**Evidence**:
- All four proposal docs live at `.craft/out/proposals/`. This is a wave-output directory by convention.
- `realigned-story.md` doesn't specify where these docs go after share. Do they:
  - Stay in `.craft/out/proposals/` (orphaned post-wave)?
  - Migrate to `docs/openclaw-contributions/` (under the existing `.no-craftworks-allowlist.yaml` `docs/upstream/**` allowlist)?
  - Get archived in `docs/upstream/proposals/` to track the public-share artifacts?

**Recommended fix**:
- Add a section to `realigned-story.md` under "What's NOT in scope" or a new "Doc lifecycle" section: "Post-share, the four proposals migrate to `docs/upstream/proposals/v2-contract-chain/` with a Status header (e.g., `Status: Submitted to #clawtributors 2026-XX-XX`) so the public-share state is version-controlled."
- Add explicit version markers to each doc's frontmatter (`Version: v2.0`).

---

### HC-WARN 5 — Manifest discipline (sync-manifest.json, .strict() Zod, sourceRepo literal) not addressed

**Evidence**:
- claws's deploy bridge (per role frontmatter knowledge) enforces `sync-manifest.json` filename + Zod `.strict()` parse + `sourceRepo` string literal. This applies to anything emitted through the deploy pipeline.
- The proposal renames `packages/openclaw-snap` → `packages/claws-snap-server`. If `claws-snap-server` produces deploy-bridge artifacts (manifests), the manifest schema's `sourceRepo` literal pins package identity.

**Question to the proposal**:
- Does `claws-snap-server` emit a `sync-manifest.json` today? If yes, does the rename require updating the `sourceRepo` literal? A `.strict()` schema with a hardcoded `sourceRepo: 'openclaw-snap'` will REJECT a manifest from the renamed package on the next deploy.

**Recommended fix**:
- Add a deliverable line under the trim-wave: "audit `tools/lobster-deploy/` and `packages/claws-*/` for `sync-manifest.json` consumers; update `sourceRepo` literals to match renamed packages; bump manifest schema version if breaking."
- This is a ~1-hour task but it's a hard manifest-conformance break if missed.

---

### HC-WARN 6 — `extensions/snapshot/` reference plugin path may collide with existing OpenClaw extension namespace

**Evidence**:
- `snap-pre-rfc.md:49` proposes `extensions/snapshot/` as the reference-plugin home.
- `snap-pre-rfc.md:97` already lists "voice-call, phone-control, memory-lancedb, acpx, diagnostics-otel" as existing extension paths — none uses a single-word generic name.

**Concern**:
- Single-word `snapshot` is generic enough that a future extension might want it. Upstream's existing `src/gateway/protocol/schema/snapshot.ts` (yankee's namespace-collision flag) suggests `snapshot` is *already* a contested name in the codebase.
- More specific names: `extensions/workspace-snapshot/`, `extensions/snap-fs/`, `extensions/oc-snapshot/`.

**Recommended fix**:
- Open question 4 in `snap-pre-rfc.md` already addresses the type-name ambiguity. Extend the question to cover the extension-path name, or tie the answers together: if the type becomes `WorkspaceSnapshot`, the extension path becomes `extensions/workspace-snapshot/`.

---

### HC-NOTE 1 — `claws-policy-generator` absorbs governance + compliance + audit; check that names don't shadow upstream

`realigned-story.md:148-151` says claws-policy-generator absorbs `governance/`, `compliance/`, `audit/` from claws-sdk. Upstream OpenClaw has no `governance` namespace today (per yankee/pundit/bandit audits) and limited `compliance` coverage. Folding these into a `claws-*` package is fine, but:

- Verify no future-upstream-bound code path imports through the `claws-policy-generator/governance/` path. If it does, the import would fail Pass 3 (which only allows `@bic/openclaw-{workspace,guardrails,policy,snap,lsp}`).
- Recommend the trim wave include a unit test asserting `claws-policy-generator` is not imported FROM any `packages/openclaw-*/` package (one-way dep).

This is a prudence note, not a block.

---

### HC-NOTE 2 — Open question 5 in snap-pre-rfc references "capability-table membership"

`snap-pre-rfc.md:77` and `policy-pre-rfc.md:101` both ask whether their contract earns a row in `docs/plugins/architecture.md:34-50`. This is good (it's the right question to ask). One downstream consequence the steward will care about post-answer:

- If snap and PolicyIR earn capability-table rows, our claws-side packages must comply with the capability-table conformance test (per upstream's existing test pattern). The downstream `claws-snap-server` and `claws-policy-generator` will need a conformance suite.
- Recommend the trim wave's deliverable list pre-allocate a "conformance-test" slot for whichever contracts get capability rows.

---

### HC-NOTE 3 — Sequencing claim "PolicyIR depends on snap loosely" — verify what "loosely" means

`policy-pre-rfc.md:120,123` and `realigned-story.md:128` both characterize the snap → PolicyIR dependency as "loose." This is technically true: `POLICY_IR_PATH` is a string, the runtime helpers reference `SnapshotStore` only optionally.

But: if PolicyIR's PR opens *before* snap's PR, the policy types reference a `SnapshotId` that doesn't yet exist in upstream's `plugin-sdk/`. The realigned-story handles this implicitly (snap → PolicyIR sequencing) but the pre-RFCs themselves should make the dep explicit, not "loose":

- Recommend `policy-pre-rfc.md:120-123` rewrite from "loose" to: "PolicyIR's contract imports `SnapshotId` from snap's contract. PolicyIR's PR therefore must land *after* snap's. The optional runtime helpers reference `SnapshotStore`; both can land in the same PolicyIR PR."

This is a clarification, not a block.

---

### HC-NOTE 4 — `gateway-as-generator` framing in realigned-story may mislead

`realigned-story.md:25-28` describes "**gateway calls policy-generator** (downstream impl, per-consumer convention)" — implying the gateway has a registration slot for a generator. But the policy pre-RFC doesn't propose adding a generator-registration slot; it leaves generation entirely downstream (claws-side fileingest pipeline).

- The realigned-story's flow diagram is an internal-narrative aspiration; the pre-RFCs reflect the actual upstream surface.
- Recommend `realigned-story.md` add a note: "The 'gateway calls generator' arrow in the flow above is a downstream-side abstraction; upstream's surface stops at the PolicyIR contract. Claws's serve layer does the gateway-side calling."

This prevents a maintainer reading the realigned-story (if shared) from thinking we're proposing a new upstream registration slot we aren't.

---

### HC-NOTE 5 — PR-7 retirement claim has no in-tree note

The realigned-story (`:132`) and the user's prompt mention "Hapi PR-7 retired in favor of snap-pre-rfc." Searching the hapi worktree:
- `wave.yaml` does not mention PR-7 retirement explicitly.
- `pr-drafts/` has PR-1 … PR-6, no PR-7 ever existed in the current revision (PR-7 was a numbering artifact from the earlier 2026-04-27 plan that got renumbered when PR-2 oc:// URI was added).
- PR-6 in hapi is the snap-shipping daemon-shape; if that's the one being retired/restructured, the doc should say so.

**Recommended fix**:
- Update `realigned-story.md:132` to: "The Hapi wave's PR-6 (1665-LoC snap daemon, drafted before yankee's audit) gets restructured into snap-pre-rfc's three layers (contract + plugin + CLI) before opening upstream."
- Add a note to `C:/src/claws/.craft/waves/260427+hapi-the-bringer+openclaw-upstream/wave.yaml` cp-5 description: "PR-6 SHAPE UPDATE 2026-04-29: per yankee/pundit audits + v2 proposal, PR-6 reshapes from daemon-shape to contract+plugin+CLI per `.craft/out/proposals/snap-pre-rfc.md`."

---

## Cross-doc consistency matrix

| Item | snap-pre-rfc | policy-pre-rfc | guardrails-adapter | realigned-story | Hapi worktree |
|---|---|---|---|---|---|
| Path constant form | (n/a — uses `OcPath` parameter) | `'oc://workspace/.openclaw/policy-ir.json'` | uses POLICY_IR_PATH symbol | `.openclaw/policy/policy-ir.json` | `oc://snapshot/<id>/policy/policy-ir.json` |
| Total LoC | 275 | 130-200 | 50 | 380-520 (table) / 250-500 (TLDR) | (n/a) |
| Helper-file size | (n/a) | ~50 LoC | (n/a) | ~70 LoC | (n/a) |
| Snap type name | `Snapshot` | `Snapshot` (imported) | (n/a) | "WorkspaceSnapshot vs OcSnapshot" | "snapshot" |
| Hapi PR ref | (n/a) | "PR-2" | (n/a) | "PR-2", "PR-7" | PR-1 (workspace), PR-6 (snap) |
| Snap shape | contract + plugin + CLI | (cites snap) | composes upstream runner | three layers, daemon retired | DAEMON SHAPE (PR-6.md) |

**Consistency score**: 2 of 6 rows fully aligned. The naming/path/PR-number/sequencing rows all need reconciliation pass.

---

## Verdict

**REQUEST-CHANGES**.

The reframing from monolithic-daemon-PR to three-small-contract-PRs is genuinely better and the steward supports the directional move. But the proposal package as currently drafted has four BLOCK-class issues (oc-path type-incorrectness, hapi-worktree misalignment, rename-without-workspace-array-update, LoC-math contradictions) that will be caught on a maintainer's first read.

**To advance to share, fix in priority order**:
1. **BLOCK 1** — pick a canonical `POLICY_IR_PATH` form, type it correctly, propagate through all four docs and hapi PR-6.
2. **BLOCK 2** — reconcile hapi PR numbering / sequencing / PR-6 shape with the new contract-first framing. Update `wave.yaml` cp-5.notes and the proposals' references to match.
3. **BLOCK 3** — make the renames explicit + complete: workspaces array, `RB-repo-boundary.md` package-rules + diagram, manifest sourceRepo literals, `.no-craftworks-allowlist.yaml` paths.
4. **BLOCK 4** — fix the LoC math headlines across all four docs; converge on one canonical range.

Once these four are addressed, R2 is recommended with the steward, plus at least one of (gateway-eng, release-eng) to ratify the rename + sequencing.

**Round 1 close**: this verdict gates the proposals' move from `.craft/out/proposals/` (wave-output) to a public-share state. The audits underneath (yankee/pundit/bandit/whiskey/x-ray) are sound. The framing on top of them is right. The bookkeeping on the framing isn't yet.

Boundary purity > migration convenience.

— claws-repo-steward
