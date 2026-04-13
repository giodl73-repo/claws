# Graduation Plan Review (Round 1)

**Date**: 2026-04-12
**Roles**: 4 (founder, ciso, architect, navigator)

## Consensus Findings (2+ roles)

| # | Severity | Finding | Flagged by | Fix |
|---|----------|---------|------------|-----|
| C1 | MAJOR | **No runtime governance (R5 fail-closed) in free tier -- governance theater.** GovernanceIR types and audit chain ship in the free tier but GovernanceManager (runtime enforcement) is paid-only. Free-tier users believe their agents are governed when no enforcement runs. A crashing before_tool_call hook does NOT block the action. This is worse than no governance -- it is a liability. | founder (M2), ciso (M2) | Move a minimal GovernanceManager into the free tier: single-agent, local enforcement, R5 fail-closed. Paid tier extends with fleet enforcement, centralized policy, compliance reporting. R5 is not a premium feature. |
| C2 | MAJOR | **`export * from '@claws/compiler'` in paid tier creates supply-chain and API stability risks.** A compromised public npm package propagates directly into enterprise deployments. Additionally, every internal type in the free tier becomes part of the paid tier's public API, making semver unmanageable. | founder (W3), ciso (M4), architect (W-04) | (1) Use named re-exports, not `export *`. (2) Pin exact versions with integrity hashes. (3) CI verifies npm signatures. (4) Consider build-time vendoring for enterprise. |
| C3 | MAJOR | **Effort estimate is underscoped -- 5 weeks ignores normalization pipeline, crypto complexity, and FORMA replacement.** The 3,430-line estimate counts implementation lines but not the normalization pipeline (BOM/CRLF/encoding, ~500 additional lines), crypto correctness engineering, FORMA format auto-detection replacement, or incremental compilation cache. History shows "simplified rewrite" tasks take 2-3x estimates. | founder (M4), architect (M-03) | Revise to 8-10 weeks. Break Phase 1 into sub-phases: (a) readers + sidecar + crypto (3 weeks), (b) emit + codegen + host + cache + normalization (4-5 weeks). Add normalization pipeline as explicit M-effort row. |
| C4 | MAJOR | **Free tier single-platform emit (OC Gateway only) undermines the value proposition.** OC users already have Gateway plugins. The compelling reason to adopt claws is multi-platform compilation. If multi-platform emit is paid-only, the free tier solves a problem nobody has. The simplified emitter also cannot later add targets without re-importing compiler-sdk or a significant rewrite. | founder (M1), architect (W-02) | Move at least 2 emit targets to free tier (Gateway + one community-relevant target like static governance report or annotated CLAUDE.md). Keep remaining 5+ platforms as paid. Document the architectural cost of adding free-tier emit targets in the future. |
| C5 | MAJOR | **"Extends, never forks" has no versioning strategy, no CI enforcement, and no user-facing guarantee.** No API stability contract exists for the free/paid boundary. No CI check prevents enterprise modules from importing compiler-sdk directly (creating invisible forks). The principle is not translated into user terms (config compatibility, output identity, command stability). | founder (M3), architect (W-01), navigator (NAV-05) | (1) Add semver stability promise for `@claws/compiler` public types. (2) Add CI check: zero `@craftworks/compiler-sdk` imports in enterprise modules. (3) Reframe as user promise: "Upgrading never changes your existing workflow." (4) Add scenario: `graduation/upgrade-preserves-workflow`. |
| C6 | MAJOR | **HMAC audit chain is cryptographically insufficient and harms paid-tier sales.** HMAC requires a shared secret held by the user -- they can rewrite the entire chain. An auditor will reject this. Enterprise evaluators who test the free tier first will conclude "claws audit is weak" and move on, never discovering the paid tier's Ed25519 + RFC3161. | ciso (M1, M3), navigator (NAV-07) | Replace HMAC with Ed25519 signing using locally-generated keypair. User generates keypair at `claws init`, public key embedded in sidecar, entries signed with private key. RFC3161 timestamping + fleet aggregation + SIEM remain paid differentiators. |

## All Major Findings

| # | Role | Finding | Fix |
|---|------|---------|-----|
| 1 | founder | Free tier single-platform emit kills the adoption hook (M1) | Add 2+ emit targets to free tier |
| 2 | founder | GovernanceIR without runtime enforcement = governance theater (M2) | Minimal GovernanceManager in free tier with R5 fail-closed |
| 3 | founder | "Extends never forks" version coupling risk, no API stability contract (M3) | Semver stability promise, adapter layer at seam, pin versions |
| 4 | founder | 5-week estimate is optimistic, should be 8-10 weeks (M4) | Revise with sub-phases and risk buffer |
| 5 | ciso | HMAC audit chain is cryptographically insufficient (M1) | Replace with Ed25519 local signing |
| 6 | ciso | No R5 fail-closed in free tier (M2) | Minimal GovernanceManager in free tier |
| 7 | ciso | Weak free-tier audit harms paid-tier sales (M3) | Ed25519 makes free audit credible |
| 8 | ciso | `export *` supply-chain attack surface (M4) | Named re-exports, version pinning, integrity checks |
| 9 | ciso | Crypto internalization underscoped -- not measured in lines but correctness (M5) | Wrap Node.js crypto, dedicated security review gate, 100% branch coverage, consider audited libs |
| 10 | architect | Copy+simplify OC readers will diverge from upstream (M-01) | Define WorkspaceReader interface contract before writing reader code |
| 11 | architect | Removing FORMA removes format auto-detection, no replacement (M-02) | Internalize only platform-detect.ts (~100 lines marker-file checks) |
| 12 | architect | 3,430-line estimate excludes normalization pipeline (M-03) | Add normalization row (~500 lines, 1 week) to effort table |
| 13 | navigator | No documented first-5-minutes journey for free tier users (NAV-01) | Add "First-Use Journey" section with step-by-step experience |
| 14 | navigator | Upgrade journey from free limit to paid install is undefined (NAV-02) | Add "Upgrade Journey" section with triggers, messaging, and zero-change guarantee |
| 15 | navigator | Enterprise command behavior for free users is unspecified (NAV-03) | Specify progressive disclosure strategy: visible in help, clear messages, no stack traces |
| 16 | navigator | `npx claws pinch` in H1 validation violates project rules (NAV-04) | Use package.json#bin for `claws` binary; fix H1, H2, and tutorial |

