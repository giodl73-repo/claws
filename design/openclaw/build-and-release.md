---
name: build-and-release
description: openclaw build + release plumbing — tsdown bundler, pnpm workspace, lane-based testing, Sparkle/appcast, version-bump checklist, beta tag rule, CI workflows, release flow
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Build and release plumbing

## Bundler — tsdown

`tsdown.config.ts`. Multi-config Node.js bundler:

- Unifies core entrypoints, plugin-SDK subpaths, and bundled-plugin entrypoints into one dependency graph (reducing runtime singletons to once-per-graph).
- Produces CommonJS bundles in `dist/` with stable filenames for lazy runtime boundaries (`agents/auth-profiles.runtime.js`, `plugins/provider-runtime.runtime.js`, …).
- Suppresses known harmless eval warnings (protobufjs, bottleneck Redis connections) via `onLog` filtering.
- Builds **staged bundled-plugin dependencies** separately under `dist/extensions/<id>/` when those plugins declare `stageRuntimeDependencies: true` in their `package.json`.
- Guards against bundling forbidden deps (`@lancedb/lancedb`, Matrix crypto, bundled plugin runtime deps) via `neverBundle` predicates.

Output keys: `plugin-sdk/<entry>` for SDK exports, `bundled/<name>/handler` for bundled hooks.

## pnpm workspace

`pnpm-workspace.yaml`:

- `.` — root OpenClaw package
- `ui/` — Control UI
- `packages/*` — internal reusable packages
- `extensions/*` — bundled plugins + channels

**`apps/*` is NOT a pnpm workspace.** Android/iOS/macOS apps live under
`apps/` but maintain separate build systems (Gradle, Xcode, fastlane).

`minimumReleaseAge: 2880` (48 hours) gates auto-publish of dependency
updates. Critical paths exempt: `acpx`, `openclaw`, core types, immediate
upstream (Axios, Hono, Vite).

## Build scripts

| Script | Purpose | Pre-push? |
|---|---|---|
| `pnpm build` | Full release: canvas bundle → tsdown → plugin-SDK types → post-build hooks → artifacts | **yes** |
| `pnpm check` | Fast gate: conflict markers, changelog attributions, typecheck (prod), lint, import cycles | **yes** |
| `pnpm check:changed` | Lane-scoped: detect touched areas, run only needed tasks | **yes** |
| `pnpm check:architecture` | Full import-cycle + boundary checks (slower) | release only |
| `pnpm test` | Full Vitest matrix (unit, contracts, e2e, live, Docker) | CI |
| `pnpm test:changed` | Changed-lane Vitest | CI |

Release preflight (`docs/reference/RELEASING.md:64-65`):

```bash
pnpm check:test-types
pnpm check:architecture
pnpm build && pnpm ui:build
pnpm release:check
```

## Lane-based testing

`scripts/check-changed.mjs` and `changed-lanes.mjs`:

1. **Git diff** vs `origin/main` → touched files.
2. **Lane classification:**
   - `releaseMetadata` (`package.json` version, `CHANGELOG.md`) → version-bump checks.
   - `core` (touched core source) → all checks/tests.
   - `extensions/*` (touched extension) → only that extension's tests.
   - `docs`, `skills` — isolated lanes.
   - Mixed → smart scoping (e.g., touched provider config → provider tests only).
3. **Smaller lane wins.** `check:changed` skips full architecture + import-cycle by default; `check:test-types` is explicit for release gating.

Prevents rebuilding the test matrix for a README touch.

## Sparkle / appcast.xml

`appcast.xml` (root) is an RSS 2.0 feed with Sparkle 2.0 extensions for
the macOS auto-updater.

