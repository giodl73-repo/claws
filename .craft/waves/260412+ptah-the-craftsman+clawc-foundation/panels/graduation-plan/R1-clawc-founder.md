# Panel Review: Founder on claws-sdk-graduation

**Type**: plan
**Role**: claws/founder
**Domain lens**: claws
**Round**: 1
**Files reviewed**: .craft/plans/claws-sdk-graduation.md, .craft/plans/claws-sdk-bootstrap.md
**Date**: 2026-04-11

---

## Findings

### Major (M)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| M1 | claws-sdk-graduation.md | Freemium Boundary | **Free tier has no multi-platform emit -- this kills the hook.** The free tier only emits to OC Gateway. But the 3.2M OC users already HAVE Gateway plugins -- they don't need claws to make one. The compelling reason to adopt claws is "compile once, emit to 7 platforms." If multi-platform emit is paid-only, the free tier solves a problem nobody has. The free compiler must emit to at least 2-3 platforms (Gateway + one or two others like a static audit report or a CLAUDE.md annotator) to demonstrate the value of compilation. | Move "Detection (7 platforms)" from a passive list item to an active emit capability for at least 2 platforms in the free tier. Gateway + one community-relevant target (e.g., static HTML governance report or annotated CLAUDE.md). Keep the remaining 5+ platforms as paid. |
| M2 | claws-sdk-graduation.md | Freemium Boundary | **GovernanceIR types in the free tier but no runtime enforcement creates a false sense of security.** The free tier ships GovernanceIR types and serialization, plus a basic HMAC audit chain. But GovernanceManager (runtime enforcement) is paid-only. A user who compiles governance rules and sees audit entries may believe their agent is governed, when in fact no runtime enforcement is happening. This is worse than no governance -- it's governance theater that exposes the brand to criticism. | Either (a) include a minimal GovernanceManager stub in the free tier that enforces R5 fail-closed for the single-agent case, or (b) remove GovernanceIR serialization from the free tier entirely and position the free tier as "compile and test" only. Option (a) is better for the funnel. |
| M3 | claws-sdk-graduation.md | The Freemium Boundary | **The "extends, never forks" model has a version coupling risk that will fragment the ecosystem.** If `@bic/claws-sdk` re-exports everything from `@claws/compiler`, then every breaking change to the free tier's public API is a breaking change for all paid customers simultaneously. With no buffering layer, a community-driven PR to `@claws/compiler` that changes a type signature breaks every enterprise deployment. The plan has no API stability contract or versioning strategy for the boundary. | Add a versioning strategy section: (1) `@claws/compiler` follows semver strictly with a stability promise for public types, (2) `@bic/claws-sdk` pins to a compatible range (not `*`), (3) enterprise modules import from a stable internal API surface, not the full re-export. The extension model needs an adapter layer at the seam. |
| M4 | claws-sdk-graduation.md | Phase 1 scope | **5 weeks for ~3,430 lines of internalization is a vanity estimate.** The plan counts lines but not complexity. Rewriting OC workspace readers "without FORMA abstraction" means re-implementing format detection, encoding handling, merge semantics, and edge cases that FORMA handles today. The TS codegen rewrite ("simplified TS codegen for Gateway plugin") glosses over AST generation, import resolution, and platform-specific emit. The history of this repo shows that "simplified rewrite" tasks consistently take 2-3x the estimate. 7-8 weeks is realistic for core + split + publish. | Revise to 8-10 weeks with explicit risk buffer. Break Phase 1 into two sub-phases: (a) readers + sidecar + crypto (3 weeks, lower risk), (b) emit + codegen + host + cache (4-5 weeks, higher risk). Gate Phase 2 on Phase 1(a) completion. |

