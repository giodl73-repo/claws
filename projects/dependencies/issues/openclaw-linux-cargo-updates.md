## Summary

Add an explicit automated update path for the shipped Linux app's Cargo
dependencies.

## Problem to solve

The Linux Tauri app has a tracked Rust manifest and lock at
`apps/linux/src-tauri`, and the Linux app workflow builds and caches that exact
Cargo graph. OpenClaw's Dependabot configuration covers npm, GitHub Actions,
Swift, Gradle, and Docker, but not Cargo.

Rust dependency updates therefore depend on manual discovery even though this
is a shipped application surface.

## Desired outcome

The Linux app Cargo graph receives routine automated dependency-update PRs with
Linux build/test evidence and normal owner review.

The maintainers can choose Dependabot Cargo coverage or another explicit
owner-reviewed updater. Experimental Rust manifests can remain separately
owned; this issue is specifically about `apps/linux/src-tauri`.

## Alternatives considered

- Include Cargo only in periodic manual audits: slower detection and no
  continuous ownership signal.
- Cover every experimental Rust manifest in the same lane: unnecessary for the
  first shipped-surface fix.

## Impact

Affected: Linux app, release, and security maintainers.

Severity: medium. The reviewed graph includes old GTK/Tauri-era dependencies
that require deliberate migration, but routine compatible updates should not
wait for another full audit.

Frequency: whenever a compatible Rust dependency update is published.

## Evidence

Verified on OpenClaw `main` at
`493a3e46b3f2921269cfb0af5dfc86efb569ceaa`:

- `apps/linux/src-tauri/Cargo.toml` and `Cargo.lock` are tracked;
- `.github/workflows/linux-app.yml` builds and caches that lock; and
- `.github/dependabot.yml` has no Cargo update entry.

## Implementation intent

Yes, I plan to implement this myself.
