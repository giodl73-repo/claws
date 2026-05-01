# Git-backed LKG — design + open question for Ryan

**Date**: 2026-04-30
**Context**: team wants git as the LKG backend behind OneDrive (via Ryan's
rclone+FUSE mount) so the agent's commits and changes are tracked with
proper history, diffs, and merge semantics.

## Question for Ryan (gating)

**Does rclone's FUSE mount preserve `flock(2)` semantics on `.git/index`?**

git serializes concurrent operations against a repo by `flock`-ing
`.git/index` (and `.git/packed-refs`, `.git/HEAD` for ref ops). On a
local POSIX filesystem this works. On a FUSE mount that proxies to
OneDrive's Graph API, advisory file locks may not propagate.

If `flock` is not preserved:
- Two `git commit`s racing across the mount can corrupt the index
- Even single-process git is at risk if rclone's pack-file sync
  intervenes mid-commit

If `flock` IS preserved:
- The git backend is straightforward: same as local-disk git, but on
  a FUSE mount
- We still want to serialize observe() calls within a single process
  (cheap mutex), but cross-process safety comes from git itself

Mitigations if flock isn't preserved:
1. Coordinator process (one writer per repo) — adds an architectural
   layer
2. Use a sidecar state file outside the mount — defeats the purpose
3. Operate against a local clone with periodic push to OneDrive —
   doable but doubles the storage and adds sync logic

## Design — assuming flock works

### Package layout

```text
packages/openclaw-lkg-git/
├── src/
│   ├── git-cmd.ts            execFile wrappers, no shell injection
│   ├── git-lkg-store.ts      gitLKGStore({ repoRoot, authorship, branch? })
│   └── index.ts
├── tests/
│   ├── git-lkg.unit.test.ts
│   └── git-lkg.integration.test.ts
└── package.json
```

Depends on `@bic/openclaw-lkg` for type re-exports + `@bic/v2-prototype`
for the contract. No other runtime deps — shells out to `git` directly
via `child_process.execFile` for auditability.

### Mapping LKG → git

| `LKGStore` operation | Git backend implementation |
|----------------------|----------------------------|
| `register(tracker)` | Validate `repoRoot` is a git repo; verify tracker path is under repoRoot; verify path is not gitignored. Store in-memory. |
| `observe(path)`     | Read file → parse → validate → branch on outcome. |
| `readLastKnownGood(path)` | `git show HEAD:<relpath>` → bytes |
| `getEntry(path)`    | Derive `lastPromotedGood.hash` from `git ls-tree HEAD <relpath>` (the blob sha). Other fingerprint fields nullable. |

### Observe state machine (git-backend specifics)

```text
   read raw bytes
        ↓
   parse → validate
        ↓
   ┌────────────────────────────────────────────────────────┐
   │  Cases (mirrors FS impl, mapped to git)                │
   ├────────────────────────────────────────────────────────┤
   │  valid + git diff --quiet HEAD -- <path>               │
   │  → outcome 'valid' (no commit)                          │
   ├────────────────────────────────────────────────────────┤
   │  valid + content changed vs HEAD                        │
   │  → git add <path>                                       │
   │    git -c user.name=... -c user.email=... commit \      │
   │      -m "lkg(promote): <tracker.path> @<blobSha>"       │
   │  → outcome 'promoted', fingerprint.hash = blobSha       │
   ├────────────────────────────────────────────────────────┤
   │  invalid (shouldRecover != false)                       │
   │  → cp <path> <path>.clobbered.<ts>                      │
   │    git checkout HEAD -- <path>                          │
   │  → outcome 'recovered', clobberedPath = <path>.clobb..  │
   ├────────────────────────────────────────────────────────┤
   │  invalid + shouldRecover === false (plugin-local)       │
   │  → outcome 'skipped'                                    │
   ├────────────────────────────────────────────────────────┤
   │  suspicious-vs-LKG (validates parses but heuristic fails)│
   │  → same as invalid+recover; signature deduplication     │
   └────────────────────────────────────────────────────────┘
```

### Authorship

Authorship per commit is configurable on store construction:

```ts
gitLKGStore({
  repoRoot,
  authorship: {
    name: 'openclaw-agent',
    email: 'agent@<tenant>.onmicrosoft.com',
  },
});
```

