# CL-13 — Repo Boundary

**Status**: Draft
**Version**: 1.6
**Source**: Horus wave (`260416+horus-the-heir+claws-migration`) / `.craft/plans/claws-repo-migration.md`
**Atom**: `atom:claws-repo-boundary` (C117)
**Atom ID**: C117
**Reviewer roles**: claws-repo-steward, claws-release-eng, compliance, founder, gateway-eng
**Dependencies**: CL-08 (freemium boundary — see CL-08 v1.2 Amendment which effectively pauses the freemium framing under the bic-internal posture); infrastructural otherwise
**Compliance scope**: SOC2-adjacent (migration-epoch evidence artifacts, token/key rotation, auditor-readable `.audit/migrations/horus/` store)
**Wave codename**: Horus — Egyptian falcon-headed deity; claws-migration wave continues the Ptah/Anubis/Thoth/Ra naming convention for the claws workstream

---

## Summary

Specifies the two-repo architecture between `bic/claws` (the monorepo) and `bic/claws` (the extracted product repo). Documents what moves, what stays, how dependencies flow, how versions are pinned, how releases coordinate, and how the two repos stay coherent across the boundary.

Sourced from the Horus wave's `contract-seams.md` §S1 (global decision: all claws packages move) and §S2 (GPR auth lifecycle).

## Scope

- Defines the package set that lives in each repo
- Defines the dependency direction (no circular imports across the boundary)
- Defines how versions are pinned by sibling plans (aether, lobster, sim) in the Horus wave
- Defines the release coordination model
- Defines what happens during the migration and after

## Non-goals

- Commercial/freemium packaging — not applicable during Horus; claws is bic-internal. A future public-distribution wave (if ever) may revisit.
- Public distribution on npm.js or a mirror — out of Horus scope.
- ClawPilot integration contract (separate future wave)

---

## §0 — Glossary

- **Dry-run extraction**: an optional preparatory run of `tools/migration/claws-extract.sh` against a throwaway branch, performed before the authoritative extraction in §7 state 3. Captures filter-repo metrics, walkability samples, and operator handoff artifacts. Not to be confused with any `--dry-run` CLI flag — "dry-run extraction" is the ceremonial name for §7 state 2b `DryRunExtract`.
- **Rehearsal publish**: an optional rehearsal of the atomic publish pipeline (§4.1) on a shadow `@bic/claws-rehearsal-*` package scope, performed before the inaugural publish in §7 state 5. Evidence: `rehearsal-publish-evidence.json` (§6.1).
- **Boundary-critical PR**: any PR touching `tools/migration/`, `.audit/migrations/horus/`, `docs/operations/ghe-packages-auth.md`, the §6.1 evidence schema, or the §7 state machine. Requires 2-maintainer approval per §9.
- **Evidence status field**: every §6.1 evidence artifact carries `status: 'draft' | 'signed-final'`; only signed-final counts toward state-exit conditions.

## §1 — Package location rules

After the Horus migration completes, every claws package lives in `bic/claws`. No claws source, tests, docs, specs, plans, wave directories, or roles remain in `bic/claws`.

**Installation entry point**: `@bic/claws-cli` is the single package an engineer needs to install to try claws (`npm install -g @bic/claws-cli && claws --help`, with `.npmrc` auth against `microsoft.ghe.com`). The other 7 packages are transitive peers, optional integrations (lsp, serve), or authoring toolkits (skill-kit, test). The 8-package structure documented below is the published surface; it is not the required install surface for a first-run experience. 'Community' in this context means internal Microsoft engineers, not a public community.

**Packages in `bic/claws/`** (8 packages published as `@bic/claws-*` on GPR):

| Package | Purpose |
|---------|---------|
| `claws-compiler` | Compiler core (renamed from `claws-sdk` during migration) |
| `claws-sdk` | Paid extension package — also lives in claws repo; commercial packaging decision deferred |
| `claws-cli` | Runnable CLI (`claws --help` works from fresh install) |
| `claws-skill-kit` | Skill authoring kit |
| `claws-test` | Shared test utilities |
| `claws-serve` | HTTP governance API (CAP/Lobster/Companion consumer substrate) |
| `claws-lsp` | Language server |
| `claws-sim` | Local sim harness (Horus Plan 4 deliverable; publishes as `@bic/claws-sim` post-Plan-1 close) |

`@bic/claws-sim` is listed in the table above; its source lands post-Horus Plan 1 close per `contract-seams.md` §S1. All 8 packages publish atomically per §4.1 once sim lands.

**On the `claws-sdk` row specifically:** The original `claws-sdk/` source directory in craftworks gets renamed to `claws-compiler/` on migration (its purpose was always the compiler core). A **separate** paid extension also named `claws-sdk` (currently a distinct craftworks source tree or repo) migrates alongside and publishes as `@bic/claws-sdk`. The two are different packages with different purposes; the shared short name is historical and does not indicate shared source. Freemium commercial terms on either package are deferred per §Non-goals.

**Packages in `bic/claws/`**: none (claws-wise).

## §2 — Dependency direction

```
┌─────────────────────┐                          ┌─────────────────────┐
│  bic/claws     │                          │  bic/claws│
│   @bic/claws-* │                          │   @craftworks/*     │
└─────────────────────┘                          └─────────────────────┘
         │                                                 ▲
         │ (1) PERMITTED — claws packages flow to craftworks via GPR │
         └─────────────────────────────────────────────────┘
         ▲                                                 │
         │ (2) FORBIDDEN — @craftworks/* MUST NOT appear in claws    │
         └─────────────────────────────────────────────────┘
```

The boundary is **one-way**: craftworks may consume claws packages from GPR (arrow 1); claws MUST NOT consume `@craftworks/*` packages under any circumstance (arrow 2 is forbidden). Circular imports across the boundary are a build-time error enforced by the release workflow.

**Validation**: `rg "@craftworks/" bic/claws/` returns zero matches (license/attribution text excepted). `rg "@bic/claws-" bic/claws/` returns only `package.json` and `package-lock.json` entries.

### §2.1 — Runtime consumption direction

At runtime (not build time), the OC Gateway loads governance artifacts emitted by `@bic/claws-sdk`. These artifacts are JSON/TypeScript files packaged per CL-11 §Upstream governance; the Gateway does not directly `require('@bic/claws-*-compiler')` or any other compiler-source package at runtime. Any such import in Gateway runtime code would be a boundary violation (flagged by the weekly cron in §Validation).

Emitted artifacts MAY reference `@claws/*` Layer-2 runtime helper packages (e.g., `@claws/sift` typed expression engine, `@bic/claws-skill-kit` authoring runtime) — these are deliberately exposed to emitted code as the published runtime surface. Emitted artifacts MUST NOT reference `@bic/claws-sdk`, `@bic/claws-sdk`, `@bic/openclaw-lsp`, `@bic/claws-serve`, or any other compiler/tooling-source package; only the `@claws/*` Layer-2 helpers and `@openclaw/*` contributed packages are runtime-legal targets.

## §3 — Version pinning model

Sibling plans in the Horus wave that consume claws packages MUST pin exact version ranges, not floating. This is enforced per `contract-seams.md` §C5.

