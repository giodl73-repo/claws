# Consumer catalog — pre-carve impact assessment

**Date**: 2026-04-29 (LKG pivot recorded 2026-04-30; 3-PR consolidation 2026-04-30)
**Purpose**: before carving `packages/openclaw-{snap,policy,guardrails}` to conform to the v2 contracts, inventory their consumers so each carve is a known-impact refactor, not a surprise.

---

## CHAIN CONSOLIDATION (2026-04-30) — final shape

The contribution wave consolidates to **3 upstream PRs** by folding the two surgical fixes into their parent contracts:

| PR | What ships | Killer step |
|---|---|---|
| **PR-1: `@openclaw/workspace`** | package + lint + oc:// URIs + JSONC byte-identity + sentinel guard + **stripFrontMatter raw-preserve** (folded from former PR-2) | byte-stability foundation across the 9-file workspace surface |
| **PR-2: LKG contract** | `LKGStore` types + reference impl + 326 adversarial scenarios | **the carrier** — per-file content-addressing, backend-agnostic, recovery built-in |
| **PR-3: PolicyIR + `ctx.lkgFingerprint` + hook merger** | PolicyIR types + ctx extension + runtime helpers + **conjunctive AND merger fix** (folded from former PR-4) | **end-to-end policy chain-of-custody** |

Strategic frame: **every policy decision is anchored to the LKG-fingerprinted state of the workspace at a known point in time.** PR-1 makes the workspace files byte-stable inputs. PR-2 makes the workspace state content-addressable. PR-3 anchors decisions to a specific PolicyIR version and preserves chain-of-custody at enforcement.

Folded drafts in `pr-drafts/superseded/` with FOLDED notes:
- `superseded/PR-2-stripfrontmatter-raw-preserve.md` → folded into `PR-1.md`
- `superseded/PR-4-hook-merger-conjunctive.md` → folded into `v2-policy-ir.md`

Plus one downstream-only: `claws-guardrails` adapter (no upstream PR by design).

---

## STRATEGIC PIVOT (2026-04-30) — read this first