```xml
<rss xmlns:sparkle="...">
  <channel>
    <item>
      <title>2026.4.26</title>
      <pubDate>...</pubDate>
      <sparkle:version>2026042690</sparkle:version>           <!-- numeric build id -->
      <sparkle:shortVersionString>2026.4.26</sparkle:shortVersionString>
      <enclosure url="https://github.com/.../releases/download/.../OpenClaw-2026.4.26.zip"
                 sparkle:edSignature="..."/>
    </item>
  </channel>
</rss>
```

**Stable releases only.** `scripts/make_appcast.sh`:

1. Take signed macOS `.zip` artifact.
2. Sign with Sparkle's ed25519 key via `generate_appcast` (Sparkle binary).
3. Merge into existing feed, prepending the new release.

Pushed to `main` as part of stable release finalization
(`RELEASING.md:83`). **Beta releases skip appcast.**

## Version-bump checklist

| File | Why |
|---|---|
| `package.json` (root) | npm registry source of truth |
| `apps/android/app/build.gradle.kts` | Android `versionCode` / `versionName` |
| `apps/ios/version.json` | iOS `CFBundleVersion`. Run `pnpm ios:version:sync` to propagate to Xcode. |
| `apps/macos/Info.plist` | macOS `CFBundleVersion` |
| `docs/install/updating.md` | User-facing min/recommended version anchors |
| `appcast.xml` | **Stable only** (skipped for beta) |

Skipping one platform leaves an update lane broken or vulnerable to
downgrade.

## Beta tag rule

Format: `vYYYY.M.D-beta.N`:

- `YYYY.M.D` = calver, no zero-padding (April 1 = `.4.1`, not `.04.01`).
- `beta.N` = monotonic prerelease counter (`.beta.1`, `.beta.2`, …).
- **Never delete or rewrite a published beta.** Cut the next `-beta.N`.

Published to npm `beta` dist-tag. Vetted beta → stable publish reuses
the successful preflight artifact and can target `latest` explicitly
(defaults to `beta` for safety).

## Publishing surfaces

| Surface | Trigger | Notes |
|---|---|---|
| npm `openclaw@YYYY.M.D` / `@beta` | Git tag `v*` → `OpenClaw NPM Release` | OIDC auth (no token); tarball with `dist/` + `skills/` + bundled plugins |
| Bin `openclaw` CLI | npm install; shimmed via `openclaw.mjs` | Loaded from npm tarball |
| Docker (GHCR) | Tag push → `docker-release.yml` | amd64 + arm64; slim + full variants; tags by version |
| macOS app (private) | Private `openclaw/releases-private` repo | Signs, notarizes, uploads to GitHub release. Public `macos-release.yml` validates only. |
| Appcast (Sparkle feed) | Manual commit to `main` after stable zip signed | Stable only |

## CI workflows

### `ci.yml` — every push/PR

- Preflight detects changed scopes (core, docs, extensions, etc.).
- Matrix jobs: Linux Node shards (Vitest unit/contracts/e2e), bundled-plugin shards, channel contracts, macOS Swift (Xcode), Android Gradle, Windows .NET, Control UI i18n, build smoke, type checks.

### `docker-release.yml` — tag push only

- Validates `v*` tag format.
- Builds amd64 + arm64 in parallel.
- Pushes to GHCR with multi-arch manifest.
- Tags: `main` → `:main-slim-amd64`; releases → `:YYYY.M.D-slim-amd64`.

### `macos-release.yml` — manual dispatch (validation only in public repo)

- Validates tag exists as a GitHub release.
- Builds JS + Control UI.
- Checks release metadata.
- **Does not sign/notarize** — that's in `releases-private`.

### `full-release-validation.yml` — manual dispatch (orchestrator)

- Fans out all release test boxes from one entry.
- Dispatches: `CI`, `OpenClaw Release Checks`, optional Telegram post-publish.
- Accepts branch/tag/SHA, `release_profile` (`minimum` / `stable` / `full`), provider, mode.
- Returns consolidated results with slowest-job tables for critical-path analysis.

### `package-acceptance.yml` — manual dispatch (product validation)

