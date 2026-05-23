---
doc: R3-claws-release-eng
round: 3
panel: cp-3-fork-prep
reviewer: claws-release-eng
created: 2026-05-04
---

# R3 — claws-release-eng review

## Ship-readiness frame

Five substrates targeted at upstream `openclaw/openclaw` (`@openclaw/oc-path`,
`@openclaw/oc-lint`, `@openclaw/oc-doctor`, `@openclaw/lkg`, `@openclaw/policy`).
Tests are green at the expected counts (743 / 462 / 537 / 124 / 124). Toolchain
is uniform. The contract additions in cp-3 (`siblingFiles`, `Promise<T>` return,
`tier` field) land cleanly on a v0.1.0 first-ship, so they don't trigger semver
breakage — they ship as the initial public surface.

What is **not** ready: dist hygiene. Two packages have stale dist trees that
omit subpaths declared in their own `exports` map. One package has a leftover
dist directory from a deleted source path. These are not "release-notes-worthy"
warnings — they're install-time `ERR_PACKAGE_PATH_NOT_EXPORTED` / `ERR_MODULE_NOT_FOUND`
landmines for the first external consumer. From this seat, that's a BLOCK on
landing the upstream PR with `prepublishOnly`-style assumptions; either the
upstream build script regenerates dist on every publish (then we're fine), or
we ship dists in-tree (then they must be current and complete). cp-3 needs to
pick one and prove it before tagging.

Top-level finding: every advertised `exports` subpath must have a real
artifact behind it before this contract is locked in. If we ship `@openclaw/lkg/cli`
in the README and the dist doesn't contain `dist/cli/index.js`, that's the
worst kind of broken — it install-resolves silently and explodes on first
import. That's exactly the failure mode this seat exists to catch.

---

## Per-substrate findings

### 1. `@openclaw/oc-path` (oc-paths-substrate)

- **CI sanity**: `build`/`test`/`lint`/`test:coverage` scripts present and
  consistent with peers. PASS.
- **Toolchain**: vitest ^4.0.0, typescript ^5.0.0, @types/node ^20, node>=20.
  Aligned with peers. PASS.
- **`bin`**: declares `openclaw-path` → `./bin/openclaw-path.mjs`. File present.
  PASS.
- **`files`**: `["dist", "bin"]`. Correct. PASS.
- **`exports`**: `.`, `./oc-path`, `./cli`, `./workspace`, `./package.json`.
  All resolve to existing dist paths (`dist/index.js`,
  `dist/plugin-sdk/oc-path/index.js`, `dist/cli/index.js`,
  `dist/plugin-sdk/oc-path/workspace/index.js`). PASS.
- **`SDK_VERSION`**: re-exported via `export * from './plugin-sdk/oc-path/index.js'`.
  Value `'0.1.0'`. PASS.
- **Tests**: 743 passing / 9 skipped — matches expected. PASS.
- **NIT**: `dependencies.yaml ^2.8.4` is a real runtime dep; the description
  calls this a "PR-1 prototype" but the runtime dep is fine for an in-tree
  prototype. No action needed.

### 2. `@openclaw/oc-lint` (pinch)

- **CI sanity**: scripts uniform with peers. PASS.
- **Toolchain**: aligned. PASS.
- **`bin`**: `openclaw-lint` → `./bin/openclaw-lint.mjs`. File present.
  Rename from `pinch.mjs` is clean — grep for `pinch.mjs` across the repo
  returns no hits. PASS.
- **`files`**: `["dist", "bin"]`. PASS.
- **`exports`**: `.`, `./plugin-sdk`, `./runner`, `./rules-starter`,
  `./test-harness`, `./cli`, `./package.json`. All resolve to extant dist
  paths. PASS.
- **WARN — stray dist tree `dist/extensions/oclint-rules-claws/`**: this
  directory is in `dist/` but has **no corresponding source** under
  `src/extensions/` (only `oclint-rules-jsonc-starter`,
  `oclint-rules-jsonl-starter`, `oclint-rules-lobster-yaml-starter`,
  `oclint-rules-starter` exist in `src/extensions/`). It's leftover from a
  pre-rename build. `npm pack` will ship it because `files: ["dist", "bin"]`
  doesn't filter, and it's both dead weight and a confusing public surface
  (it isn't declared in `exports` so it's reachable only via deep import,
  which we don't want to bless). Action: `rm -rf dist/` and rebuild before
  the cp-3 PR is tagged.
- **`SDK_VERSION`**: re-exported. `'0.1.0'`. PASS.
- **Tests**: 462 / 462 — matches. PASS.

### 3. `@openclaw/oc-doctor` (oc-paths-doctor)

- **CI sanity**: scripts uniform. PASS.
- **Toolchain**: aligned. PASS.
- **`bin`**: NO `bin` declared, NO `bin/` dir present. Consistent with intent
  (oc-doctor is a library + adapter, not a CLI). PASS — but worth flagging
  to the upstream review that the asymmetry is deliberate.
- **`files`**: `["dist"]` (no `"bin"` key). Correct given no bin. PASS.
- **`exports`**: `.`, `./plugin-sdk`, `./fixers-starter`, `./test-harness`,
  `./package.json`. All resolve. PASS.
- **`SDK_VERSION`**: exported at `'0.1.0'`. PASS.
- **Contract surface (cp-3 additions)**: `OcPathFixerSpec` in
  `types.ts` carries optional `tier?: FixerTier`, `detect()` and `fix()`
  both accept `siblingFiles?: readonly DoctorFile[]`, both return
  `T | Promise<T>`. The adapter at `adapter.ts` correctly defaults
  unset `tier` to `'mutating'`, gates by `ctx.enabledTiers`, and awaits
  detect/fix results. `index.ts` re-exports `FixerTier`,
  `ocPathFixerContribution`, `checkSdkCompat`. **All three additions are
  contract-consistent across types/adapter/index re-exports.** PASS.
- **Tests**: 537 / 537. PASS.

### 4. `@openclaw/lkg` (lkg-recovery-substrate) — **BLOCK**

- **CI sanity**: scripts uniform. PASS.
- **Toolchain**: aligned. PASS.
- **`bin`**: `openclaw-lkg` → `./bin/openclaw-lkg.mjs`. Present. PASS.
- **`files`**: `["dist", "bin"]`. PASS.
- **`exports`**: declares `.`, `./plugin-sdk`, `./fs`, `./test-harness`,
  `./trackers`, `./cli`, `./lint-rules-starter`, `./doctor-fixers-starter`,
  `./package.json` — **9 subpaths**.
- **BLOCK — dist is stale and missing five of those subpaths**. Source
  exists at `src/cli/index.ts`, `src/trackers/index.ts`,
  `src/test-harness/index.ts`, `src/extensions/lkg-lint-rules-starter/index.ts`,
  `src/extensions/lkg-doctor-fixers-starter/index.ts`, but the corresponding
  `dist/` paths do not exist. Only `dist/index.js`, `dist/plugin-sdk/lkg/`,
  and `dist/extensions/lkg-fs/` are emitted. Anyone who hits
  `import x from '@openclaw/lkg/cli'` will get
  `ERR_MODULE_NOT_FOUND` at consume-time even though the package
  install-resolves cleanly. Root cause is an out-of-date dist on disk;
  `npm run build` will fix it.
- **`SDK_VERSION`**: re-exported, `'0.1.0'`. PASS.
- **Tests**: 124 / 124. PASS.
- Action: rebuild before publish; add a CI gate that fails if any `exports`
  subpath doesn't resolve to a real file in `dist/`.

### 5. `@openclaw/policy` (policy-substrate) — **BLOCK**

- **CI sanity**: scripts uniform. PASS.
- **Toolchain**: aligned. PASS.
- **`bin`**: `openclaw-policy` → `./bin/openclaw-policy.mjs`. Present. PASS.
- **`files`**: `["dist", "bin"]`. PASS.
- **`exports`**: declares `.`, `./plugin-sdk`, `./extractors-starter`,
  `./lint-rules-starter`, `./doctor-fixers-starter`, `./cli`,
  `./package.json`.
- **BLOCK — dist is stale**. `dist/extensions/policy-lint-rules-starter/`
  and `dist/extensions/policy-doctor-fixers-starter/` are absent
  even though the source dirs exist (verified at
  `src/extensions/policy-lint-rules-starter/index.ts` and
  `src/extensions/policy-doctor-fixers-starter/index.ts`). Same install-time
  failure mode as lkg.
- This is also the package the user flagged for cross-package typecheck
  break: if oc-doctor's dist drifts, policy-substrate's `lint` script
  (`tsc --noEmit`) fails because it pulls types from `@openclaw/oc-doctor`'s
  emitted `.d.ts`. Currently oc-doctor's dist is current, so the typecheck
  is clean — but this is exactly the brittleness the cross-package coupling
  introduces.
- **`SDK_VERSION`**: re-exported, `'0.1.0'`. PASS.
- **Tests**: 124 / 124. PASS.
- Action: rebuild policy-substrate; consider adding a workspace-level
  `pretest`/`prebuild` step that builds upstream deps in topological order.

---

## Cross-cutting CI / version concerns

1. **No `prepublishOnly` script** in any of the five `package.json` files.
   For an upstream contribution this is fine (they consume sources), but
   if any of these packages ever publishes from this repo, install-time
   consumers will get whatever `dist/` happened to be on disk at pack time.
   Either we explicitly disclaim "these are upstream-only, never published
   from claws" — or we add `"prepublishOnly": "npm run build"` as a
   safety net. **WARN** for upstream review-readiness; the upstream
   maintainer will ask.

2. **No `publishConfig`** anywhere. All five are `private: true`, which
   prevents accidental `npm publish` to public — that's correct for a
   prototype tree. But it also means these can't go to GPR without a
   config flip. **NIT** — document in the cp-3 PR that publish is
   upstream's job after merge.

3. **Dependency version pinning at `"*"`**. All four cross-substrate deps
   (`@openclaw/oc-path`, `@openclaw/oc-lint`, `@openclaw/oc-doctor`,
   `@openclaw/lkg`) are pinned to `"*"`. Inside the workspace this is fine
   because npm hoists the local copy. Upstream this becomes a published
   semver-range concern. **WARN** — upstream will pin to `^0.1.0` on
   landing, but our PR should pre-pin to the same value to avoid a
   reviewer round-trip.

4. **`tsconfig.build.json` is uniform across all five** (extends, rootDir,
   excludes node_modules + dist + tests). PASS — no skew here.

5. **No `.npmrc` or registry config in package.json**. PASS for upstream
   intent; flag if any of these ever flips to `private: false`.

6. **`dist/` is committed to the repo** (no `.gitignore` exclusion that
   I can see across the changed files). For upstream contribution this
   is unusual — most packages build dist on consume. Either we strip
   dist before opening the PR or upstream's CI must rebuild. **WARN** —
   ask the upstream maintainer's preference; my prior is "strip dist,
   let CI rebuild".

7. **No install-smoke test exists** for any of these five. From this
   seat that's expected for an upstream-targeted prototype — smoke is
   the consuming repo's concern. NIT only if we ever publish.

---

## Ask list

To clear BLOCK before cp-3 PR opens:

- [ ] **(BLOCK)** Rebuild `lkg-recovery-substrate/dist/` so all 9 declared
      `exports` subpaths resolve (`cli`, `trackers`, `test-harness`,
      `lint-rules-starter`, `doctor-fixers-starter` are currently missing).
- [ ] **(BLOCK)** Rebuild `policy-substrate/dist/` so
      `lint-rules-starter` and `doctor-fixers-starter` resolve.
- [ ] **(BLOCK)** `rm -rf packages/pinch/dist && npm run build -w @openclaw/oc-lint`
      to drop the stale `dist/extensions/oclint-rules-claws/` tree
      (no source backs it; it ships dead weight if left).

To clear WARN before publish-readiness conversation with upstream:

- [ ] **(WARN)** Decide: ship dists in-tree, or rely on upstream CI rebuild?
      Document the choice in the cp-3 PR description.
- [ ] **(WARN)** Pre-pin cross-substrate `dependencies` from `"*"` to
      `"^0.1.0"` to match what upstream will demand at merge.
- [ ] **(WARN)** Add `"prepublishOnly": "npm run build"` to all five
      `package.json` files as belt-and-suspenders before any future
      publish from this repo.

NITs (record, don't gate):

- [ ] (NIT) `oc-doctor` has no `bin`/`bin/` dir — consistent with intent
      (library), but call out in the upstream PR so reviewers don't ask.
- [ ] (NIT) None of the five have install-smoke or dogfood tests; expected
      for an upstream prototype, but track the gap if any ever publishes
      from claws directly.
- [ ] (NIT) Add a CI check that walks each `package.json`'s `exports` map
      and verifies every advertised file resolves on disk. This catches
      the BLOCK class above automatically and is a 30-line script.

Status: **conditional ship**. Three BLOCKs are all "rebuild dist", which
is one `npm run build` per package. Test counts and contract surface are
solid. Once the dist trees are current, this clears my seat for cp-3 fork-prep.
