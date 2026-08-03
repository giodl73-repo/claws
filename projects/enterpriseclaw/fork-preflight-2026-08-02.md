# Lobster OpenClaw Fork Preflight

PRE-001 establishes the writable fork, immutable source pin, protected
integration branch, clean operator checkout, and exact cross-platform baseline
commands before BOOT-001 adds any carried source.

## Pinned Source

| Item | Value |
| --- | --- |
| Parent | `openclaw/openclaw` |
| Fork | `giodl73-repo/openclaw` |
| Writable identity | `giodl73-repo` |
| Pinned upstream `main` | `b7f9cd0a01671f7be5fc34b4bd4bf6770603f480` |
| Pinned tree | `5ddfc5c67814d3208f7153a260fd47ead27775e3` |
| Fork `main` after sync | `b7f9cd0a01671f7be5fc34b4bd4bf6770603f480` |
| Integration branch | `lobster/integration` |
| Integration head | `b7f9cd0a01671f7be5fc34b4bd4bf6770603f480` |
| Source commit time | `2026-08-02T16:39:26-07:00` |

Fork `main` was fast-forwarded from
`5332641ed3bab552d23fb16c67bc697a373ea9d7`. No carried patch or
EnterpriseClaw behavior is present in the integration tree.

## Branch Protection

`lobster/integration` is protected with:

- linear history required;
- force pushes disabled;
- branch deletion disabled; and
- conversation resolution required.

Required checks and the queue-only application rule are deferred to BOOT-001,
which creates the reconstruction workflow and its stable check identities.
Administrative bypass remains available during bootstrap.

## Operator Checkout

The clean Windows checkout is:

```text
C:\src\openclaw-lobster
```

It tracks `origin/lobster/integration`, has `upstream` pointed at
`openclaw/openclaw`, and currently has no local changes.

Recorded Windows environment:

| Component | Value |
| --- | --- |
| OS | Windows 10 Pro, build 26310, x64 |
| Git | 2.55.0.windows.3 |
| Node | 24.14.0 |
| Corepack | 0.34.6 |
| Repository pnpm pin | 11.15.1 |

The configured local WSL distribution is currently unavailable. Linux proof
therefore uses a clean GitHub-hosted Ubuntu 24.04 runner until WSL is restored.
The installed Windows Node 24.14.0 is below the repository's current supported
24.x floor of 24.15.0, so it is suitable for source and dependency-free
reconstruction proof but not a full local baseline claim.

## Exact Baseline Commands

Run from a clean checkout at the pinned source SHA on Windows 2025 and Ubuntu
24.04 with Node 24.x and the repository-pinned pnpm version:

```text
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm check:test-types
corepack pnpm check:architecture
corepack pnpm build
corepack pnpm ui:build
corepack pnpm release:check
```

BOOT-001 must run the same commands for vanilla and reconstructed empty-queue
integration trees and record command, platform, source, tree, lockfile, and
result digests. Platform-specific CI jobs may shard these commands, but they
must preserve the same pinned source and command semantics.

## Live Baseline Run

Manual fork CI was dispatched against the exact pinned SHA:

- run: `30773428781`;
- URL: `https://github.com/giodl73-repo/openclaw/actions/runs/30773428781`;
- workflow ref: `lobster/integration`;
- target ref: `b7f9cd0a01671f7be5fc34b4bd4bf6770603f480`;
- Android: excluded;
- initial state: queued.

The run has exposed one known vanilla failure:

- `native-i18n`, job `91564654215`, fails because generated native Apple
  inventory identifiers and sources do not match the checked-in inventory.

This is recorded as baseline noise rather than repaired in BOOT-001. #90708 is
unrelated test stabilization and remains source-only/quarantined.

The exact-SHA run completed with conclusion `failure` solely because of the
recorded vanilla baseline drift. PRE-001 is complete: the source commit/tree,
protected integration branch, operator checkout, platform constraints, command
set, and terminal baseline result are all recorded.

## Bootstrap and Source Inventory

BOOT-001 landed through `giodl73-repo/openclaw#203` at
`ffdca034fcc17b176c7fbecd72d5283972af1091`. Review exposed a deterministic
reconstruction defect: `git cherry-pick` inherited local committer identity and
time, so identical inputs produced different result commits and digests. The
landed fix derives committer name, email, and date from each source commit and
adds a two-identity repeat-run regression. Landing proof:
`https://github.com/giodl73-repo/openclaw/pull/203#issuecomment-5161305989`.

The source-only inventory landed through `giodl73-repo/openclaw#204` at
`e197147c4403a9b5aed60f43f8a28b03ed6f0fe9`. It adds `.lobster/sources.json`,
links it from the empty queue, and validates:

- exactly 55 unique PR numbers and 55 unique full source-head SHAs;
- exact agreement with the canonical Markdown source ledger;
- the allowed C0-C5 tranche vocabulary, including C1/C3 subphases; and
- `source-only/quarantined` disposition with authority `none` for every entry.

All 55 generations were reverified live immediately before landing with no
mismatches or unexpected owned open PRs. The focused reconstruction and
source-ledger suite passes seven tests. This inventory does not admit,
cherry-pick, build, release, or execute any source. Landing proof:
`https://github.com/giodl73-repo/openclaw/pull/204#issuecomment-5161346445`.

The protected `lobster/integration` branch and clean Windows operator checkout
now both resolve to `e197147c4403a9b5aed60f43f8a28b03ed6f0fe9`.