- `aether-claws-serve-integration`: pins `@bic/claws-sdk` and `@bic/claws-sdk` at exact patch versions; bumps coordinated with `claws-cap-integration` releases
- `lobster-claws-serve-integration`: same
- `claws-local-sim-evolution`: publishes as `@bic/claws-sim`; pins its own peer dependencies on other claws packages at matching patch versions
- **Runtime consumer pinning**: Aether, Lobster, Cowork, and other runtime consumers that import `@bic/claws-*` pin exact patch versions in their production `package.json` (no caret, no tilde ranges). Development dependencies MAY use caret ranges (reconciliation: the "exact patch" rule governs production `dependencies` only; `devDependencies` are exempt per this bullet). CI validates exact-pinning on a workflow-level grep. Downgrade procedure: pin a known-good earlier version and open a deprecation ticket on the compromised version.

**Emergency downgrade / unpin procedure**: When a published claws version must be pulled urgently (security CVE, governance-artifact corruption, runtime regression):

1. Release-eng posts `npm deprecate '@bic/claws-*@X.Y.Z' '<reason>'` across all 8 packages within 1 hour of incident confirmation
2. Consumer repos (Aether, Lobster, Cowork) open PRs pinning to the last-known-good earlier version; CI validates the new pin
3. A follow-up corrective release (`X.Y.Z+1`) ships via the normal §4 release workflow within 24h
4. The incident is logged in the `@openclaw/audit-chain` as a `MigrationEpochEntry` with `type: emergency-downgrade` and inherits the §6.1 signing/retention defaults

The emergency downgrade does NOT unpin consumers automatically — pinned consumers still install the bad version unless their pin is updated. This is by design (reproducibility > convenience); the deprecate banner (§4.2 language) surfaces the warning at install time.

