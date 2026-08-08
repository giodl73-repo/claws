# R1 Review: Craftworks Package Extraction — Platform-eng Lens

**Role**: claws/platform-eng
**Cluster**: D (Fleet consistency > Workspace autonomy)
**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 1

## Orientation

Evaluating whether 25 extracted packages create fleet management headaches — version drift across 47 workspaces, upgrade complexity, CI/CD pipeline brittleness, and whether `claws broadcast` and `claws drift` still function correctly when the dependency tree fragments.

## Findings

### F01 — Version drift across 25 packages in 47 workspaces is a fleet nightmare [M]

**Severity**: Must-address
**Category**: Fleet consistency

Today, `claws doctor --post-upgrade --fleet` upgrades one package (compiler-sdk or agent-sdk) across 47 workspaces. After extraction, it potentially upgrades 25 packages, each with independent semver. Workspace A might be on @craftworks/oc-readers@2.1.0 while workspace B is on @2.0.3. Multiply by 25 packages and 47 workspaces and drift detection becomes combinatorial. `claws drift` currently checks a handful of versions. Checking 25 x 47 = 1,175 version cells per fleet scan is a different problem entirely.

**Recommendation**: Extracted packages must ship with a compatibility manifest — a lockfile-like artifact that declares "these 25 versions were tested together." `claws drift` checks against the manifest, not individual package versions. This is effectively a distro model: @craftworks/platform@2.1 = {oc-readers@2.1.0, crypto@1.3.2, ...}. Without this, fleet management is untenable.

### F02 — `claws broadcast` push semantics change with 25 packages [M]

**Severity**: Must-address
**Category**: Fleet operations

`claws broadcast` pushes policy updates to all workspaces. Currently it updates a few files. After extraction, a policy change might touch @craftworks/governance-primitives, which has downstream consumers in @craftworks/governance-runtime, @craftworks/compilation-host, and ultimately in @claws/compiler. Broadcasting a governance change means upgrading a dependency chain, not just copying a file. The broadcast mechanism must understand transitive dependency impact.

**Recommendation**: Define a "broadcast surface" — which packages are policy-carrying and which are implementation-only. Only policy-carrying packages (governance-primitives, governance-runtime, audit-chain) participate in broadcast. The other 20+ packages are upgraded through normal npm update cycles, not broadcast.

### F03 — CI/CD pipeline (`claws pinch --ci`) needs per-package or bundle strategy [M]

**Severity**: Must-address
**Category**: CI/CD

`claws pinch --ci` runs in every PR today. After extraction, does it validate against 25 packages individually or against the SDK bundle? If individual packages: CI time multiplies. If bundle: we lose the granularity the extraction is supposed to provide. The plan's test tier targets (50 L0, 25 L1, 10 L2, 5 L3) don't specify how they distribute across 25 packages or how CI orchestrates them.

**Recommendation**: Keep CI running against the SDK bundles (compiler-sdk, agent-sdk) for fleet consumers. Package-level CI is for package maintainers only. Fleet consumers should never need to think about individual package test results.

### F04 — Monthly fleet upgrade (doctor --post-upgrade) needs atomicity [W]

**Severity**: Warning
**Category**: Fleet upgrade

The plan says "3 of 47 workspaces fail the upgrade — can I fix them without touching the other 44?" With 25 packages, a partial upgrade is worse: workspace 17 upgrades 23 of 25 packages successfully, then fails on governance-runtime due to a breaking change in governance-primitives. The workspace is now in an inconsistent state — some packages are new, some are old, and the compatibility matrix is unknown. Rollback means reverting 23 successful upgrades.

**Recommendation**: Package upgrades must be atomic at the workspace level. Either all 25 packages upgrade successfully or none do. This requires a transaction mechanism — snapshot the current state, attempt upgrade, rollback on failure. The compatibility manifest from F01 is the prerequisite.

### F05 — 7 per-platform emitters create unnecessary fleet surface [W]

**Severity**: Warning
**Category**: Package count

A fleet of 47 workspaces uses maybe 2-3 platforms (OC + Claude Code + one more). Having 7 separate emitter packages means `claws drift` must track which emitters each workspace uses and version them independently. This is overhead with no fleet benefit. Emitter selection is a configuration choice, not a dependency choice. A single @craftworks/codegen package with platform flags achieves the same result without fragmenting the fleet dependency graph.

**Recommendation**: Bundle emitters into @craftworks/codegen. Platform selection via configuration, not package installation. Reduces the fleet tracking surface by 6 packages.

### F06 — Monorepo + npm workspaces is correct for fleet consistency [N]

**Severity**: Note (positive)
**Category**: Architecture

The plan correctly stays in the monorepo with npm workspaces rather than splitting into 25 repos. This means one CI pipeline, one release process, one issue tracker. From a fleet perspective, this is essential — if packages were in separate repos, the coordination cost would be prohibitive.

**Recommendation**: Explicitly commit to monorepo-forever for these packages. Document that the monorepo is a fleet consistency requirement, not just a convenience.

### F07 — No fleet-scale testing in the test plan [W]

**Severity**: Warning
**Category**: Testing

The test tiers cover unit, integration, e2e, and acceptance. None test fleet operations: "upgrade 47 workspaces from SDK-era to extracted-era," "detect drift across mixed-version fleet," "broadcast governance change through new package graph." These are the operations that will break. Fleet-scale testing needs at least 3-5 scenarios in the L3 acceptance tier.

**Recommendation**: Add fleet acceptance scenarios: mixed-version fleet upgrade, drift detection with 25-package matrix, broadcast through dependency chain, partial upgrade rollback.

### F08 — The "SDK as convenience bundle" model is fleet-friendly [N]

**Severity**: Note (positive)
**Category**: Architecture

Keeping compiler-sdk and agent-sdk as re-export bundles means fleet consumers can ignore the extraction entirely. `npm install @craftworks/compiler-sdk` still works, still gets everything, still has one version to track. This is the right approach for fleet operations — the extraction benefits claws and targeted consumers without forcing fleet-wide migration.

**Recommendation**: Emphasize this in documentation. Fleet consumers should be explicitly told: "You don't need to change anything. Keep using compiler-sdk."

## Summary

The extraction plan's biggest fleet risk is version drift across 25 independently versioned packages in 47 workspaces. The mitigation is a compatibility manifest (distro model) that lets `claws drift` and `claws doctor` operate on tested-together version sets rather than 1,175 individual version cells. The 7 emitter packages should consolidate into one codegen package. The SDK-as-bundle preservation is the right call for fleet consumers. Fleet acceptance testing is missing and must be added.

| Severity     | Count |
| ------------ | ----- |
| Must-address | 3     |
| Warning      | 3     |
| Note         | 2     |
