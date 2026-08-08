# R1 Consolidated Review: Craftworks Package Extraction

**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 1
**Panel**: claws/founder, claws/platform-eng, claws/gateway-eng, craft/architect, craft/navigator

## Panel Composition

| Role         | Cluster | Tension                                            | Findings   |
| ------------ | ------- | -------------------------------------------------- | ---------- |
| Founder      | A       | Community trust > Enterprise revenue               | 4M, 3W, 1N |
| Platform-eng | D       | Fleet consistency > Workspace autonomy             | 3M, 3W, 2N |
| Gateway-eng  | B       | Runtime performance > Governance completeness      | 4M, 3W, 1N |
| Architect    | D       | Structural clarity > Rapid delivery                | 4M, 3W, 2N |
| Navigator    | E       | User journey coherence > Implementation simplicity | 4M, 4W, 0N |

**Total findings**: 19 Must-address, 16 Warning, 6 Note = **41 findings**

## The Central Question: 25 Packages vs 8-10 Packages

### Consensus: 10-12 packages. Not 25. Not 8.

All five roles independently flagged over-granularity. The reasoning converges from different directions:

| Role             | Why 25 is too many                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **Founder**      | 25 packages in npm registry alienates contributors; "left-pad syndrome" perception                  |
| **Platform-eng** | 25 x 47 workspaces = 1,175 version cells; fleet drift detection becomes combinatorial               |
| **Gateway-eng**  | 25 packages = 25 module resolution points at startup; transitive init cost on hot path              |
| **Architect**    | Boundaries follow SDK origin, not architectural seams; several packages are one domain split in two |
| **Navigator**    | Inconsistent naming, two import paths, inverted progressive disclosure, no user journey             |

### The Recommended 10-12 Package Model

Merge by domain and user-facing capability, not by internal module origin:

| Proposed Package           | Merges                                            | Rationale                                                        |
| -------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| **@craftworks/forma**      | oc-readers + oc-ir                                | Reader returns IR types; inseparable                             |
| **@craftworks/workspace**  | platform-detect + workspace-discovery + normalize | One concern: find and characterize workspaces                    |
| **@craftworks/crypto**     | crypto + audit-chain                              | 200-line crypto wrapping builtins isn't a standalone package     |
| **@craftworks/governance** | governance-primitives + governance-runtime        | One domain with two layers; split causes version mismatch risk   |
| **@craftworks/codegen**    | emit-framework + all 7 emit-* packages            | Emitters are plugins within a framework, not standalone packages |
| **@craftworks/relax**      | relax (unchanged)                                 | Genuinely independent; expression parser + evaluator             |
| **@craftworks/context**    | context-dag (renamed)                             | DAG is implementation detail; "context" is the domain            |
| **@craftworks/execution**  | execution-engine (unchanged)                      | Stage-task graph is genuinely independent                        |
| **@craftworks/eval**       | eval-framework (renamed)                          | Rubric + assertions, independent domain                          |
| **@craftworks/input**      | input-resolver (renamed)                          | File/package/URL resolution                                      |
| **@craftworks/skills**     | skill-resolver (renamed)                          | Skill discovery, ASP resolution                                  |
| **@craftworks/budget**     | budget-tracker (renamed)                          | Token counting, standalone                                       |

**Result: 12 packages** (down from 25). This achieves:

- ~80% of the install size reduction (claws still picks 5-6 packages, not the monolith)
- ~50% of the extraction work (12 extractions vs 25)
- Consistent domain-based naming
- No diamonds through split packages (governance, forma)
- Fleet drift tracking at 12 x 47 = 564 cells (vs 1,175)
- Contributor-friendly catalog (12 clear domains vs 25 mixed-abstraction names)

### What 25 Buys That 12 Does Not

The only real benefit of 25 over 12 is per-emitter versioning: if emit-cursor needs a hotfix, you don't need to republish all emitters. But this scenario is rare (emitters change when the target platform changes, not independently), and the cost (7 extra packages, 7 extra CI configs, 7 extra version tracks) far exceeds the benefit.