**First-release downgrade window**: for the inaugural `0.1.0` release and for 72h thereafter, if a defect requires downgrade there is no "last-known-good earlier version" to pin to (it's the first release). Consumer repos MUST treat the first-release 72h window as a **hot-fix window**: release-eng produces a corrective `0.1.1` within 72h and consumers re-pin directly. Evidence recorded in `emergency-downgrade-evidence.json` with `firstReleaseWindow: true` annotation.

All claws packages in a given release ship at the same version (atomic release; `contract-seams.md` §S1 release workflow).

## §4 — Release coordination

Release pipeline (authoritative; `.craft/plans/claws-repo-migration.md` §Release Workflow Spec implements this contract):

- Triggered by semver tag (`vX.Y.Z`) on `bic/claws` main. **Canonical tag regex**: `/^v\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/` — matches `v0.1.0`, `v1.2.3-beta.1`, `v1.2.3-rc.4`. Build-metadata suffixes (`+meta`) are disallowed (GPR strips them, breaking round-trip). Non-matching tags are rejected by CI.
- First post-migration version: `0.1.0` (semver resets after migration; integrity-hash provenance starts fresh)
- Rollback: GPR `npm deprecate` + corrective publish (GPR does not support `unpublish` the same way public npm does). Deprecate banner language: `"do not use: <reason>; install @bic/claws-*@<last-known-good> or @bic/claws-*@<corrective-version>"`. The banner is advisory — pinned consumers still install the bad version until they update their pin (see §3 emergency downgrade procedure).
- **Sourcemap inclusion**: every published package MUST include `.js.map` sourcemaps in the published tarball (`files: ["dist/**/*.js", "dist/**/*.js.map", "dist/**/*.d.ts"]` in `package.json`). Sourcemap absence is a release-invariant violation: the pre-publish dry-run (§4.1) asserts `*.js.map` presence for each dist entry-point. Rationale: post-publish Gateway-side debugging requires sourcemaps; supply-chain scanners flag `.js` without `.js.map` as tamper risk.
- **Signed tags**: every release tag is GPG-signed by the `claws-release@bic` identity (§4.3). `git tag -v <tag>` must pass; unsigned tags are rejected at CI pre-publish gate.

### §4.1 — Atomic publish mechanism

A single release workflow job publishes all 7 (soon 8) packages in a deterministic order: `serve → compiler → sdk → cli → skill-kit → test → lsp → sim`. Failure at any step aborts remaining publishes and triggers rollback. Explicitly: **no `matrix:` parallelization on the publish step** (race conditions in the GPR index). A pre-publish dry-run validates that all 8 `package.json` `version` fields match the tag being released.

**Partial-publish audit**: when atomic publish aborts mid-sequence (e.g., `claws-compiler` succeeds, `claws-sdk` fails), `partial-publish-evidence.json` (§6.1) records the successful-vs-failed boundary by package name, enabling targeted rollback. The RehearsalPublish state (§7 state 4b) exercises the atomic property end-to-end on the shadow `@bic/claws-rehearsal-*` scope BEFORE the real publish.

### §4.2 — Gate ordering (pre-tag vs post-publish)

Gate ordering per `release-eng-M2`:

- **Pre-tag gates** run against the **pre-publish artifact** (`npm pack` tarballs in the workflow's scratch workspace): smoke test (`claws --help` exits 0), dogfood test (one package consumes another via packed artifact), TypeScript compile on Linux/Windows/macOS.
- **Post-publish gates** run against the **published GPR version** (fresh scratch-dir install with no ambient `.npmrc`): install-smoke, Gateway runtime-integration smoke (§4.4), signed-tag verification.
- Both gate sets must pass before the release is considered "landed". A released-but-failing-post-publish-gate version is immediately deprecated with `npm deprecate '@bic/claws-*@X.Y.Z' 'do not use: post-publish gate failure'`.

### §4.3 — Tag-signing key identity and rotation

The release workflow signs tags with the `claws-release-eng` role's GPG key:

- **Identity**: `claws-release@bic`
- **Rotation cadence**: 6 months
- **First-ever key distribution**: the inaugural key is distributed to CI secrets during §7 state 4 (Verify) entry. Initial distribution is recorded in `key-rotation-evidence.json` with `initialDistribution: true` annotation and enumerates the targets (release workflow CI secret store, release-eng operator machines, offline backup). The inaugural key cannot sign a tag until distribution is signed-final.
- **Revocation**: key revocation is a release-blocker until a new key is distributed to CI secrets
- **Unsigned tags**: rejected by CI (`git tag -v` must pass)

### §4.4 — Gateway runtime-integration smoke (post-publish)

Per `gateway-eng-M5`: the post-publish gate spawns the published CLI binary, runs `claws compile` against a minimal governance workspace, and asserts the emitted governance plugin loads in the OC Gateway without error. Without this gate, the Gateway becomes a silent integrity failure mode.

### §4.5 — `generatorVersion` lineage

Per `gateway-eng-M3`: the first post-migration release at `0.1.0` SHALL emit governance artifacts with a `generatorVersion.legacyBase: "craftworks-pre-migration"` field in addition to the semver. This preserves lineage across the integrity-hash reset so downstream Gateway deployments can detect migration-epoch artifacts unambiguously.

## §5 — GPR auth and access

Auth lifecycle per `contract-seams.md` §S2, documented once in `bic/claws/docs/operations/ghe-packages-auth.md`:

- Token ownership: `claws-release-eng` role
- Rotation: 90 days, tokens are fine-grained PATs scoped to `read:packages` (consumers) / `write:packages` (release workflow). Per-rotation evidence is written to `token-rotation-evidence.json` (§6.1).
- **Token-rotation cooling window**: old tokens remain valid for **14 days** after a new token is distributed (overlap window). Consumer repos MUST detect stale-cache conditions (CI runs receiving intermittent 401s from a partially-rotated token) and automatically re-pull from the org-level secret store. The 14-day overlap is recorded in `token-rotation-evidence.json`; rotations closer than 14 days apart trigger an audit warning.
- Consumer `.npmrc` template:
  ```
  @bic:registry=https://npm.pkg.microsoft.ghe.com
  //npm.pkg.microsoft.ghe.com/:_authToken=${NODE_AUTH_TOKEN}
  ```
  **`${VAR}` expansion caveat**: npm expands `${NODE_AUTH_TOKEN}` only when the env var is present at install time. A missing or empty env var causes npm to silently send an empty auth header, surfacing as a 401 with an error message that does not name the missing variable. Mitigations: (a) consumer CI workflows MUST `fail-fast` if `NODE_AUTH_TOKEN` is empty before `npm install`; (b) the `ghe-packages-auth.md` doc includes a "first-minute troubleshooting" section covering the empty-env-var failure mode by name.
- CI secrets: each consumer repo sources `NODE_AUTH_TOKEN` from an org-level shared secret rotated centrally. **Blast radius note**: a compromised org-level secret affects all consumer repos simultaneously. Mitigations: (a) secret is `read:packages` only (never `write:packages` — write is workflow-local to `bic/claws` release workflow); (b) rotation on suspected compromise is centrally actionable within 1 hour; (c) per-consumer-repo secret overrides are permitted if a repo needs tighter isolation (sets local `NODE_AUTH_TOKEN` which shadows the org-level default).
- **Individual-contributor auth path**: `ghe-packages-auth.md` MUST include a dedicated section for individual contributors (not enterprise users), covering: (a) personal access token creation with `read:packages` scope, (b) local `~/.npmrc` configuration with `${NODE_AUTH_TOKEN}` referencing a shell env var (not a committed file), (c) `npm login --scope=@bic --registry=https://npm.pkg.microsoft.ghe.com` as an alternative flow. This section is mandatory because internal Microsoft engineers need a documented path for local development auth against `microsoft.ghe.com` (§10).
- Offline/air-gapped fallback: `npm pack` + file: install from cached tarball
- Least-privilege: workflow-level `permissions: packages: write` only on release workflows; `packages: read` on consumer test workflows

### §5.1 — Audit scope (what claws audits vs what consumers audit)

Only release workflow `npm publish` events enter the `@openclaw/audit-chain`. Consumer `npm install` events are **NOT** audited by claws — each consumer repo owns its own supply-chain telemetry (e.g., package-lock diffs, renovate/dependabot logs, SBOM scans, EDR endpoint monitoring). The boundary is:

- **claws audits what it publishes**: every `npm publish` to GPR produces a `publish-evidence.json` entry (§6.1) + a `MigrationEpochEntry` (during migration) or a standard audit-chain entry (post-migration). Tag-signing key rotations and `write:packages` token rotations enter the audit chain via §6.1 `key-rotation-evidence.json` / `token-rotation-evidence.json`.
- **Consumers audit what they consume**: consumer repos (Aether, Lobster, Cowork, third-party integrators) are responsible for their own `npm install` telemetry. Claws does NOT receive or aggregate install events. This boundary is by design — install-event centralization would require registering consumer identities with claws's audit chain, which is out of scope for a GPR-hosted package.
- **Out-of-scope by design**: install-event telemetry, consumer-side package-lock drift detection, consumer CI runtime audit, end-user telemetry (post-install CLI execution). These belong to the consumer repo's compliance regime.

## §6 — Cross-repo coherence rules

### R1 — History preservation
The migration uses `git filter-repo --mailmap` to preserve:
- Full commit history of all 7 migrating directories (Ptah, Anubis, Thoth, Ra wave commits retained)
- Author attribution across the rename (via `--mailmap`)
- `git log --follow` walkability across flatten-renames (e.g., `design/claws/ATOMS.md` → `design/ATOMS.md`)

**Mailmap SHA pinning**: the `--mailmap <path> --mailmap-sha <sha>` invocation pins the mailmap file content to a specific SHA-256. Dry-run extraction (§7 state 2b) and real extraction (§7 state 3) MUST use the identical `--mailmap-sha`; mismatch blocks state 3 entry. The `history-preservation-evidence.json` artifact records `mailmapSha256` as a mandatory field.

**Source SHA pinning**: `claws-extract.sh --source-sha <SHA>` refuses to run if `HEAD ≠ <SHA>`. The pinned SHA links dry-run and real-run against a single craftworks source tree state, closing the "main moved between operators" race.

**Mailmap scope and departed-contributor policy**: the `--mailmap` file maps historical author identities to current canonical identities. Departed contributors retain their historical attribution (identity preserved; no rewriting of past authorship). Rewriting a departed contributor's identity to anonymize them post-hoc is a compliance-reportable event (conflicts with the write-once audit-chain posture in §6.1). Corrections to typo'd email addresses are permitted; identity substitutions are not.

A pre/post `git log --oneline --all` manifest diff is recorded and reviewed; any unexpected commit losses block the migration.

### R2 — Residue cleanliness
Post-migration, `rg "@craftworks/claws-(runtime|lsp|serve|sdk|skill-kit|compiler|cli|test)"` in craftworks returns zero hits across code, scripts, docs, and workflows.

### R3 — Deletion provenance
The craftworks deletion PR body includes a table mapping every deleted path to its new location in `bic/claws`, with destination commit SHA. One row per deleted file or directory (directory-level rows acceptable where the entire subtree moves atomically).

### R4 — Extract script permanence
`tools/migration/claws-extract.sh` is committed to BOTH `bic/claws` and `bic/claws` repos as a permanent chain-of-custody artifact. It captures the exact `git filter-repo` invocation, source-to-destination path rewrites, branch names, and `--mailmap` usage. It is re-runnable for audit or re-extraction — it is not deleted after Horus merges.

**Dual-copy authority**: the `bic/claws` copy is the **authoritative** copy. The `bic/claws` copy is a read-only mirror retained for chain-of-custody. Any fix to the extract script (bug fix, audit-trail enrichment, path-rewrite correction) is made in `bic/claws` first and mirrored to `bic/claws` via a small PR with a 1-line summary referencing the authoritative commit SHA. Divergence between the two copies is a compliance-reportable event.

**Dual-copy parity check**: a quarterly CI cron in both repos computes `sha256sum tools/migration/claws-extract.sh` and compares the two hashes. Mismatch fails the audit and opens an incident ticket assigned to the `claws-repo-steward` role. Evidence of each quarterly check is appended to a `dual-copy-parity-evidence.json` under `.audit/operations/` in both repos (inherits §6.1 defaults).

### R5 — Concurrent-PR freeze
During the Horus migration window, craftworks freezes merges touching claws-adjacent paths. Prevents orphan commits landing between extraction and cleanup. Freeze window ≤ 24 hours by default; **auto-extends** to match the state 7 (DeletePR) duration when state 7 extends via state 7b SlaExtended (see §7).

**Freeze-path glob set** (authoritative; superset of the original 4 patterns):

- `claws-*/` (all claws-prefixed package directories)
- `design/claws/` (design area)
- `docs/claws/` (docs area)
- `.craft/plans/claws-*.md` (plans)
- `.craft/waves/**/horus*/` (Horus wave and variants)
- `scripts/rewrite-file-deps.sh` (claws line references)
- `design/agent/focus/Q12*/` (claws-adjacent research questions)
- `CODEBASE.md` (claws rows)
- `.mailmap` (mailmap file used for history preservation)
- `.github/workflows/claws-*.yml` (workflow files)
- `tools/migration/claws-*.sh` (migration tooling)

Any PR touching any path in the glob set during the freeze window is blocked per the enforcement mechanism below.

**Freeze enforcement mechanism**: freeze is enforced at two levels: (a) **branch protection** on `main` requires CODEOWNERS approval on all paths under `claws-*/`, `design/claws/`, `docs/claws/`, `.craft/plans/claws-*.md` — during the freeze window, the `claws-repo-steward` CODEOWNERS entry is temporarily set to a `freeze-block` team with zero members, so no approval can be granted; (b) **CI pre-merge check** that greps the PR's changed-files list against the freeze-path globs and fails the check with a clear message (`"merge blocked by claws-migration freeze; window ends <timestamp>"`). Freeze lift is a CODEOWNERS restore + audit-chain entry (`freeze-window-evidence.json` per §6.1).

### R6 — Post-merge rollback semantics (proportional)
If a boundary-violation or migration-epoch defect surfaces after the deletion PR is merged (§7 state 7 completed), rollback is NOT achieved by a single revert. The rollback path is **proportional to the defect class** — forcing every post-merge defect through the full state machine is both impractical (SLA-breaking for hotfixes) and mis-incentivizing (operators avoid filing small defects).

**Classification** (operator + `claws-repo-steward` jointly classify at defect-report time):

| Class | Defect example | Rollback scope |
|-------|----------------|----------------|
| **Tier A — Integrity-critical** | Boundary violation (e.g., `@craftworks/` leak into `bic/claws`), history-preservation failure surfaces post-merge, signing-key compromise | Full re-entry (see below) |
| **Tier B — Content defect** | Docs error, missing file in deletion manifest, incorrect CODEOWNERS entry for boundary-adjacent path | Targeted corrective PR + signed rollback entry (no state-machine re-entry) |
| **Tier C — Release regression** | Runtime regression in a published claws version with no boundary implications | §3 emergency downgrade procedure (no state-machine re-entry) |

**Tier A rollback procedure** (integrity-critical only):

1. Revert the craftworks deletion PR (restoring the deleted paths via `git revert`) — this re-imports the code into craftworks but does not un-publish the GPR versions
2. Revert or deprecate the corresponding `bic/claws` commits that correspond to the defect (if the GPR version has been published, `npm deprecate` with rollback reason; §3 emergency downgrade applies)
3. Write a **signed rollback entry** to the `@openclaw/audit-chain` with a `MigrationEpochEntry` of `type: post-merge-rollback`, naming both the craftworks revert SHA and the claws deprecation version(s). Evidence: `rollback-entry-evidence.json` per §6.1.
4. Re-enter the §7 state machine at PreFlight (state 1); evidence `pre-flight-redo-evidence.json` per §6.1; and re-run states 3–8 with the corrective content. No shortcut re-entry is permitted for Tier A.

**Tier B rollback procedure** (content defect):

1. Open a targeted corrective PR against `bic/claws` (not craftworks; no revert of the deletion PR).
2. Write a signed rollback entry to the audit chain with `type: post-merge-correction-tier-b`, naming the corrective PR and the defect class.
3. Follow the normal §4 release coordination cadence; no state-machine re-entry.

**Tier C rollback procedure**: per §3 emergency downgrade — no state-machine re-entry; `emergency-downgrade-evidence.json` is the authoritative artifact.

**Escalation**: a Tier B defect that turns out to mask a Tier A defect (discovered during corrective-PR review) MUST be re-classified at that point; `claws-repo-steward` + `compliance` jointly reclassify and trigger the Tier A procedure. Classification downgrade (Tier A → B) is NOT permitted without a full audit-chain entry documenting why the integrity-critical class was revised.

### §6.1 — Evidence artifacts

Auditor-grade evidence for the migration epoch (resolves CONSENSUS-2):

| Artifact | Contents | Signing | Retention | Stored in |
|----------|----------|---------|-----------|-----------|
| `deletion-manifest.yaml` | Every deleted path + destination commit SHA (generated by the craftworks deletion PR) | HMAC-SHA256 by `claws-release-eng` role's signing key | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `history-preservation-evidence.json` | Pre/post `git log --oneline --all` commit-set diff, filter-repo invocation details, mailmap file contents | HMAC-SHA256 | 7 years | BOTH repos under `.audit/migrations/horus/` |
| `residue-grep-evidence.json` | Output of the canonical negative-grep (§Validation) with timestamp + commit SHA + operator identity | HMAC-SHA256 | 7 years | Both repos under `.audit/migrations/horus/` |
| `install-smoke-evidence.json` | Scratch-dir install output + `claws --help` exit code + GPR auth token hash (truncated) | HMAC-SHA256 | 1 year | `bic/claws` under `.audit/migrations/horus/` |
| `Ra-close-evidence.json` | Ra wave close report + `npm pack` tarball inspection showing zero `@craftworks/` runtime deps in `@bic/claws-sdk` (§7 state 1 exit). **Mandatory fields**: `raWaveCloseSha`, `raCloseReportPath`, `tarballInspectionResults[]` (per package), `fourDepClassCheck` (direct/dev/peer/optional), `transitiveClosureCheck` (full `npm ls --all`), `gprBillingTierSnapshot`, `operatorPrincipal`, `signedAt`. Missing any mandatory field blocks state 1 exit. | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `freeze-window-evidence.json` | Freeze announcement timestamp + PR-block log + drain-check outcome (§7 state 2 exit) | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `verify-evidence.json` | `git log --follow` walkability check output + LICENSE diff output + integrity-check pass (§7 state 4 exit) | HMAC-SHA256 | 7 years | BOTH repos under `.audit/migrations/horus/` |
| `publish-evidence.json` | GPR publish receipts (all 7 packages) + dogfood test result + signed-tag verification (§7 state 5 exit) | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `state-transition.yaml` | Per-transition `MigrationEpochEntry` rows to the `@openclaw/audit-chain` — one entry per §7 state entry and exit, with evidence-artifact SHA-256 | HMAC-SHA256 | 7 years | BOTH repos under `.audit/migrations/horus/` |
| `thaw-announcement.json` | Freeze-lift announcement + quarterly-audit schedule record (§7 state 8 exit) | HMAC-SHA256 | 1 year | `bic/claws` under `.audit/migrations/horus/` |
| `token-rotation-evidence.json` | Per-rotation entry: old token SHA (truncated), new token SHA (truncated), rotation operator, CI secret-store update timestamp (90-day cadence, §5) | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/operations/` |
| `key-rotation-evidence.json` | Tag-signing key rotation log: old key fingerprint, new key fingerprint, CI redistribution timestamp, revocation record if applicable (6-month cadence, §4.3) | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/operations/` |
| `dual-copy-parity-evidence.json` | Quarterly `sha256sum` hash comparison of `tools/migration/claws-extract.sh` across both repos (§6 R4) | HMAC-SHA256 | 1 year | BOTH repos under `.audit/operations/` |
| `gpr-auth-single-source-evidence.json` | Weekly grep output verifying no duplicated GPR auth content across claws/aether/lobster/cowork repos (§Validation item 9) | HMAC-SHA256 | 1 year | `bic/claws` under `.audit/operations/` |
| `emergency-downgrade-evidence.json` | Per-incident entry: triggering CVE/defect, deprecate command output across all 8 packages, consumer-repo pin-update PR list, corrective release version (§3 emergency downgrade procedure) | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/operations/` |
| `dry-run-extract-evidence.json` | Dry-run `git filter-repo` invocation details on a throwaway branch; captured metrics (commit count delta, ref preservation, `git log --follow` walkability sample); branch discarded post-capture (§7 state 2b exit) | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `rehearsal-publish-evidence.json` | Rehearsal-scope (`@bic/claws-rehearsal-*`) publish receipts on the shadow packages; timestamps, signed tag verification, rehearsal deprecation log (§7 state 4b exit) | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `delete-pr-sla-extension-evidence.json` | 24h DeletePR SLA extension grant: requesting operator, approving `claws-repo-steward` + `compliance` identities, extension window duration, rationale (§7 state 7b) | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `rollback-entry-evidence.json` | Signed `MigrationEpochEntry` rows produced by the §6 R6 post-merge rollback procedure: craftworks revert SHA, claws deprecation versions, re-entry-point identification, corrective content pointer | HMAC-SHA256 | 7 years | BOTH repos under `.audit/migrations/horus/` |
| `pre-flight-redo-evidence.json` | Re-entry of §7 state 1 (PreFlight) following a post-merge rollback: dependency scan, commit-set diff against prior PreFlight baseline, `claws-repo-steward` re-authorization (§6 R6 step 4) | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `wal-fallback-evidence.json` | Audit-chain write fallback to durable local WAL (from contract-seams.md §S7.D / §S10.B): pending entry count, fallback trigger reason, reconciliation batch on re-delivery | HMAC-SHA256 | 1 year | `bic/claws` under `.audit/operations/` |
| `chain-integrity-collision-evidence.json` | `AUDIT_INTEGRITY_COLLISION` incident log per contract-seams.md §S7.F: colliding `policyArtifactSha256`, both `ProducerEntry` rows, operator attestation naming the canonical entry, downstream `DecisionEntry` / `ApprovalEntry` flagging scope | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/operations/` |
| `dry-run-parity-evidence.json` | Inter-clone parity diff: dry-run extraction (§7 state 2b) vs real extraction (§7 state 3). Must match byte-for-byte on commit sets, mailmap, walkability, path rewrites. Mismatch blocks state 4 exit. Complements intra-clone pre/post-filter diff recorded in `history-preservation-evidence.json` (per migration plan S1-F3). | HMAC-SHA256 | 7 years | BOTH repos under `.audit/migrations/horus/` |
| `dry-run-handoff-evidence.json` | Signed handoff record when the dry-run operator (§7 state 2b) differs from the real-run operator (§7 state 3): both operators sign; steward approves the handoff (per migration plan S1-F8). | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `deletion-inventory-evidence.json` | Output of `tools/migration/claws-inventory.sh` run pre-state-7: every on-disk claws-adjacent path in craftworks (source, docs, workflows, sibling directories like `docs/claws-historical/`) catalogued against the authoritative deletion manifest; omissions block state 7 entry (per migration plan S2-F3). | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `main-ci-waiver-evidence.json` | Signed waiver record when state 7 (DeletePR) entry is granted despite red `bic/claws@main` CI: failing check list, waiver justification, approver identities (`claws-repo-steward` + `compliance`), expiry time (per migration plan S2-F2). | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `residue-fix-evidence.json` | Tier B corrective PR log per §6 R6: targeted residue fix without full state-machine re-entry — defect class, corrective PR SHA, reviewer identities, audit-chain `type: post-merge-correction-tier-b` pointer (per migration plan S2-F4). | HMAC-SHA256 | 7 years | BOTH repos under `.audit/migrations/horus/` |
| `tarball-dep-sweep-evidence.json` | `npm ls --all --json` output per produced tarball against a `@bic/*`-only registry; any `@craftworks/*` resolution fails the sweep and blocks state 5 entry. Complements residue-grep (source-level) with build-artifact-level check (per migration plan S3-F5, S3-F12). | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `partial-publish-evidence.json` | Atomic-publish audit: records successful-step vs failed-step boundary for each of the 8 packages during §4.1 atomic publish. Used by rollback procedure and rehearsal-publish verification (per migration plan S3-F4). | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `prerequisite-wave-reopen-evidence.json` | Signed record when Ra (or another prerequisite wave) is re-opened to address a defect surfaced by Horus preparation: reopening operator, rationale, target fix PR, PreFlight-exit impact (per migration plan S3-F3). | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `legacy-runtime-audit-evidence.json` | Separate pre-state-7 audit pass that specifically scans for legacy-runtime (`@craftworks/claws-runtime`) references. The residue-grep regex (§Validation) excludes `runtime` by default; this evidence records the explicit pass looking for the excluded suffix (per migration plan S2-F11). | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/migrations/horus/` |
| `global-audit-query-evidence.json` | Per-invocation record of every `GlobalAuditorContext` audit-query (cross-tenant): auditor principal, justification string, incident ticket, query method, tenant set in result, row count, timestamp. Signed BEFORE the query executes; failure to write blocks the query (per contract-seams.md §S7.M rule 5, cross-plan S7-cross-tenant-audit-query-isolation / P-302). | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/operations/` |
| `query-entry-chain-evidence.json` | Rolling checkpoint (daily) summarizing `QueryEntry` chain write health: entries-written / entries-deferred-to-WAL / entries-reconciled / entries-failed-hard counters; flagged patterns from SIEM (high-volume / cross-tenant-attempt / global-invocation). Not per-query (those are `QueryEntry` rows in the chain itself) — this is the operational health snapshot (per contract-seams.md §S7.M rules 3 + 7, cross-plan S7 / P-302). | HMAC-SHA256 | 1 year | `bic/claws` under `.audit/operations/` |
| `registry-swap-pressure-evidence.json` | Daily telemetry rollup of `REGISTRY_PINNED_INSTANCE_COUNT` / `REGISTRY_SWAP_PER_MINUTE` / `REGISTRY_RELOAD_COALESCED` / `REGISTRY_RELOAD_BACKPRESSURED`; any `REGISTRY_SWAP_STORM` incident inline with operator response (per contract-seams.md §S3.K rules 5–6, cross-plan S3-registry-rw-lock-contention / P-303 variant). | HMAC-SHA256 | 1 year | `bic/claws` under `.audit/operations/` |
| `phase-event-emit-ownership-evidence.json` | CI output of `claws-sim/scripts/validate-emit-ownership.ts` — per-build scan of aether + lobster source trees cross-referenced against the §S3.A emit-responsibility matrix; duplicates or unassigned emitters fail the build and write the incident here (per contract-seams.md §S3.L rule 1, cross-plan S3-boot-state-5-6-ownership-ambiguity / P-320 + P-321). | HMAC-SHA256 | 7 years | `bic/claws` under `.audit/operations/` |
| `orphan-process-sweep-evidence.json` | Per-CI-run post-test orphan-Node-process check output (per contract-seams.md §S10.P rule 4, cross-plan S10-concurrent-test-dispatch-isolation / P-304 variant). Zero-orphan assertion is a CI gate; non-zero results fail the run and the evidence captures the orphan PIDs + parent context for forensics. | HMAC-SHA256 | 1 year | `bic/claws` under `.audit/operations/` |

**Evidence status field**: every evidence artifact carries a `status: 'draft' | 'signed-final'` field (per migration plan S2-F6). `draft` entries are written during state transitions in progress and are not admissible for audit evidence; only `signed-final` entries count toward state-exit conditions. Signing converts draft → signed-final and freezes the content.

**Default inheritance rule**: any evidence artifact referenced elsewhere in this spec (§7 state machine, §4 release coordination, §5 auth lifecycle) inherits the §6.1 defaults — HMAC-SHA256 signing by the `claws-release-eng` role, 7-year retention for migration-epoch and rotation artifacts / 1-year retention for operational smoke artifacts, write-once access control (amend-only via new signed entries; never deleted or overwritten), readable by auditors and the `compliance` role.

**Retention policy**: 7 years for migration-epoch and rotation artifacts per SOC2 7-year retention minimum; 1 year for operational smoke-test and announcement evidence.

**Access control**: `.audit/migrations/horus/` is readable by the `auditors` and `compliance` roles; **write-once** — amend-only via new signed entries, never delete. Rewriting a prior entry is a compliance-reportable event.

Each §Validation item below references its corresponding evidence artifact.

## §7 — Migration path state machine

| # | State | Entry condition | Exit condition | Evidence artifact | Rollback procedure |
|---|-------|-----------------|----------------|-------------------|-------------------|
| 1 | PreFlight | Ra wave closed; zero `@craftworks/` runtime deps in `@bic/claws-sdk` (verified via `npm pack` tarball inspection) | Freeze announcement posted | `Ra-close-evidence.json` | N/A |
| 2 | Freeze | Freeze announcement posted; claws-* PR merges blocked | 24h window elapses OR all PRs drained | `freeze-window-evidence.json` | Lift freeze, restart PreFlight |
| 2b | **DryRunExtract** | Entered optionally between Freeze and Extract on a throwaway branch to validate the filter-repo invocation | Dry-run `git log --follow` walkability + filter-repo metrics captured; no commit pushed | `dry-run-extract-evidence.json` | Discard dry-run branch; return to Freeze |
| 3 | Extract | Fresh temp clone made; `tools/migration/claws-extract.sh` invoked | `git log --follow` walkability check passes | `history-preservation-evidence.json` | Discard temp clone, return to PreFlight |
| 4 | Verify | Pre/post commit-set diff + walkability + LICENSE check all pass | All 4 evidence artifacts signed | `verify-evidence.json` | Discard extract output, return to PreFlight |
| 4b | **RehearsalPublish** | Optional. First tag on a shadow package scope (`@bic/claws-rehearsal-*`) exercising the full release workflow without consumer impact | All 8 rehearsal packages visible on GPR; rehearsal tarballs deleted post-exercise | `rehearsal-publish-evidence.json` | GPR `npm deprecate` rehearsal scope; discard |
| 5 | InauguralPublish | `bic/claws` CI green on main; first 0.1.0 release tagged | All 7 packages visible on GPR; dogfood test passes | `publish-evidence.json` | GPR deprecate + corrective publish |
| 6 | SmokeInstall | Scratch dir `npm install @bic/claws-cli@0.1.0 && claws --help` succeeds | All post-publish gates green (incl. Gateway runtime-integration smoke §4.4) | `install-smoke-evidence.json` | Mark 0.1.0 as deprecated; iterate to 0.1.1 |
| 7 | DeletePR | craftworks deletion PR opened with path-mapping table | PR merged within 24h SLA | `deletion-manifest.yaml` (signed) | Revert PR; restart from Freeze |
| 7b | **DeletePR:SlaExtended** | 24h SLA (state 7) exceeded; extension granted by `claws-repo-steward` + `compliance` roles | Merge within extension window OR escalation to wave-boundary re-approval | `delete-pr-sla-extension-evidence.json` | Revert open PR; restart from Freeze |
| 8 | Thaw | craftworks freeze lifted | Two-repo coherence operational; quarterly audit scheduled | `thaw-announcement.json` | N/A |

**State naming grammar**: state names are PascalCase single tokens (no spaces, no hyphens, no underscores). Multi-word states are joined by capitalization (`PreFlight`, `InauguralPublish`, `SmokeInstall`, `DeletePR`, `DryRunExtract`, `RehearsalPublish`). Acronyms remain uppercase (`DeletePR` preserves `PR`). Sub-states append `:<Qualifier>` suffix (`Extract:Failed`, `InauguralPublish:Failed`, `DeletePR:SlaExtended`). New states added after v1.4 MUST follow this grammar.

**Sub-state failure modes** (per `steward-M3`): each state may transition to a `<StateName>:Failed` terminal state; recovery always returns to the prior state with a signed rollback entry in the audit chain. Rollback from states 3–7 returns to PreFlight (the filter-repo is re-runnable; the deletion is reversible until state 7). Post-merge rollback from state 7 follows the §6 R6 procedure.

**Per-transition audit chain entries** (per `compliance-M4`): each state entry and exit writes a `MigrationEpochEntry` to the `@openclaw/audit-chain` containing the evidence artifact's SHA-256, the operator identity, and the wall-clock timestamp. A state transition without a corresponding audit chain entry is a compliance-reportable event.

## §8 — What stays in craftworks

Per §1, nothing claws-related. However, the following non-claws craftworks surfaces interact with the boundary and are documented for cross-reference:

- `CODEBASE.md`: Updated to remove `@craftworks/claws-*` rows; no replacement rows added (claws is an external GPR dep, not an internal package)
- `.github/workflows/`: `claws-*.yml` deleted; any claws matrix entries removed
- `scripts/rewrite-file-deps.sh`: rewrite rule for `@bic/claws-sdk=file:../claws-sdk` removed
- **CODEOWNERS**: `bic/claws/.github/CODEOWNERS` MUST include rules for boundary-adjacent paths — `tools/migration/claws-extract.sh`, `.audit/migrations/horus/`, `.audit/operations/dual-copy-parity-evidence.json`, and any residual `claws` references in `CODEBASE.md`. Owner: `@bic/claws-repo-steward`. The equivalent `bic/claws/.github/CODEOWNERS` names the same steward role for `tools/migration/`, `.audit/`, and `docs/operations/ghe-packages-auth.md`. Changes to CODEOWNERS entries for boundary-adjacent paths require steward review.

## §9 — Post-migration boundary maintenance

- The `claws-repo-steward` role owns the boundary; any PR that would cross it (either direction) requires steward review
- **2-maintainer requirement (steward-N3)**: boundary-critical PRs (deletion PR in §7 state 7, any PR touching `tools/migration/`, `.audit/migrations/horus/`, `docs/operations/ghe-packages-auth.md`, the §6.1 evidence schema, the §7 state machine) require **two** maintainer approvals, one of whom MUST be `claws-repo-steward`. Single-approval merges on these paths are a compliance-reportable event. The `deletion-manifest.yaml` REQUIRES a `reviewerPrincipal` field naming the second maintainer.
- **Weekly CI cron** (primary): the canonical residue-grep regex from §Validation runs as a weekly cron in both repos; any active-code cross-reference fails the audit and pages the `claws-repo-steward` role. Weekly cadence is required because active-code leaks accumulate silently and compound release over release.
- **Quarterly audit** (broader pattern scan): `rg "@craftworks/" bic/claws/ && rg "@bic/claws-" bic/claws/` run quarterly for broader pattern audits (prose-text references, historical regressions, policy drift). Quarterly cadence is appropriate for this class because it catches patterns the weekly cron may miss, not because it catches active-code leaks (those are caught weekly).
- **Quarterly dual-copy parity check**: per §6 R4, `sha256sum` of `tools/migration/claws-extract.sh` in both repos must match; mismatch fails the audit.
- Version pinning in sibling consumer repos (aether, lobster, cowork, etc.) audited at quarterly cadence; floating ranges flagged

## §10 — Internal distribution posture

`microsoft.ghe.com/bic/claws` is a Microsoft-internal repository. `@bic/claws-*` packages publish to GHE Packages (authenticated against the GHE instance via fine-grained PAT or CI service connection). Public distribution — whether `@microsoft/claws-*` on public npm, a mirror, or source-redistributable packaging — is explicitly **out of Horus scope**. A future wave (if ever) may evaluate public distribution; for Horus and the foreseeable post-Horus period, claws is bic-internal only. The source license remains MIT (per `LICENSE` file) at the file level, which permits future re-licensing decisions without contractual friction.

---

## Validation

The spec is satisfied when:

1. Post-migration grep returns zero cross-boundary active code references — evidenced by `residue-grep-evidence.json` (§6.1)
2. Fresh clone of `bic/claws` builds + tests green on all 3 OS in CI — evidenced by `publish-evidence.json` (§6.1)
3. `npm install @bic/claws-cli@0.1.0 && claws --help` succeeds in a scratch directory with no ambient `.npmrc` — evidenced by `install-smoke-evidence.json` (§6.1)
4. `tools/migration/claws-extract.sh` exists in both repos (per §6 R4) — evidenced by `history-preservation-evidence.json` (§6.1)
5. Deletion PR path-mapping table is complete (every deleted file → new location + SHA) — evidenced by `deletion-manifest.yaml` (§6.1, signed)
6. GPR auth docs exist at `bic/claws/docs/operations/ghe-packages-auth.md` and are referenced (not duplicated) by every consumer repo
7. **LICENSE preservation** (per `founder-M5`): `diff <(git show craftworks@MIGRATION_SHA -- LICENSE) <(cat bic/claws/LICENSE)` returns 0 lines (MIT license text byte-identical across the boundary) — evidenced by `verify-evidence.json` (§6.1)
8. **Signed-tag enforcement**: every release tag matching the canonical tag regex (§4) passes `git tag -v <tag>` against the `claws-release@bic` GPG key; CI rejects unsigned or invalid-signature tags at the pre-publish gate — evidenced by `publish-evidence.json` (§6.1) which records the tag verification output.
9. **Single-source gpr-auth enforcement**: weekly CI cron runs `rg "GPR auth|_authToken=|npm.pkg.microsoft.ghe.com" bic/claws/ gim-home/aether/ gim-home/lobster/ gim-home/cowork/ --files-with-matches` and asserts that every match either (a) references `docs/operations/ghe-packages-auth.md` (by name or link), or (b) is inside `docs/operations/ghe-packages-auth.md` itself, or (c) is the `.npmrc` template from §5. Any file that duplicates auth content without referencing the canonical doc fails the audit. Result appended to `gpr-auth-single-source-evidence.json` under `.audit/operations/` in the claws repo.
10. **Tarball-level dependency sweep**: pre-state-5 entry, for each produced tarball (`npm pack` output), run `npm ls --all --json` against a `@bic/*`-only registry and fail if any `@craftworks/*` package is resolved. Complements source-level residue grep (item 1) with build-artifact-level coverage — catches transitive deps that source grep misses. Evidenced by `tarball-dep-sweep-evidence.json` (§6.1).
11. **Legacy-runtime audit pass**: pre-state-7 entry, run a separate scan specifically for `@craftworks/claws-runtime` references (the suffix excluded from the canonical residue grep per §Validation item 1's regex). Legacy runtime was historically a package name and any accidental reintroduction must be caught. Evidenced by `legacy-runtime-audit-evidence.json` (§6.1).

### Canonical residue-grep

- **Regex** (locked here; not in any plan): `@craftworks/claws-(lsp|serve|sdk|skill-kit|compiler|cli|test|sim)`
- **Excluded suffix**: `runtime` — historical, no longer a package name; if reintroduced, add to the regex in a spec amendment
- **CI enforcement**: a weekly craftworks CI cron runs this grep and fails if active code matches. The cron output is appended to `residue-grep-evidence.json` on each run.
- **Documentation grep is separate**: `@bic/claws-*` in craftworks docs (prose, `.md` files) is PERMITTED. The residue-grep excludes prose files via a gitleaks-style file-path filter — it only scans code, scripts, workflows, and `package.json` fragments.
- **False-positive filter for `@bic/claws-*` direction**: the reverse-direction quarterly grep (`rg "@bic/claws-" bic/claws/`) legitimately matches craftworks root `package.json` / `package-lock.json` consumer entries (craftworks is allowed to consume claws via GPR per §2 diagram arrow 1). The quarterly audit tooling MUST exclude `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies` fields in JSON files from the fail condition — a match inside those fields is expected and not a boundary violation. Only matches in source code, scripts, workflows, or `package.json` fields other than the 4 dep fields (e.g., `scripts:`, `name:`, `bin:`) fail the audit.

## §11 — Deferred findings

The following R1 findings are explicitly deferred out of v1.3 scope with rationale. Each is revisitable in a subsequent spec amendment when the precondition is met.

| ID | R1 severity | Rationale for deferral | Revisit trigger |
|----|-------------|------------------------|-----------------|
| founder-W1 — "accepts community PRs" column per package | Warning | Per-package community-PR policy is not applicable during Horus (§10 bic-internal posture). Claws is Microsoft-internal; there is no public community to accept PRs from. If a future public-distribution wave (if ever) re-opens this question, per-package policy can be added then. | Future public-distribution wave (if ever); CL-08 v1.2 amendment supersedes the Layer-2/Layer-3 freemium framing. |
| gateway-eng-W1 — grep rule over-restrictive re: agent-sdk TS imports | Warning | The finding cites agent-sdk TypeScript imports as a possible false-positive class but does not provide a concrete example. The current canonical regex (§Validation) targets `@craftworks/claws-<pkg>` specifically; an agent-sdk TS import would not match because it uses `@craftworks/agent-sdk`, not `@craftworks/claws-*`. Without a concrete failing example, tightening the regex risks introducing genuine coverage gaps. | Re-raise with a concrete failing grep example (file path + line). |
| compliance-W2 — Shorter rotation cadence for `write:packages` token | Warning | Current cadence is 90 days (§5), matching the `read:packages` cadence. Shortening `write:packages` to a tighter cadence (30 or 60 days) is a security-team decision that affects CI secret-rotation scheduling across the release workflow and the org-level secret store. Changing the cadence in the spec before security-team sign-off would create a spec/operational-reality gap. | Security-team review of privileged-token cadences; likely folded into a broader token-rotation policy review. |
| founder-W5 — "External tester" gate before community announcement | Warning | External-facing communication milestones are out of Horus scope per §10 (bic-internal posture). No external announcement, tester recruitment, or public feedback channel is planned; if a future public-distribution wave reopens this, it would own the go-to-market sequence. CL-13 defines the technical boundary only. | Future public-distribution wave (if ever). |
| release-eng-M3 — Token rotation unenforced at machine level (partial) | Major (partial) | §4.3 key rotation + §5 token rotation + §6.1 rotation-evidence artifacts cover the spec-level contract and the evidentiary artifact. Machine-enforced rotation (CI gate that fails when a token/key exceeds its cadence age) is a CI-infrastructure change spanning multiple consumer repos; the enforcement mechanism is not a spec-level decision. The §6.1 `token-rotation-evidence.json` entry provides audit-time detection of rotation lapses. | CI-infra wave to implement machine-enforced rotation gates (likely post-Horus when multi-repo CI is stabilized). |
| release-eng-M5 — Semver reset to 0.1.0 downstream-misread risk (partial) | Major (partial) | §4.5 `generatorVersion.legacyBase: "craftworks-pre-migration"` gives runtime consumers a lineage marker that survives the semver reset. Release-notes guidance ("this is a migration-epoch reset, not a regression") is an operational/communications artifact, not a spec invariant. | Horus release-comms plan (same as founder-W5). |
| gateway-eng-M4 — Runtime Gateway install failure modes (partial) | Major (partial) | §2.1 locks the runtime consumption direction and §4.4 adds a Gateway runtime-integration smoke test. Deeper failure-mode taxonomy (what fails when `@bic/claws-*` is partially installed, when a Gateway version predates a compiler output, when sourcemap chains break across a migration-epoch boundary) belongs in CL-11 (upstream-governance) or a new Gateway-integration spec. | CL-11 v2 or a new Gateway-resilience spec. |
| compliance-N1 — Entry/exit conditions not tabulated (resolved in R2; listed for traceability) | Note | R2 E7 already tabulated §7 with Entry/Exit/Evidence/Rollback columns. This row exists in the deferred table only to confirm that the R1 finding is addressed. | N/A — closed. |
| S7-cross-tenant/F6 — Cross-tenant leak disclosure runbook | Major (operational) | Cross-tenant query isolation is structurally enforced by contract-seams.md §S7.M (`TenantContext` constructor, schema-level WHERE, lint rule, `QueryEntry` audit chain). The disclosure runbook (`docs/operations/cross-tenant-leak-runbook.md`) is an operational deliverable spanning legal review, regulatory-timeline scripting (GDPR 72h, HIPAA 60d, contractual SLAs), and notification templates. It belongs to a compliance-ops wave, not the Horus technical boundary. | Post-Horus compliance-ops wave; `global-audit-query-evidence.json` (§6.1) already captures per-incident evidence for any interim manual response. |
| S7-cross-tenant/F8 — Annual shared-backing-store review | Major (operational) | §7.M enforces cross-tenant isolation at query time. The annual review (signed `shared-backing-store-review-{year}.json` by the BIC customer-trust officer quantifying cost savings vs residual risk) is a governance cadence, not a spec invariant. Adding it to the spec before the customer-trust officer role owns the review program creates a spec/operational-reality gap. | Customer-trust officer program stand-up; fold into the post-Horus compliance-ops wave. |
| S7-cross-tenant/F10 — Physical-isolation ADR (per-tenant database) | Medium (architectural) | Shared-backing-store decision is implicit in the current chain architecture and now-mitigated by §S7.M enforcement. An explicit ADR (`docs/claws/governance/audit-backing-store-adr.md`) weighing per-tenant DB vs shared-with-logical-isolation belongs in a governance-architecture track. Physical isolation would also reshape §4 release coordination and §5 GPR auth — not a low-touch edit. | Governance-architecture wave; revisit when a concrete customer request for physical isolation lands. |
| S7-cross-tenant/F12 — Quarterly cross-tenant tabletop drill | Low (operational) | Tabletop rehearsal of the (deferred) disclosure runbook naturally follows the runbook itself. Until F6 lands, there is nothing to rehearse. | Immediately following F6 landing; signed `tabletop-drill-evidence.json` per drill would then be added to §6.1. |
| S3-registry-contention/F12 — Cowork dev-mode `registryVersion` badge | Low (UX) | Aether `DecisionEntry.anchorRegistryVersion` (per §S7.N) is the authoritative source; operator-facing UI is a Cowork-side polish deliverable. Surfacing in production via `/api/chunks/governance-health` is in scope; dev-mode UI badge is not. | Lobster Cowork UX wave follow-up. |
| S10-concurrent-test/F12 — xUnit `maxParallelThreads` > 8 re-validation | Low (operational) | §S10.P rule 9 pins `maxParallelThreads: 8` in the template. If CI upgrades to ≥ 16 logical cores and wants to raise parallelism, fixture assumptions (spawn-throttle cap, PID pressure, TIME_WAIT headroom) must be re-validated by re-running the concurrency-shuffle property test under the new level. Not a near-term constraint. | Sim-harness re-validation when CI hardware scales. |

The following R1 finding is NOT deferred but is covered structurally elsewhere:

- **founder-M3 — 7-package structure obscures one-package quickstart**: addressed in §1 via the "Installation entry point" paragraph. The `@bic/claws-cli` install with `microsoft.ghe.com` auth is the one-package path for internal engineers. No separate deferred entry needed.

---

## Related

- `.craft/plans/claws-repo-migration.md` — the plan that executes this spec
- `.craft/waves/260416+horus-the-heir+claws-migration/contract-seams.md` — cross-plan seam authority
- `CL-08-freemium-boundary.md` — freemium packaging (effectively paused per CL-08 v1.2 bic-pivot amendment)
- `CL-10-cap-integration.md` — consumer contract for `claws-serve`
- `CL-11-upstream-governance.md` — consumer contract for governance artifacts