- Resolves a package candidate from npm, git ref, URL, or GitHub artifact.
- Runs Docker lanes specific to installable product (package/update/plugin contracts).
- Optional Telegram QA against the tarball.
- Reused by `OpenClaw Release Checks` to avoid rebuilding the same tarball twice.

### `openclaw-npm-release.yml` — manual dispatch (real publish)

- **Preflight phase:** builds tarball, validates Control UI bundle, checks pack-size budget.
- **Publish phase:** requires successful `preflight_run_id`, promotes the tarball from that run.
- Dist-tag defaults `beta`; can target `latest` explicitly.
- Post-publish: separate script verifies registry install in temp prefix.

## Release flow — "ready" to "shipped"

1. **Prepare branch** — `release/YYYY.M.D` from current `main`; pull latest, confirm green CI.
2. **Rewrite CHANGELOG** — top section from real commits via `/changelog` command; commit, push, rebase.
3. **Review compat** — `src/plugins/compat/registry.ts`, `src/commands/doctor/shared/deprecation-compat.ts` — remove expired entries only when upgrade path is covered.
4. **Bump all versions** — edit all six files (above); commit.
5. **Local preflight** — `pnpm check:test-types && pnpm check:architecture && pnpm build && pnpm ui:build && pnpm release:check`.
6. **Preflight run** — `gh workflow run openclaw-npm-release.yml --ref main -f tag=v<SHA> -f preflight_only=true`.
7. **Full validation** — `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D -f release_profile=stable`; waits for CI + Release Checks + QA Lab.
8. **Beta** — tag `vYYYY.M.D-beta.N`, publish with `npm_dist_tag=beta`, run post-publish Telegram E2E.
9. **Stable** — only after vetted beta; publish with saved `preflight_run_id`, reuse same dist-tag; download appcast, commit to `main`.
10. **Post-publish** — verifier script in temp prefix; promote to `latest` if needed (private dist-tags workflow); publish GitHub release notes from CHANGELOG.

## Footguns

| Mistake | Impact | Prevention |
|---|---|---|
| Skip version bump in one file (e.g., iOS only) | Platform update trap; user upgrades npm but iOS launcher is stale | Checklist; CI should validate all six files match |
| Delete/rewrite published beta tag | npm registry inconsistency; clients can't fetch old beta | Cut next `beta.N` instead; never `git push --force` |
| Commit appcast to release branch instead of `main` | Auto-updater points at wrong release | Appcast lands on `main` *after* stable publish; check git log |
| Forget `pnpm ui:build` before release | Control UI dashboard stale, breaks release checks | Mandatory in preflight; CI enforces via `dist/control-ui/assets/` budget check |
| Use `latest` dist-tag too early | Stable version lands on `latest` before validation | Workflow defaults to `beta`; explicit `latest` requires operator input + code review |
| Leave GitHub draft release half-written | Release incomplete; users miss notes | Use `Full Release Validation` output to auto-populate notes from CHANGELOG |

## Files I'd link from any release PR

1. `tsdown.config.ts` — bundler config + dependency guards.
2. `docs/reference/RELEASING.md` — full public release checklist.
3. `.github/workflows/openclaw-npm-release.yml` — npm publish + preflight/promotion.
4. `.github/workflows/full-release-validation.yml` — release-test orchestrator.
5. `scripts/check-changed.mjs` — lane detection.
6. `scripts/make_appcast.sh` — Sparkle feed generation.
7. `pnpm-workspace.yaml` — workspace + minimum-release-age policy.

## Read next

- [`cli.md`](cli.md) — `pnpm openclaw` + `pnpm build` developer-facing entry.
- [`daemon-lifecycle.md`](daemon-lifecycle.md) — Sparkle-updated macOS app + LaunchAgent supervision.
- [`apps-and-swabble.md`](apps-and-swabble.md) (pending) — version-bump targets in apps/.