## All Warning Findings

| # | Role | Finding | Fix |
|---|------|---------|-----|
| 1 | founder | Passive upsell messaging -- lowest-conversion pattern (W1) | Design 3-5 active triggers tied to usage milestones |
| 2 | founder | npm scope @claws/ not registered -- hard blocker if squatted (W2) | Register @claws on npm immediately; move to Prerequisites |
| 3 | founder | Supply-chain risk via `export *` from public package (W3) | Pinned versions, integrity hashes, consider vendoring |
| 4 | founder | @bic/claws-skill-kit as separate package fragments install story (W4) | Bundle into @claws/compiler or make it an auto-dependency |
| 5 | founder | No open-source governance model for community contributions (W5) | Add CONTRIBUTING.md, PR review process, boundary docs |
| 6 | ciso | No security test scenarios in coverage contract (W1) | Add tamper-detection, timing-safe, fail-closed, and boundary scenarios |
| 7 | ciso | No identity model in free tier (W2) | Restrict free tier to single-user or add basic local identity assertion |
| 8 | ciso | No SIEM export in free tier -- SOC blind to free-tier agents (W3) | Add basic JSON-lines event export to free tier |
| 9 | ciso | No threat model for the free/paid boundary itself (W4) | Add threat model section: bypass, enforcement mechanism, consequences |
| 10 | ciso | No vulnerability disclosure or security advisory process (W5) | Add security response section: disclosure policy, advisory mechanism, backport commitment |
| 11 | architect | No CI enforcement for "extends never forks" contract (W-01) | Add grep-based CI check for @craftworks/compiler-sdk imports |
| 12 | architect | Simplified emit duplicates patterns, fragile for adding targets (W-02) | Document multi-platform emit tradeoff explicitly |
| 13 | architect | Feature flags alternative not evaluated -- decision not documented (W-03) | Add decision record: two packages vs feature flags, with business rationale |
| 14 | architect | `export *` creates uncontrolled API surface for paid tier (W-04) | Use named re-exports with explicit public API surface |
| 15 | architect | Cache estimate ignores incremental compilation complexity (W-05) | Decide if incremental compilation is free-tier; if yes, revise estimate |
| 16 | navigator | "Extends never forks" not translated to user terms (NAV-05) | Reframe as user promise with scenario validation |
| 17 | navigator | Two npm scopes (@claws vs @craftworks) will confuse users (NAV-06) | Add naming strategy section, cross-link READMEs, consider @claws/enterprise alias |
| 18 | navigator | Audit chain split creates trust discontinuity on upgrade (NAV-07) | Specify migration path: HMAC entries remain valid, Ed25519 additive |
| 19 | navigator | Migration guide is a checkbox, not a design (NAV-08) | Promote to Phase 2 deliverable with compatibility table and test scenario |
| 20 | navigator | Free tier test framework naming confusing (NAV-09) | Define testing tier progression: free checks compatible with RELAX |
| 21 | navigator | No CLI messaging spec for upsell surface (NAV-10) | Add CLI messaging spec: templates, stderr, suppression, frequency cap, tone |

## Statistics

| Metric | Count |
|--------|-------|
| Roles reviewed | 4 |
| Total findings | 46 |
| Major/MUST findings | 16 |
| Warning/WARN findings | 21 |
| Note findings | 9 |
| Consensus findings (2+ roles) | 6 |
| Unique concerns (1 role only) | 31 |
| Scenarios proposed | 7 |
| Specs needing amendment | 3 (CL-01, CL-04, CL-07) + 1 new (freemium boundary) |

## Recommendation

**Fix before implementation.**

The panel unanimously finds the freemium architecture directionally correct -- "extends, never forks" with a free MIT compiler funneling to paid enterprise is the right strategy. However, 6 consensus findings at MAJOR severity must be resolved before Phase 1 begins:

1. **Governance theater** (C1): Ship R5 fail-closed in the free tier. This is the minimum viable security posture, not a premium feature.
2. **Supply-chain and API surface** (C2): Replace `export *` with named re-exports, add integrity checking, define the public API boundary.
3. **Effort underscope** (C3): Revise from 5 weeks to 8-10 weeks with sub-phases and the normalization pipeline.
4. **Single-platform emit** (C4): Add at least one more emit target to the free tier so it demonstrates claws's core value.
5. **No versioning contract** (C5): Add semver stability promise, CI enforcement, and user-facing guarantee.
6. **Weak audit chain** (C6): Replace HMAC with Ed25519 local signing so free-tier audit is credible.

Additionally, the navigator identified that the plan describes what to build but not what users experience. The first-use journey (NAV-01), upgrade journey (NAV-02), and enterprise command behavior (NAV-03) must be designed as first-class plan sections, not Phase 3 checkboxes.

Register the `@claws` npm scope immediately (founder W2) -- this is a 10-minute task that blocks the entire plan if someone else claims it.

**Verdict: Fix (6 consensus MAJORs + 3 user journey gaps) then proceed.**
