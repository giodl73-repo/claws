Closes #123690

## What Problem This Solves

The shipped Linux desktop app has a tracked Cargo manifest and lock, but
OpenClaw's automated dependency updates do not currently cover that Rust graph.

## Why This Change Was Made

Adds a dedicated daily Cargo updater for `/apps/linux/src-tauri`, following the
repository's existing two-day cooldown and grouped minor/patch update pattern.
The change is intentionally limited to the shipped Linux app rather than
including experimental Rust manifests.

## User Impact

No direct user-visible change. Linux and security maintainers receive routine,
reviewable update PRs for the app's Rust dependencies.

## Evidence

- Confirmed `apps/linux/src-tauri/Cargo.toml` and `Cargo.lock` are tracked.
- Parsed `.github/dependabot.yml` with the repository's installed `yaml`
  package.
- Confirmed the new updater resolves to Cargo directory
  `/apps/linux/src-tauri`.
- Confirmed `cooldown`, grouping, and `update-types` are supported Dependabot
  options for Cargo in the current GitHub documentation.
- `git diff --check`
