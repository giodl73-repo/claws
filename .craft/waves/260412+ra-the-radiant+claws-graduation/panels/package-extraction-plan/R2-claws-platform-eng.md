# R2 Review: claws Platform Engineer

**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 2
**Role**: claws/platform-eng (Cluster D — Fleet consistency > Workspace autonomy)

## R1 Consensus Finding Disposition

### C01 — Consolidate to domain-based packages [5/5 roles]

**Status: PARTIAL**

The Package Map section correctly moves to 10+7. From a fleet operations perspective, 17 packages is manageable. 17 x 47 workspaces = 799 version cells — better than 1,175 (25 packages) and acceptable for drift detection. The 7 emitter plugins are the right split for fleet management because different workspaces use different platforms — I can track which emitters are deployed where.

**The problem is operational ambiguity.** The Extraction Strategy (Phases 1-6) still references old package names. If a fleet engineer reads this plan to understand what to track after extraction, they see two different package catalogs in the same document. Which one is real? The Package Map must be the single source of truth, and every other section must reference it consistently.

### C02 — Define a canonical import path [4/5 roles]

**Status: UNRESOLVED**

Fleet drift detection depends on knowing which import path is canonical. If workspace A imports from `@craftworks/forma` and workspace B imports from `@craftworks/compiler-sdk/astro/workspace`, `claws drift` needs to know these are equivalent. Without a declared canonical path, drift detection produces false positives.

The plan shows both paths work but does not declare which is canonical. For fleet operations, I need one canonical path so `claws drift` can normalize imports before comparing.

### C03 — Compatibility manifest for fleet operations [3/5 roles]

**Status: UNRESOLVED**

This is my highest-priority finding. The plan proposes 17 independently-versioned packages. When I run `claws doctor --post-upgrade --fleet` on 47 workspaces, I need to know which version combinations are tested-together. Without a compatibility manifest:

- Workspace A has `@craftworks/forma@1.2.0` + `@craftworks/governance@1.3.0`
- Workspace B has `@craftworks/forma@1.2.0` + `@craftworks/governance@1.4.0`
- Are both valid? I cannot know without a manifest.

The R1 recommendation was a `@craftworks/platform` manifest package — no code, just a version matrix. The plan does not mention it. This is a **hard blocker** for fleet adoption. Without it, I cannot safely upgrade 47 workspaces.

### C04 — Gateway startup benchmark before and after [3/5 roles]

**Status: UNRESOLVED**

Fleet-wide upgrades are my responsibility. If extraction increases Gateway startup time, I will see it multiplied across 47 workspaces. The plan should include a pre-extraction baseline measurement and a post-Phase-5 verification with a clear threshold (R1 recommended: 200ms regression limit).

### C05 — Governance must be one package [4/5 roles]

**Status: RESOLVED**

`@craftworks/governance` as a single package eliminates the version mismatch risk I flagged in R1. When `claws broadcast` pushes a governance update to 47 workspaces, there is now one package to version, not two that must match. Correct resolution.

### C06 — No "out of scope" on public npm [3/5 roles]

**Status: PARTIAL**

The Out of Scope section still says public npm is deferred. From a fleet perspective, I need packages in a registry I can pin and audit. Whether that is public npm or a private registry, the plan needs to specify the registry strategy. "Internal registry first" is acceptable IF the plan defines what "internal registry" means (GitHub Packages? Artifactory? npm org with restricted access?). Currently it is undefined.

## Evaluation of the 10+7 Model

### Fleet operations impact

**Positive.** 17 packages with clear domain boundaries map well to fleet tracking:

| Fleet concern                 | 10+7 impact                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `claws drift`                 | 17 version slots per workspace — tractable                                    |
| `claws broadcast`             | Can push one package at a time (e.g., security patch to `@craftworks/crypto`) |
| `claws doctor --post-upgrade` | Needs compatibility manifest (see C03)                                        |
| CI/CD (`claws pinch --ci`)    | Each emitter plugin is independently testable — faster CI                     |