## Cross-Role Must-Address Findings (Consensus)

These findings appeared in 3+ roles and represent hard requirements:

### C01 — Consolidate to domain-based packages [5/5 roles]

Every role flagged over-granularity from their perspective. The 10-12 model above is the panel consensus. This is the single highest-impact change to the plan.

### C02 — Define a canonical import path [4/5 roles: Founder, Gateway-eng, Architect, Navigator]

Two import paths (SDK re-export vs direct package) create ecosystem fragmentation. Choose one as canonical, document it, and deprecate the other with a timeline. Navigator recommends SDK as default, direct as advanced. Architect recommends direct as canonical, SDK as convenience.

**Panel recommendation**: Direct import is canonical. SDK is a convenience meta-package for consumers who want "everything." This matches the extraction's thesis — targeted installs are the point.

### C03 — Compatibility manifest for fleet operations [3/5 roles: Platform-eng, Gateway-eng, Architect]

Independent semver across packages requires a tested-together manifest. Platform-eng needs it for fleet drift. Gateway-eng needs it for hot-reload validation. Architect needs it for diamond dependency deduplication.

**Panel recommendation**: Ship a `@craftworks/platform` manifest package (no code, just a version matrix) that declares which versions were integration-tested together. `claws drift` checks against this manifest.

### C04 — Gateway startup benchmark before and after [3/5 roles: Gateway-eng, Architect, Platform-eng]

Module resolution cost is real. Pre-extraction baseline must exist before extraction begins. If post-extraction startup exceeds baseline by >200ms, the SDK bundle must use bundled entry points (not re-exports through package resolution).

### C05 — Governance must be one package [4/5 roles: Gateway-eng, Architect, Platform-eng, Founder]

governance-primitives and governance-runtime split creates version mismatch risk that surfaces at runtime (Gateway before_tool_call evaluating a policy defined by a different package version). The risk-level enum, gate types, and fail-mode policy must live in one package.

### C06 — No "out of scope" on public npm [3/5 roles: Founder, Navigator, Platform-eng]

The plan defers public npm to a separate decision. Founder says the moat is community adoption. Navigator says progressive disclosure requires a clean npm presence. Platform-eng says fleet consumers need a stable registry. Core packages (forma, workspace, crypto) should target public npm from Phase 1.

## Cross-Role Warning Findings

### W01 — Timeline should be 18-20 weeks with Phase 2 checkpoint [Founder, Platform-eng]

15 weeks for 25 packages was tight. 12 packages in 18 weeks is more realistic. Phase 2 checkpoint is the consolidation decision point.

### W02 — Cache invalidation across package versions [Gateway-eng, Architect]

compilation-host's per-file cache must include dependency version hashes. A version mismatch should invalidate, not silently serve stale results.

### W03 — Error context must map back to user-facing packages [Navigator, Gateway-eng]

Stack traces referencing internal packages confuse consumers who installed SDK bundles. Error messages need SDK-level context wrapping.

### W04 — Missing test coverage: fleet scenarios, Gateway startup, contributor workflow [All roles]

The test plan covers unit through acceptance but misses fleet operations (platform-eng), Gateway performance (gateway-eng), and contributor experience (founder). Each role identified gaps specific to their domain.

## Verdict

**The extraction is the right move. 25 packages is the wrong granularity.**

Consolidate to 10-12 domain-based packages. Define a canonical import path. Ship a compatibility manifest. Benchmark Gateway startup. Merge governance into one package. Publish core packages to public npm from Phase 1. Budget 18-20 weeks with a Phase 2 checkpoint.

The plan's core thesis — "compiler-sdk becomes a thin orchestrator, claws composes building blocks" — is sound and well-motivated. The adjustment is granularity, not direction.

## Severity Summary

| Severity     | Count  |
| ------------ | ------ |
| Must-address | 19     |
| Warning      | 16     |
| Note         | 6      |
| **Total**    | **41** |

| Consensus               | Count |
| ----------------------- | ----- |
| Cross-role Must-address | 6     |
| Cross-role Warning      | 4     |