Production hosts should pass an Agent365-attested identity; tests pass
deterministic strings. Set per-commit via `-c user.name=... -c user.email=...`
to avoid mutating the repo's `.git/config`.

### Branch strategy

Default: commit to current `HEAD`. Optional `branch: 'openclaw/lkg'`
to commit on a separate branch (probably wanted for production where
the user's working branch shouldn't be polluted with LKG commits, but
deferred to a follow-up — adds complexity around branch sync that
requires its own design).

### Concurrency model (assuming flock works)

- **In-process**: per-repo mutex around `observe()`. We serialize git
  invocations to the same repo even if multiple trackers fire
  simultaneously. Reentrancy: `observe(A)` then `observe(B)` are
  separate commits.
- **Cross-process on the same machine**: rely on git's `.git/index.lock`.
- **Cross-machine via OneDrive**: assumed safe via flock if rclone
  preserves it. If not, sequential per-tenant via coordinator.

### What gets committed

Every promote produces ONE commit per tracker per change. Coalescing
multiple trackers into one atomic commit is a future enhancement
(`observeBatch([paths])`) — out of scope for v1.

Commit messages are structured for grep + machine parsing:

```
lkg(promote): /abs/path/to/policy-ir.json @<blobsha>
lkg(recover): /abs/path/to/policy-ir.json reason=invalid clobbered=<path>
```

The audit sink still receives the structured `AuditRecord` for
operators that want a non-git-log surface.

### What stays in-memory (host concern)

- `lastObservedSuspiciousSignature` per tracker — for dedup. Doesn't
  need persistence (signature recurs naturally). If the process
  restarts, we'd accept a duplicate recovery for the same suspicious
  pattern — acceptable.
- The tracker registration map (paths → validators).

### Testing strategy

- **Unit**: `git-lkg.unit.test.ts` exercises the state machine on a
  local tmp git repo with deterministic authorship + `now()`.
  Covers: first-promote, idempotent re-promote, invalid-recover,
  suspicious-vs-LKG, plugin-local skip, no-LKG fail, missing path.
- **Integration**: `git-lkg.integration.test.ts` covers the on-disk
  shape: clobbered file naming on Windows (no colons in suffix),
  cross-process via subprocess, branch validation.
- **E2E** (shared with the team via the existing v2-prototype e2e
  pattern): wire `gitLKGStore` into `buildPolicyPluginFromLKG` and
  prove the full chain composes — agent writes bad PolicyIR, LKG
  recovers from git HEAD, policy plugin sees the recovered version.

### What this means for the upstream pre-RFC

The pre-RFC (`v2-lkg-contract.md`) doesn't need to change. The
contract is impl-agnostic. This work *strengthens* the pre-RFC by
proving the contract supports two genuinely different backends (FS
companion files + git history). Adds a paragraph:

> "The contract is intentionally impl-agnostic. Reference impls
> shipping today: a filesystem-backed `lkgStore` (companion `.lkg` +
> `.clobbered.<ts>` files, mirroring the existing config-LKG shape)
> and a git-backed `gitLKGStore` (commits in a backing repo;
> `lastPromotedGood` is HEAD's blob sha for the path). Both satisfy
> the same LKGStore contract; consumers don't see which is wired."

### Multi-agent OneDrive bonus

Worth calling out explicitly to the team:

> "git's three-way merge is the answer to the rclone last-writer-wins
> concern (Ryan's note 2026-04-29) for shared-workspace-files
> use cases. With git as the LKG backend on a OneDrive-mounted repo,
> two agents writing the same file produce conflict markers, not
> silent overwrite. This addresses upstream issue #40245 (shared
> workspace dir) without solving #29947 (concurrent same-file race) —
> different problems."

## Implementation plan (executed in this session)

1. ✅ Memo (this file)
2. Create `packages/openclaw-lkg-git/`
3. Implement `gitLKGStore` (~300 LoC)
4. Unit tests for the state machine (~10 tests)
5. Integration test with a real git repo (~5 tests)
6. E2E test wiring `gitLKGStore` + `buildPolicyPluginFromLKG` end-to-end
7. Commit and link from this memo