### Emitter plugins as separate packages

**Correct for fleet management.** My 47 workspaces break down roughly as: 30 OpenClaw, 8 Claude Code, 5 Cursor, 2 Copilot, 2 Bedrock. When I upgrade `@craftworks/emit-cursor`, I only need to verify and deploy to the 5 Cursor workspaces, not all 47. Per-emitter packages enable targeted fleet operations.

### Dependency graph — diamond risk

The 10+7 model reduces diamond risk compared to 25 by eliminating split-domain packages. However, I note that `@craftworks/governance` now includes budget tracking, which `agent-sdk` previously consumed separately. If `agent-sdk` depends on `@craftworks/governance` and `compiler-sdk` also depends on `@craftworks/governance`, both SDKs must agree on the governance version. This is fine IF the compatibility manifest (C03) tracks it.

### Effort estimate

The plan says 15 weeks. With 17 packages (not 25), the extraction work is reduced. But the merge step (combining readers+IR into forma, combining primitives+runtime+budget into governance) adds integration effort. I estimate 14-16 weeks is realistic. The 15-week estimate is acceptable but tight. R1 recommended 18-20 weeks — I would split the difference at 16 weeks with a Phase 3 checkpoint.

## New Issues Introduced by Consolidation

### N04 — No fleet test scenarios (MUST-ADDRESS)

R1's W04 flagged missing fleet test scenarios. The revised plan's Scenario Coverage (lines 231-234) still covers only extraction/backward-compat/circular-dep/claws-composition. Missing:

- `fleet/drift-detection-17-packages` — `claws drift` correctly detects version divergence across 17 packages
- `fleet/targeted-broadcast` — `claws broadcast` can push a single emitter plugin update to affected workspaces only
- `fleet/upgrade-rollback` — if `claws doctor --post-upgrade` fails on 3/47 workspaces, the other 44 are unaffected

### N05 — No rollback strategy (WARNING)

17 independently-versioned packages means a failed upgrade can leave a workspace in a partially-upgraded state. The plan should define a rollback strategy: "if Phase 3 extraction breaks workspace X, `claws doctor --rollback` restores the previous version set." Without rollback, fleet operators must manually track which packages were upgraded and revert each one.

### N06 — Phase 1 leaf packages are wrong (MUST-ADDRESS)

Phase 1 (line 183) lists:

- `@craftworks/crypto` — correct, exists in 10+7
- `@craftworks/normalize` — does NOT exist in 10+7 (merged into workspace)
- `@craftworks/budget-tracker` — does NOT exist in 10+7 (merged into governance)
- `@craftworks/workspace-discovery` — does NOT exist in 10+7 (merged into workspace)

Only 1 of 4 Phase 1 packages actually exists in the 10+7 model. The extraction phases need a complete rewrite.

## Summary

| Finding                                    | Status     | Severity               |
| ------------------------------------------ | ---------- | ---------------------- |
| C01 — Consolidate to domain-based packages | PARTIAL    | Must-address           |
| C02 — Canonical import path                | UNRESOLVED | Must-address           |
| C03 — Compatibility manifest               | UNRESOLVED | Must-address (BLOCKER) |
| C04 — Gateway startup benchmark            | UNRESOLVED | Warning                |
| C05 — Governance as one package            | RESOLVED   | --                     |
| C06 — Public npm / registry strategy       | PARTIAL    | Warning                |
| N04 — No fleet test scenarios              | NEW        | Must-address           |
| N05 — No rollback strategy                 | NEW        | Warning                |
| N06 — Phase 1 packages are wrong           | NEW        | Must-address           |

**Total: 4 Must-address (1 blocker), 3 Warning, 0 Note**

The 10+7 model is correct for fleet operations. The compatibility manifest (C03) is a hard blocker — without it, I cannot safely manage 17 packages across 47 workspaces. The extraction phases are internally inconsistent and must be rewritten to match the 10+7 model.