### Warning (W)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| W1 | claws-sdk-graduation.md | Freemium Boundary | **The free tier CLI upsell surface ("Enterprise features available in @bic/claws-sdk") is too passive.** Showing a text message when someone types `claws fleet` is the lowest-conversion upsell possible. The funnel needs an active trigger: the free tier should surface a concrete pain point (e.g., "3 agents detected but fleet management requires enterprise" or "audit chain has 847 entries -- export to SIEM requires enterprise"). Without active triggers, the funnel leaks at the "try governance" step. | Design 3-5 specific upsell triggers tied to usage milestones in the free tier. Example: after 100 audit entries, after detecting >1 agent, after a compile that produces >5 rules. Each trigger shows a specific enterprise capability that solves the emerging need. |
| W2 | claws-sdk-graduation.md | Out of Scope | **npm scope registration for @claws/ is listed as "handled separately" but is a hard blocker.** If someone else registers `@claws` on npm before we do, the entire plan is dead. This isn't an engineering task to defer -- it's a 10-minute business task that should happen TODAY, before any engineering starts. Every day it's deferred is a day someone could squat the scope. | Register `@claws` on npm immediately as a prerequisite. Move from "Out of Scope" to "Prerequisites" with a completion checkbox. |
| W3 | claws-sdk-graduation.md | What Stays as Dependency | **The paid tier's `export * from '@claws/compiler'` creates a supply-chain attack surface.** If `@claws/compiler` is public MIT on npm, anyone can publish a malicious version. The paid tier blindly re-exports everything. An attacker who compromises the public package compromises all enterprise customers. The "extends, never forks" model means there's no isolation between the community supply chain and the enterprise supply chain. | The paid tier should import from `@claws/compiler` through a pinned version with integrity checking (npm `--package-lock-only` + `npm audit signatures`). Add a section on supply-chain security for the extension boundary. Consider whether the paid tier should vendor a verified copy rather than live-importing from public npm. |
| W4 | claws-sdk-graduation.md | Freemium Boundary | **`@bic/claws-skill-kit` as a standalone package fragments the community contribution story.** If skill authors need `@bic/claws-skill-kit` to write governed skills but `@claws/compiler` to compile them, the "install one thing" story breaks. OC's strength is simplicity -- a folder with markdown. Adding two packages to write a governed skill is friction that the 13,729 skill authors will resist. | Bundle skill-kit into `@claws/compiler` or make `@claws/compiler` automatically install skill-kit as a dependency. The community should install ONE package to get the full free experience. |
| W5 | claws-sdk-graduation.md | Summary | **No contributor governance model for the open-source `@claws/compiler`.** The plan creates an MIT-licensed public package but says nothing about who accepts PRs, what the contribution guidelines are, how community contributors interact with the enterprise roadmap, or how to prevent enterprise features from leaking into the free tier via community PRs. The OpenClaw community will fork if they feel excluded from governance. | Add a section on open-source governance: CONTRIBUTING.md template, PR review process, clear boundary documentation ("these directories are enterprise-only"), and a commitment to review community PRs within N days. |

### Notes (N)

| # | File | Line/Section | Finding |
|---|------|-------------|---------|
| N1 | claws-sdk-graduation.md | Notes | The framing "Free does NOT mean limited" is good messaging but the plan contradicts it by limiting emit to a single platform. The narrative and the boundary need to agree. |
| N2 | claws-sdk-graduation.md | Coverage Contract | The L2 e2e target of 5 tests for "Fresh install -> compile -> pinch -> build" is thin. This is the primary free-tier user journey and should have at least 10 e2e tests covering different OC workspace shapes (minimal, full 9-file, missing optional files, malformed files). |
| N3 | claws-sdk-graduation.md | Alternative section | The "Full Graduation" alternative at 25 weeks is a useful forcing function for the business decision. Consider adding a third alternative: "Hybrid Graduation" where fleet stays as @craftworks/ but compliance/SIEM are internalized (since those are the features that justify the purchase, they should demo well). |

---

## Lens Checklist

| Verify item | Pass? | Notes |
|-------------|-------|-------|
| Does this feel like a natural extension of OpenClaw, or an alien layer imposed from outside? | Partial | The free tier concept is right but single-platform emit makes it feel like a demo, not a real tool. Need at least 2 emit targets. |
| Would a contributor who reads the generated code understand it without knowing Craftworks? | Yes | The internalization removes all @craftworks/ imports from the free tier. Generated code will be standalone. |
| Does this create vendor lock-in or can the user rm -rf and walk away? | Yes | MIT license + zero @craftworks/ deps means clean walk-away. Good. |
| Are the contributed @openclaw/* packages genuinely useful to the community, not just a funnel? | N/A | This plan doesn't cover upstream contribution (that's claws-upstream-contrib). |
| Does this respect the 'personal assistant' trust model while extending it for enterprise? | No | GovernanceIR types without runtime enforcement (M2) creates a false trust signal. Must fix. |

---

## Summary

The freemium architecture is the right strategy -- a free MIT compiler that funnels to paid enterprise features. But the current boundary has two critical flaws: the free tier doesn't emit to enough platforms to demonstrate claws's core value proposition (M1), and shipping governance types without runtime enforcement creates dangerous governance theater (M2). The "extends, never forks" model needs an API stability contract and supply-chain security plan before it's viable at scale (M3, W3). The 5-week estimate is optimistic; 8-10 weeks is realistic given this repo's track record with "simplified rewrite" tasks (M4). Fix the boundary, add the stability contract, and register the npm scope TODAY.
