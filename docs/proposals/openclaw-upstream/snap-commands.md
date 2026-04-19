# `openclaw snap` — Subcommand Group Spec

**Not a package**: a group of subcommands contributed to the existing `openclaw` CLI.
**Powered by**: `@openclaw/snap` (library) + `@openclaw/policy` (at the `snap diff` handler layer only)
**Status**: Proposal (draft)
**Date**: 2026-04-18
**Companion to**: `openclaw-upstream-spec.md` (main spec, §4) · `snap.md` (library + server spec)

---

## Summary

A flat `snap` subcommand group on the existing `openclaw` CLI — peer of `openclaw policy`. Eleven verbs covering the full workspace lifecycle (working tree ↔ snapshot registry), grouped by role:

**Stage toggle** (default: off — opt-in per workspace):
- **`stage on` / `off`** — enable/disable auto-staging for governance files. Effective rules are visible via `snap status` (no separate `stage status` verb).

**Working tree**:
- **`status`** — show working tree + `.stage/` + drafts + current, all in one view.
- **`diff --staged`** — show staged content vs canonical (pre-upload).
- **`discard --stage`** — clear `.stage/` without uploading.

**Registry**:
- **`upload`** — commit staged content as a new draft snapshot. Flags: `--promote` (atomic draft+promote), `--local` (local fs store only; git-stash-equivalent), `--label <name>` (named draft for parallel sessions).
- **`list`** — enumerate snapshots; filter by `--status draft|current|superseded`.
- **`diff <id1> <id2>`** — semantic diff between two snapshots (delegates to `@openclaw/policy`'s `diffPolicyIR` at the CLI-handler layer).
- **`checkout <id>`** — reset the working tree to a snapshot (parallel to `git checkout <sha>`).
- **`promote <id>`** — draft → current (audited; precondition-checked per spec §4).
- **`rollback <id>`** — re-promote a prior snapshot as current; audited.
- **`discard <id>`** — drop a draft from the registry.

**Daemon**:
- **`serve`** — start the `@openclaw/snap` HTTP server (snapshot registry; no compile endpoint).

`@openclaw/snap` has zero runtime dep on `@openclaw/policy` — the library stays layer-clean. Composition happens here, in the CLI handlers, where `snap diff <a> <b>` imports the policy diff utility to render semantic output. Hosts that don't have `@openclaw/policy` installed get a file-level fallback diff from `snap diff` instead of a hard error.

---

## Motivation

Snapshot management is a distinct job from policy generation. Conflating them (putting `snap` under `openclaw policy snap`) forced readers to think of snapshots as an appendage of the generator. They're not — they're a first-class concern: *which workspace is current? what changed yesterday? what does a companion app read to show "the policy in force"?* Those questions stand on their own, and the answers don't require the generator to be installed.

`openclaw snap` is what a release engineer, a supervisor, an auditor types. It's what a CI pipeline uses to upload + promote after generation. It's what a fleet-management tool invokes to roll back across tenants. The generator's presence or absence is orthogonal.

---

## Interface

```bash
# Local / remote store configurable via --store=<url> or OPENCLAW_SNAP_STORE env var;
# defaults to the local .openclaw/snapshots/ directory.

# Stage toggle (default: off — staging is opt-in per workspace)
openclaw snap stage on                             # enable auto-staging for governance files
openclaw snap stage off                            # disable; writes go direct to canonical
openclaw snap stage on --session                   # this shell only
openclaw snap stage on --global                    # all workspaces for this user
# (To inspect effective stage rules, use `openclaw snap status` — it shows
#  the working tree, stage config, drafts, and current all in one view.)

# Working-tree surface (git-parallel)
openclaw snap status                               # working tree + stage + drafts + current
openclaw snap diff --staged                        # staged content vs canonical
openclaw snap discard --stage                      # clear .stage/ without uploading

# Registry surface
openclaw snap upload                               # commit staged → new draft
openclaw snap upload --promote                     # atomic: upload + promote in one step
openclaw snap upload --local                       # local fs store only (git-stash equivalent)
openclaw snap upload --label "r5-raise-v2"         # named draft for parallel sessions

openclaw snap list                                 # enumerate snapshots
openclaw snap list --status current                # filter by status
openclaw snap list --limit 20 --cursor ...         # pagination

openclaw snap diff <id1> <id2>                     # semantic diff (composes @openclaw/policy)
openclaw snap diff <id1> <id2> --level file        # file-level only (no policy semantics)

openclaw snap checkout <id>                        # reset working tree to a snapshot

openclaw snap promote <id>                         # make current
openclaw snap promote <id> --confirm               # explicit confirmation in interactive mode

openclaw snap rollback <id>                        # revert to a prior snapshot
openclaw snap discard <id>                         # drop a draft from the registry

# Daemon
openclaw snap serve --port 8443                    # start HTTP server
openclaw snap serve --store s3://my-bucket/...     # object-storage-backed store
openclaw snap serve --auth-header x-oc-principal   # wire host auth (principal from request header)
```

Representative session:

```bash
$ openclaw snap list
sha256:3a7f…  2026-04-17T14:22Z  giodl     current
sha256:2d01…  2026-04-17T09:11Z  giodl     superseded
sha256:1c99…  2026-04-16T18:45Z  peter     superseded

$ openclaw snap diff sha256:3a7f sha256:2d01
  SOUL.md      1 deny rule added
  TOOLS.md     send-email: R4 → R5 (raised)
  AGENTS.md    (unchanged)

$ openclaw snap promote sha256:3a7f
Promoted sha256:3a7f as current (supersedes sha256:2d01).
Audit: snapshot_promote at 2026-04-18T10:04:12Z by giodl@microsoft.com.
```

---

## Semantics / Behavior

### `openclaw snap stage on | off` — the staging toggle

**Default: off** — writes land on canonical directly, same as OC behaves today. Users enable staging per-workspace when they want the review gate:

- `snap stage on` — writes config to `.openclaw/stage-config.json`; subsequent writes to governance files (SOUL/USER/AGENTS/TOOLS/IDENTITY/SKILL + host-custom globs) auto-stage via `FileIngestProvider.modify + redirectPath`. Prints a visible notification on each redirect.
- `snap stage off` — reverts to direct writes. Audit chain still emits `snapshot_promote` on each direct write (integrity holds); the review gate is skipped.

**Scope flags:**
- `--session` — enable/disable for the current shell only (env var).
- `--global` — enable/disable for all workspaces (user-level config).
- (no flag) — workspace-level, persists in `.openclaw/stage-config.json`.

**Inspecting current state**: `openclaw snap status` (below) shows effective stage rules alongside working-tree and registry state — one command to see everything, no separate `stage status` verb.

**Host enforcement**: if host config sets `staging.enforce: true`, `snap stage off` returns `error: STAGING_ENFORCED`. Users can always inspect via `snap status` but cannot downgrade.

### `openclaw snap status` — working tree + stage config + drafts + current

One-shot inspection — the only status command a user ever needs:

```
Stage:        on (workspace-level; host enforced: no)
              governance files auto-stage: SOUL.md, USER.md, AGENTS.md,
                TOOLS.md, IDENTITY.md, skills/**/SKILL.md
              custom host rules: (none)

Working tree: 2 files modified (SOUL.md, TOOLS.md)
              both auto-staged into .openclaw/.stage/

Draft:        sha256:4c01  uploaded 2026-04-18T09:15Z
              parent: sha256:3a7f (current)
              validation: PASS (policy check; not yet comply-verified)

Current:      sha256:3a7f  promoted 2026-04-17T09:11Z by peter
History:      3 prior snapshots (superseded)
```

Covers four things at once: (1) the staging toggle + effective rules, (2) what's pending in the working tree, (3) any uploaded drafts, (4) what's current. One command, everything visible.

### `openclaw snap list` — enumerate snapshots

Calls `store.list()` (local filesystem store by default) or `GET /v1/snapshots` (remote via `--store`). Output is reverse-chronological, one snapshot per line: `id`, `createdAt`, `author`, `status`. `--status current|superseded|draft` filters. Pagination via `--limit` and `--cursor` (cursor returned in the last line of prior output).

### `openclaw snap upload` — commit staged content as a draft

Reads the working tree (with `.stage/<path>` resolved over canonical), canonicalizes, computes `snapshotId`, uploads to the store. Clears `.stage/` on success (same as `git commit` clearing the index).

Flags:
- `--promote` — atomic: upload the draft and immediately promote it as current (equivalent to `snap upload && snap promote $LAST_ID`). Useful for CI and single-author iteration flows.
- `--local` — store only in the local filesystem store; do not push to a remote `snap serve`. Content-addressable id still computed — this is the git-stash equivalent.
- `--label <name>` — attach a human-readable label to the draft. Useful for parallel in-flight work (`--label send-email-r5-raise` / `--label memory-schema-update`). Labels are visible in `snap list`.

### `openclaw snap checkout <id>` — reset working tree to a snapshot

Parallel to `git checkout <sha>`. Replaces the working tree's canonical files with the snapshot's files; clears any pending `.stage/` content (unless `--keep-stage` is passed). Useful for:
- Reviewing what a draft actually contains (check it out, inspect, then `snap checkout <original-id>` back).
- Starting a new edit session from a non-current draft (checkout the draft, edit further, upload a child draft).

### `openclaw snap discard --stage` / `snap discard <id>`

Two forms:
- `--stage` — clear the working tree's `.stage/` directory. Does not touch canonical or the registry. Parallel to `git reset HEAD` (unstage all).
- `<id>` — drop a draft from the registry. Registry-only operation; does not touch the working tree. Prior `current` / `superseded` snapshots cannot be discarded (history preservation).

### `openclaw snap diff` — two forms

- `snap diff --staged` — compares working-tree `.stage/<path>` vs canonical for every staged file. Read-only; does not touch registry. Shows what `snap upload` would commit if run now.
- `snap diff <id1> <id2>` — loads two snapshots from the store and renders a semantic diff. If `@openclaw/policy` is installed, imports `diffPolicyIR` for deny-rule adds/removes, R-tier changes, `args_from` provenance deltas. If not installed (snap-only host), falls back to a file-level diff with a note pointing at `npm install @openclaw/policy` for the semantic version. `--level file` forces the file-level fallback even when policy is present.

### `openclaw snap promote` — make current

Calls `POST /v1/snapshots/:id/promote` on the server (or the store's `promote()` directly for local). Server validates the precondition — `.openclaw/policy/policy-ir.json` must be present in the snapshot — and returns `409 POLICY_NOT_GENERATED` if missing. On success, records caller identity, emits `snapshot_promote` audit event, atomically moves the prior current to `superseded`.

`--confirm` (interactive-mode default; CI default is unattended) prompts before promoting. `--yes` skips the prompt explicitly.

### `openclaw snap rollback` — revert

Calls `POST /v1/snapshots/:id/rollback`. Same audit category (`snapshot_rollback`), same identity capture. Does not delete newer snapshots; they remain `superseded` in history.

### `openclaw snap serve` — start the HTTP server

Starts `@openclaw/snap`'s HTTP server on the given port. `--store` selects the backend (`inMemoryStore()`, `filesystemStore({ root })`, or an object-storage adapter). `--auth-header <name>` configures which request header carries the caller principal (host typically puts an identity-bridge layer in front and forwards through the header). Full endpoint list in `snap.md`.

### Exit codes

`0` on success. `1` on any server-returned error (4xx/5xx surfaces as non-zero with the HTTP status in stderr). `2` on internal snap error (bug). `3` on CLI usage error (unknown flag, missing argument).

---

## Versioning

Semver on `@openclaw/snap`. The CLI surface — command names, flag names, exit codes — is the stable contract. Adding a subcommand or flag is minor; renaming a subcommand or changing exit-code semantics is major. LTS alignment follows `@openclaw/snap`.

---

## Testing

- **L0 unit** — argument parsing round-trips every documented form; exit codes match HTTP status per command; `--level file` forces file-level diff even when policy is present; `--confirm` / `--yes` handled correctly in interactive vs unattended modes.
- **L1 integration** — paired with `@openclaw/snap` in-memory store: list / promote / rollback round-trips. Paired with `@openclaw/policy`: `snap diff` produces the same output a direct `policy diff` call would. Paired without `@openclaw/policy`: `snap diff` falls back to file-level with a clear note.
- **L2 E2E** — spin up `snap serve` against a filesystem store; from a separate client, upload a generated workspace, promote it, list, rollback to a prior snapshot, verify the audit chain.

---

## Dependencies

Zero `@microsoft/*` imports. The handlers depend on `@openclaw/snap` (the library) and whatever argv parser `openclaw-core`'s CLI already uses. `snap diff` optionally imports `@openclaw/policy` at the handler layer (try/catch around `require`); no hard runtime dep.

---

## Open items

- Whether `snap` should grow a `snap sign <id>` or `snap verify <id>` surface for cryptographic snapshot signing. Currently out of scope — `snapshotId` is content-addressable but not cryptographically signed. Separate proposal if the need surfaces.
- `snap export` / `snap import` for moving snapshots between stores (e.g., local → S3). Useful but not in the minimum contribution surface.
- Whether `snap list` should show auxiliary metadata (parent chain, promote/rollback timestamps, audit correlation ids) inline or require a verbose flag.
- Autocompletion scripts (bash / zsh / fish) — nice to have; not in the main spec.

---