After surveying upstream demand (issue-tracker scan + reading the
maintainers' shipped pattern at commit `af56926e2fc4`), the v2
contract chain pivots from **"introduce a SnapshotStore + staging /
rollback abstraction"** to **"factor out the existing config-LKG
mechanism into a generalized LKGTracker that any plugin can register
against."**

Why the pivot:

- Issue [#70528](https://github.com/openclaw/openclaw/issues/70528)
  closed-as-implemented in `v2026.4.23`. The mechanism in
  `src/config/io.observe-recovery.ts` is exactly our threat model
  — preserve, validate, restore-on-invalid, audit, notify next agent
  turn — but scoped to config files only.
- "Introduce a parallel snapshot system" is Linux/RedHat-shaped. The
  upstream maintainer culture (10-PR cap, small-focused-PR norm) and
  community personas (Hobbyist, Self-Hoster) push back on parallel
  abstractions. "Generalize what already works" is Chromium/Edge-shaped.
- Direct upstream demand for our original framing: ~zero. Direct
  demand for what already shipped: high (#70528 + multiple session-
  checkpoint requests + #40245 shared workspace). The LKG framing
  matches the latter.
- The downstream code we built (`@bic/openclaw-snap`, e2e tests, R5-
  lowering, content-addressing) all survives — it becomes a *consumer*
  of the LKG primitive rather than a parallel system.

Vocabulary changes:

| Old (v2-snap-contract framing)        | New (v2-lkg-contract framing)              |
|---------------------------------------|--------------------------------------------|
| `SnapshotStore`                       | `LKGStore`                                 |
| `Snapshot`                            | `LKGVersion` / `LKGFingerprint`            |
| `capture(workspace)` (workspace-level) | per-file LKG promote on validate           |
| `RefStore` (HEAD/STAGE/history)        | (gone — collapses into LKG state per file) |
| `ctx.snapshotId`                      | `ctx.lkgFingerprint` (or just hash)        |
| Workspace-shaped lifecycle (promote/rollback/discard CLI verbs) | per-file, validator-driven (no user-facing CLI surface upstream) |

What stays:
- All downstream code in `@bic/openclaw-snap` (vocabulary rename,
  semantically unchanged)
- Per-file sha256 verification (S01 fix), atomic write (S49 fix),
  path-traversal guard (S30/S40)
- The policy plugin shell (cache + fail-closed-on-load)
- R5-lowering in PolicyIR (separate concern)
- The 100+ adversarial test scenarios (rename, recontextualize)
- The composability proof (e2e tests)

What's dropped from upstream-PR scope (still kept downstream as
enterprise tooling):
- The 9-verb `claws snap *` CLI surface (capture/promote/rollback/
  discard/etc.) — supervisor-facing, not upstream-shaped
- "Workspace as one bundle" abstraction (LKG is per-file)
- "Staging" as a first-class concept

Future LKG consumers (each a separate follow-on PR or wave):
- PolicyIR (`policy-ir.json`) — register an LKG tracker
- Hook output files
- Session checkpoints (#13700, #17211, #58028, #60864)
- Shared workspace files (#40245)
- Cross-agent concurrent writes (#29947) is a *separate* problem, not
  LKG-shaped

Documents driving the pivot:
- `pr-drafts/v2-lkg-contract.md` — the new pre-RFC (replaces v2-snap-contract.md)
- `pr-drafts/superseded/v2-snap-contract.md` — old draft preserved for history
- `lobster-vault/Tech/OpenClaw/specs/architecture/last-known-good.md` — LKG architecture spec
- `lobster-vault/Tech/OpenClaw/guides/internals/08-last-known-good.md` — at-a-glance guide

The rest of this document is the *original* carve impact assessment
from 2026-04-29 (pre-pivot). Most of it is still useful — the consumer
DAG, the per-package risk assessment, and the test-shipping order — but
the v2-shape mappings should be read with the LKG vocabulary.

## Public API surface (what each package exports today)

| Package | Subpath exports |
|---|---|
| `@bic/openclaw-snap` | `.`, `./cli-handlers` |
| `@bic/openclaw-policy` | `.`, `./runtime`, `./types`, `./cli-handlers`, `./nonce-store`, `./seq-counter`, `./trust-set` |
| `@bic/openclaw-guardrails` | `.`, `./audit`, `./approvals`, `./budget`, `./identity`, `./siem`, `./secrets`, `./handle-binding` |

## Inter-package dependency graph

```
   @bic/openclaw-workspace        @bic/openclaw-guardrails
   (PR-1 substrate, shipped)      (leaf — no openclaw-* deps)
            ↑                              ↑
            │ canonicalize                 │ audit + types
            │                              │
   ┌────────┴───────────────┬──────────────┴───────────┐
   │                        │                          │
   @bic/openclaw-snap   @bic/openclaw-policy            │
            ↑                ↑                         │
            │                │                         │
            └─────claws CLI──┘                         │
                                                       │
                          ┌────────────────────────────┘
                          │
                  e2e tests (heavy use of all three)
```

**Verified clean**: no circular dependencies between snap/policy/guardrails. Earlier broader greps showed cross-references inside docstrings / comments, not actual `import` statements.

## External consumers (production code only — tests excluded)

### `@bic/openclaw-snap`

| File | Subpath used | What it does |
|---|---|---|
| `packages/claws/src/cli.ts` | `.` | claws CLI verb dispatch |
| `packages/claws/src/commands/snap-serve.ts` | `.` | claws-side `snap-serve` subcommand wrapper |

**Total: 2 production consumers.** Both internal to the claws monorepo.

### `@bic/openclaw-policy`

| File | Subpath used | What it does |
|---|---|---|
| `packages/claws/src/cli.ts` | `.` | claws CLI verb dispatch (9-verb policy subcommand group) |

**Total: 1 production consumer** (plus 6+ e2e/integration test files exercising the package).

### `@bic/openclaw-guardrails`

Used heavily by **openclaw-snap and openclaw-policy** (the inter-package dep graph above):

| File | Subpath used |
|---|---|
| `packages/openclaw-snap/src/server/audit.ts` | `./audit` |
| `packages/openclaw-policy/src/nonce-store/persistent-store.ts` | `./audit` |
| `packages/openclaw-policy/src/emit/emit-audit-chain.ts` | `./audit` |
| `packages/openclaw-policy/src/ops/verify-audit.ts` | `./audit` |
| `packages/openclaw-policy/src/ops/types.ts` | `./audit` |
| `packages/openclaw-policy/src/cli-handlers/doctor.ts` | `./audit` |
| `packages/openclaw-policy/src/cli-handlers/verify.ts` | `./audit` |
| `packages/openclaw-policy/src/trust-set/loader.ts` | `./audit` |

**Total: 8 production consumers across snap + policy.** All using the `./audit` subpath only (audit chain, audit entries, verify, sinks).

## Carve impact per package

### `openclaw-snap` → conforms to v2 `SnapshotStore`

**Drop:**
- `src/cli-handlers/serve.ts` (the `snap serve` daemon CLI handler) → folds into upstream's `openclaw snap serve` CLI verb when contract lands
- `src/server/handlers.ts`, `src/server/audit.ts`, `src/server/index.ts`, `src/server/startServer.ts` (HTTP server scaffolding) → folds into upstream's reference plugin under `extensions/snapshot/`

**Keep:**
- `src/store/filesystemStore.ts`, `src/store/inMemoryStore.ts` (the `SnapshotStore` impl bodies)
- `src/canonical.ts` (canonical hashing — composes with PR-1's `@openclaw/workspace/canonicalize`)
- `src/types.ts` (will conform to v2 `SnapshotStore` types after local-fork swap)
- `src/error.ts` (`SnapshotErrorCode` enum already aligned with v2 — verify and pin)

**External consumer impact:**
- `packages/claws/src/cli.ts` → UPDATE. The CLI dispatch needs to point at the new `SnapshotStore` impl entry instead of the daemon-shape registry.
- `packages/claws/src/commands/snap-serve.ts` → UPDATE OR REMOVE. The "claws-side snap-serve" wrapper either becomes a thin wrapper over `openclaw snap serve` (when upstream lands) OR gets removed if the upstream verb is sufficient.

**Risk: LOW.** Two consumer files in claws. Test suite continues to verify the impl.

### `openclaw-policy` → conforms to v2 `PolicyGenerator<CapabilityManifest>`

**Drop:**
- `src/cli-handlers/*` (the 9-verb subcommand) → moves to a downstream `claws/src/commands/policy-*.ts` set; reshape per the trim plan
- The R0-R5 tier system as separate first-class fields → encoded into PolicyIR `denyRules` per `realigned-story.md` "PolicyIR is generic; downstream R5-lowering"

**Keep:**
- `src/generator/`, `src/compile/`, `src/emit/` (the parse/compile/emit pipeline; emits v2 PolicyIR shape)
- `src/governance/`, `src/compliance/` (rule families that encode into PolicyIR `denyRules`)
- `src/runtime/` (the lock-point ABI helpers — composes with v2 `policy-ir-runtime`)
- `src/nonce-store/`, `src/seq-counter/`, `src/trust-set/` (downstream concerns; not in v2 PolicyIR contract)
- `src/ops/`, `src/migrate.ts`, `src/fs-pipeline.ts` (downstream pipeline)

**External consumer impact:**
- `packages/claws/src/cli.ts` → UPDATE. CLI dispatch may need to track the cli-handlers/ relocation.

**Risk: MEDIUM.** One consumer file, but the package is large (6.2k LoC) and the carve internally restructures the PolicyIR shape. Many internal test files will need updating in lockstep.

### `openclaw-guardrails` → adapter + policy-runtime + retained governance bundle

Per `guardrails-adapter.md` (R2 amendment), the carve is mostly ADDITIVE:

**Add:**
- `src/openclaw-adapter.ts` (~50 LoC) — `toTrustedToolPolicy(provider): PluginTrustedToolPolicyRegistration`
- `src/policy-runtime/policy-plugin.ts` (~120 LoC) — registered upstream plugin shell with cache + `evaluate(event, ctx)` lifecycle
- `src/policy-runtime/cache.ts` (~60 LoC) — bounded-LRU cache module per the runtime decisions

**Delete:**
- `src/shell-exec-provider.ts` (~78 LoC) — duplicates upstream's native `~/.openclaw/exec-approvals.json` consumer

**Keep (the 7 subpaths stay UNCHANGED):**
- `audit/`, `approvals/`, `budget/`, `identity/`, `siem/`, `secrets/`, `handle-binding/` — these continue to ship as the claws governance bundle. snap + policy continue importing from `@bic/openclaw-guardrails/audit` exactly as today.

**External consumer impact:**
- `ShellExecProvider` has **zero external consumers** — verified by grep. Only 3 files reference it: the file itself, its export from index.ts, and one default-export-coverage test. Safe to delete.
- `./audit` subpath: snap (1 file) + policy (8 files) consume this. **No changes required** — the subpath continues to ship.

**Risk: LOWEST.** The carve is additive (new adapter + new policy-runtime/ subdir) plus one zero-impact deletion. The 7 subpaths that downstream consumers actually use are untouched.

## Recommended carve order (revised from the original 1.5-day estimate)

1. **`openclaw-guardrails` first** (~1 hour). Lowest risk, most additive. Add adapter + policy-runtime/, delete shell-exec-provider, run tests. This unblocks consumer testing for the next two carves.
2. **Local-fork upstream contracts** (~30 min). New `packages/v2-upstream-fork/` with `snapshot.ts`, `policy-ir.ts`, `hook-types-extension.ts`. Pure types; no runtime.
3. **`openclaw-snap` carve** (~2-3 hrs). Drop daemon/HTTP, keep store impls, conform types to local-fork contract. Update `claws/src/cli.ts` + `claws/src/commands/snap-serve.ts` in same commit.
4. **`openclaw-policy` carve** (~3-4 hrs). Reshape generator to emit v2 PolicyIR. Heaviest internal restructure; many test updates needed in lockstep.
5. **End-to-end integration test** (~2 hrs). Wire all carved packages together via local-fork contracts. Verify the full chain composes — both the original snap-shaped path and the LKG-shaped path the pivot lands on.

**Total revised estimate: 1.0-1.5 days of focused work** (adjusted slightly down from the earlier 1.5-day estimate because the guardrails carve turned out to be lower-risk than expected).

### E2E status (post-LKG-pivot, 2026-04-30)

Two E2E test suites exercise the chain at the v2-prototype seam:

- `v2-prototype/tests/v2-chain.integration.test.ts` — original snap-shaped composition: `openclaw-policy` → `policy-ir.json` → `openclaw-snap` capture → `policy-runtime/buildPolicyPlugin` → R5/soul enforcement. 6 tests.
- `v2-prototype/tests/v2-chain-lkg.integration.test.ts` — **LKG-shaped composition** (the upstream-aligned shape after the pivot): `openclaw-policy` → `policy-ir.json` → `openclaw-lkg` (FS) **or** `openclaw-lkg-git` (git-backed) → `policy-runtime/buildPolicyPluginFromLKG` → same R5/soul enforcement. **10 tests = 5 scenarios × 2 backends** via `describe.each`. The same chain composes through either backend, which is the load-bearing claim of the pivot.

E2E scenarios covered by the LKG suite (per backend):
1. R5 tool blocked via PolicyIR `denyRule` (R5-lowering proves out at the wire).
2. Non-R5 tool returns no decision (chain continues).
3. Soul deny via `tag` fires on argument substring.
4. **LKG recovery** — agent corrupts PolicyIR; `lkg.observe()` runs the recover path (`<path>.clobbered.<ts>` preserved + LKG bytes restored on FS, or `git checkout HEAD --` on git); plugin still enforces against the prior good IR.
5. Plugin fails closed when no LKG has been observed yet (`'no last-known-good PolicyIR yet'`).

Backend-specific tests in `openclaw-lkg-git/tests/lkg-git.integration.test.ts`:
- 9 tests covering promote=commit, recover=`git checkout HEAD --`, audit/recovery-notice hooks, gitignore handling, no-LKG-yet, register validation, **`getEntry` cache for synchronous plugin-shell access**, and a **multi-agent merge** scenario (two branches both promote LKG-good edits; a third party's `git merge` resolves cleanly). Multi-agent merge is the key unlock vs rclone's last-writer-wins on OneDrive-backed workspaces.

### LKG adversarial scenario coverage (326 across 18 waves, 75 categories)

The LKG primitive is tested beyond happy-path through eighteen waves of adversarial scenarios in `v2-prototype/tests/v2-chain-lkg-adversarial-{,2..18}.integration.test.ts`. The waves probe distinct surfaces:

| Wave | File | Categories | Tests |
|---|---|---|---|
| 1 | `v2-chain-lkg-adversarial.integration.test.ts` | L tamper · R recovery · V validators · P plugin-shell · G git-backend · X path hygiene | 24 |
| 2 | `v2-chain-lkg-adversarial-2.integration.test.ts` | C concurrency · A audit observability · E I/O failures · B boundaries · M multi-agent merge · N no-LKG-initial | 19 |
| 3 | `v2-chain-lkg-adversarial-3.integration.test.ts` | S schema evolution · Q PolicyIR shape · Z performance/scale · F filesystem oddities | 18 |
| 4 | `v2-chain-lkg-adversarial-4.integration.test.ts` | EI error injection · CR crash recovery · GD git dedup parity · GW git worktree edges | 15 |
| 5 | `v2-chain-lkg-adversarial-5.integration.test.ts` | SEC security (symlinks/special-chars/TOCTOU) · OBS audit completeness · ENC encoding edges · GIT2 advanced git states · PV PolicyIR↔LKG bridge · FP fingerprint determinism | 24 (2 POSIX-only skipped on Windows) |
| 6 | `v2-chain-lkg-adversarial-6.integration.test.ts` | LIM limits/quotas · T time/clock · MT multi-tracker independence · REG registration edges · FAULT lightweight synthetic failures | 19 |
| 7 | `v2-chain-lkg-adversarial-7.integration.test.ts` | WK workspace-shape · MULT multi-process simulation · DET determinism/replay · CIR non-serializable parse shapes · EXT SDK extension boundary · DEG degenerate validator outputs | 21 |
| 8 | `v2-chain-lkg-adversarial-8.integration.test.ts` | HK hook ordering · REC recovery edges · PROM promote-time edges · NRM path normalization | 16 |
| 9 | `v2-chain-lkg-adversarial-9.integration.test.ts` | STR stress/soak · JSON shape edges · FAIL failure isolation · INIT initialization order | 16 |
| 10 | `v2-chain-lkg-adversarial-10.integration.test.ts` | ERR error message quality · EXH outcome exhaustiveness · AS API surface coverage · BACK backwards-compat shape locks | 17 |
| 11 | `v2-chain-lkg-adversarial-11.integration.test.ts` | ARCH architectural invariants — every test runs against BOTH backends via `describe.each` (FS + git) | 36 (18 invariants × 2 backends) |
| 12 | `v2-chain-lkg-adversarial-12.integration.test.ts` | WIRE upstream config-LKG byte-format parity · MIG migration story · REPL audit-log replay · DIAG diagnostics / introspection | 17 |
| 13 | `v2-chain-lkg-adversarial-13.integration.test.ts` | CHAIN multi-LKG composition · XDEP cross-tracker dependencies · ORD promotion ordering · POOL plugin pool isolation | 17 |
| 14 | `v2-chain-lkg-adversarial-14.integration.test.ts` | MET metrics aggregation · TEL telemetry semantics · HEALTH health/readiness from getEntry · RATE rate-of-recovery as health signal | 16 |
| 15 | `v2-chain-lkg-adversarial-15.integration.test.ts` | REF HEAD ref movement between observes · PACK packed vs loose objects · GC git-gc / pruning · RBASE rebase / amend / cherry-pick across LKG commits | 13 |
| 16 | `v2-chain-lkg-adversarial-16.integration.test.ts` | CONF upstream config-LKG conformance (synthesized fixtures) · TS type-shape exhaustiveness · FUZZ generated random inputs | 14 |
| 17 | `v2-chain-lkg-adversarial-17.integration.test.ts` | PROP property-based forall assertions · CORP replay corpus · STAB stability across multiple runs | 12 |
| 18 | `v2-chain-lkg-adversarial-18.integration.test.ts` | DOC documented examples are runnable · TYPE TypeScript type-level tests · FINAL public-export shape lock | 12 |

**Findings raised through the adversarial waves:**

- **Real bug found and fixed (`GW3`)** — `gitLKGStore.commitPromote()` was running `git commit -m msg` (no path arg), which in shared-repo / multi-agent setups would sweep arbitrary pre-staged paths into the LKG commit. Fixed at `git-lkg-store.ts:234` to `git commit -m msg -- <relPath>` so promote only commits the tracked path. Test now asserts the LKG commit's `--name-only` output excludes pre-staged unrelated files.
- **Known gaps locked in:**
  - `CR4 [GAP]` — FS LKG tamper detection happens only in the recover path's hash check (`lkg-store.ts:189`). An attacker who hand-edits `<path>.lkg` while the working tree stays valid is invisible until the next recover attempt. Mirrors upstream's existing config-LKG model — trust rooted in filesystem ACLs, not crypto. Mitigation lives at deployment level.
  - `T2 [GAP]` — `clobbered.<ts>` sidecar uniqueness depends on `observedAt` advancing between recoveries. Under a frozen clock (replay/test mode), back-to-back recoveries write to the same path; the second overwrites the first preserved bytes. Real systems are unaffected; replay-mode + LKG should bump `now()` between observes.
  - `MULT1 [GAP]` — `readLastKnownGood()` reads on-disk `<path>.lkg` directly with no hash check. A fresh process can read an orphaned or tampered `.lkg` through this API. The safety gate is at the plugin shell (`policy-plugin-lkg.ts` uses `getEntry().lastPromotedGood.hash` — empty entry on a fresh store triggers fail-closed). Direct callers without that gate are responsible for their own verification, OR for calling `observe()` first to populate the in-memory entry.
- **Contract invariants locked in:** validators MUST be exception-safe (V1/GD2 — thrown validators surface as `LKGError`, never silently masked as recovery); audit and recovery-notice hooks MUST NOT crash the observe path (A1/A2/EI3/EI4 — try/catch at the await site); two distinct `LKGStore` instances on the same file maintain independent dedup state (C4); cross-process orphan `<path>.lkg` files are never trusted by a fresh store (CR1 — hash check refuses); large-LKG (1MB) recovery preserves bytes byte-for-byte (Z3); 1000-rule PolicyIR evaluates in <500ms (Q4); fingerprint hash is bytes-only — invariant under stat changes (FP1) and cross-process clock differences (FP3); audit `commitSha` is set only for `outcome=promoted` on the git backend (OBS5); recovery-notice cross-links to its `recovered` audit record by `(ts, trackerPath, clobberedPath, restoredFrom.hash)` (OBS3); promote/recover preserve bytes byte-for-byte including CRLF, BOM, and trailing-newline (ENC1/ENC2/ENC3); the git backend produces a unique commit per distinct content (GIT2-3); cache evicts on fingerprint flip so re-promote with new content is immediately effective (PV2).

Counts: **457 v2-prototype tests green** across 25 files (2 POSIX-only symlink tests skipped on Windows; snap-shape chain 6 + LKG-shape chain 10 + 1 type-shape + 100 snap-adversarial + 326 LKG-adversarial waves 1-18 + ~14 misc); **9 git-LKG tests green**; **20 FS-LKG tests green**. **Total LKG-touching coverage: 486 tests.**

## Open question to resolve before step 3 (snap carve)

`packages/claws/src/commands/snap-serve.ts` — is this command kept (as a thin wrapper over the upcoming upstream `openclaw snap serve` verb) or removed? Removal is cleaner (one source of truth — upstream); keeping it preserves backward compat for anyone scripted against `claws snap-serve`. Leaning toward **remove**, but worth confirming before the carve.

**Resolved 2026-04-29**: removed. The snap carve landed as the two-layer
`SnapshotStore` (immutable bundles) + `RefStore` (per-workspace pointers).
`claws snap *` binds an in-process `filesystemStore` + `workspaceRefStore`
rooted at `<workspace>/.openclaw/snapshots/`; no daemon, no HTTP transport.
See commit `c6f73697`.

## Backend storage — FUSE-via-rclone (default)

**Resolved 2026-04-29** after surveying Aether's storage path and a
diagram-driven discussion (lifecycle → FUSE topology). The chosen
deployment shape: **Mode 1 — snap-in-process; storage backend is
whatever the kernel sees at the workspace root.**

Inside an Aether container, Ryan Gregg's rclone+FUSE work
(`bic/aether#5377`, `#5437`, `#6922`) mounts the user's OneDrive /
SharePoint / Azure Blob at a known path. Plain `node:fs/promises`
writes land in cloud storage transparently — so `filesystemStore({ root })`
reaches OneDrive **without any per-backend code, no Graph API
integration, no auth, no atomicity worries.** The kernel + rclone
handle all of it.

Concrete topology:

```
   filesystemStore({ root })        ← already shipped, untouched
        │ node:fs syscalls
        ▼
   FUSE mount @ /mnt/workspace      ← Aether installs this
        │
        ▼
   rclone daemon                    ← Aether installs this
        │
        ▼ HTTPS
   OneDrive / SharePoint / Blob
```

What we ship: **one env-var resolver in `commands/snap-store.ts`**.
`OPENCLAW_WORKSPACE_ROOT` overrides the workspace root path so the
claws CLI inside an Aether container can target the FUSE mount instead
of cwd. ~10 LoC. No new packages, no new contracts.

**Ryan Gregg's answers (received 2026-04-29):**

| Question | Answer |
|---|---|
| Mount path | FUSE flights mount at `/home/node/.openclaw`. Set `OPENCLAW_WORKSPACE_ROOT=/home/node/.openclaw` for Aether-container deploys. |
| `.openclaw/` subdir collision | Safe. "Nothing like that exists today" — no Aether state reserves `.openclaw/snapshots/`. |
| `rename(tmp, target)` atomicity | Preserved. rclone translates rename → single PATCH on driveItem — atomic at the Graph API level. Our `writeAtomic` pattern works end-to-end through FUSE→rclone→OneDrive. |
| Concurrent-writer semantics | **Last-writer-wins.** rclone has no ETag / conditional-PUT validation. Multi-instance gateway sharing refs through OneDrive is NOT safe without our own coordination layer. |
| rclone cache mode | (not directly answered — derive from PR config; non-blocking for the carve.) |

**Critical operational note from Ryan:** production today is **blob_sync**,
not FUSE. blob_sync replicates `/home/node/.openclaw/workspace` and
`/home/node/.openclaw` to separate blobs. FUSE is in flights/limited
rollout. blob_sync is even-more-eventual than FUSE — durability lags
wall clock by the blob_sync interval. Our `filesystemStore` works fine
on either (writes go to local container fs; blob_sync replicates async).

**LWW implication for our refs design:**
- Local dev (single dev → single process touching refs at a time): ✓ fine
- One openclaw container reading + claws CLI writing same workspace: ✓ usually fine (capture+promote is human-paced; stale read for seconds is acceptable)
- Multi-instance gateway sharing refs through OneDrive: ✗ NOT safe — silent overwrite. Needs lock file, refs service, or DB-backed RefStore.

This is exactly why HTTP transport / multi-gateway is deferred. The
single-instance Mode 1 deployment (snap-in-process + FUSE) is unaffected.

## Deferred — HTTP transport (Mode 2 — snap-as-sidecar)

A separate `@bic/openclaw-snap-http` package with both server and client
remains a useful future addition for the **multi-gateway-instance**
deployment shape (sidecar pattern):

```
   ┌──────────┐  ┌────────────────┐
   │ container│←─│ snap sidecar   │
   │  gateway │  │ (HTTP server)  │
   └──────────┘  │ FUSE mount→OD  │
   ┌──────────┐  │  ↑ shared      │
   │ container│←─│  ↑ across      │
   │  gateway │  │  ↑ replicas    │
   └──────────┘  └────────────────┘
```

Where it earns its keep: when multiple gateway instances must serve the
same tenant and need a single coordination point for refs (rather than
relying on rclone's eventual-consistency window). Not blocking today;
single-container gateway with its own FUSE mount doesn't need it.

**Track this in**: the wave that brings multi-instance gateway as a
real deployment requirement. Likely after v2 contract chain (PR-1..PR-5)
is upstreamed and we have concrete production-traffic gateway shapes.
