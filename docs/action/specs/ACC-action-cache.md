# ACC — Action cache

**Sub-spec of**: [AC-action.md](./AC-action.md)

## Cache key

Keyed on `sha256(workspace-tarball-canonical-bytes)`:

1. Collect all files under the workspace root via a stable
   deterministic listing (same ordering as `WSE-emitter`)
2. Concatenate them into a tarball with fixed metadata
3. Compute SHA-256 of the tarball bytes
4. Use this hash as the cache key

A cache hit means: the workspace content is byte-identical to a
prior run. The prior run's policy IR + validation findings are
returned directly; no re-compile needed.

## Scope

Cache is keyed per-repo-per-branch via the GitHub Actions cache
scope. PRs against `main` share cache with `main`'s cache; PRs
against feature branches have their own scope.

## Invalidation

Cache invalidates automatically on:

- Any workspace content change (hash changes)
- Claws version bump (the action declares its claws version as part
  of the key)
- Fleet binding change (hash of fleet file is included)

Manual invalidation: delete the cache entry via GitHub Actions UI
or expire-on-push via the `invalidate-cache` input.

## What's NOT cached

- Audit chain contents (rewrites on every promote)
- Trust-set state (per-run)
- Runtime enforcement state (per-request)

Only the compile-time outputs cache — validation findings, compiled
policy IR, and the derived diagnostics.

## Cache size

Typical workspace: 1-10 KB of policy IR. A busy repo with many PRs
uses ~100 MB. GitHub Actions default cache budget is 10 GB per repo,
so this is well within range.
