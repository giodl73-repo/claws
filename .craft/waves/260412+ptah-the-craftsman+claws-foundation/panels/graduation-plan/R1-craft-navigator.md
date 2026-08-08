# R1 Navigator Review: claws-sdk-graduation

**Role**: craft:navigator (experiential cluster E)
**Lens**: User journey coherence > implementation simplicity
**Plan**: claws-sdk-graduation
**Date**: 2026-04-12

## Scope

Reviewed the graduation plan through the navigator lens: user journeys for install, first-use, limit-encounter, upgrade, and error messaging across free and paid tiers.

---

## Findings

### MAJOR

#### NAV-01: No documented first-5-minutes journey for free tier users

**Severity**: MAJOR
**Lens**: "Does a maker's first-5-minutes path still work after this change?"

The plan defines validation criteria (`npm init -y && npm install @claws/compiler && npx claws pinch`) but never describes the actual first-use journey from the user's perspective. What does a user see when they:

1. Install `@claws/compiler` for the first time?
2. Run `claws init` in a fresh project?
3. Run `claws compile` and see their first output?

Phase 3 mentions a "Getting-started tutorial: Install claws in 30 seconds" as a checkbox, but the plan provides zero content for what that tutorial covers. The tutorial is the most critical deliverable for free-tier adoption and it is a one-liner checklist item.

**Fix**: Add a "First-Use Journey" section to the plan with the step-by-step user experience: install, init, first compile, first pinch, first build. Include what the CLI outputs at each step, what files are created, and what the user learns. The tutorial should be a Phase 2 deliverable (not Phase 3) since it validates the user experience before publishing.

---

#### NAV-02: Upgrade friction is undefined -- no journey from free limit to paid install

**Severity**: MAJOR
**Lens**: User journey coherence across tiers

The plan says the CLI shows "Enterprise features available in @bic/claws-sdk" for fleet/compliance commands. But the upgrade journey is not specified:

1. What exactly triggers the message? Running `claws fleet scan`? Running `claws compliance`? Importing a function?
2. After seeing the message, what does the user do? `npm install @bic/claws-sdk`? Do they need to uninstall `@claws/compiler` first? Does the paid package auto-detect and extend?
3. Is there a `claws upgrade` command? A link in the message? A pricing page URL?
4. After installing the paid tier, does the user need to change any code? Any imports? Any CLI commands?

The gap between "see upsell message" and "running with enterprise features" is entirely unspecified. This is the most commercially important user journey in the plan.

**Fix**: Add an "Upgrade Journey" section: (a) what triggers the upsell, (b) exact CLI output including actionable next-step, (c) what `npm install @bic/claws-sdk` does to the existing setup, (d) zero-change guarantee for existing code/imports, (e) what the user sees differently after upgrading. Add a scenario: `graduation/free-to-paid-upgrade`.

---

#### NAV-03: Enterprise command behavior for free users is unspecified

**Severity**: MAJOR
**Lens**: "Are error messages actionable from the user's perspective?"

The plan says `claws-cli` will "Detect which package is installed, enable/disable enterprise commands" (Phase 2). But the behavior is underspecified:

- If a free user runs `claws fleet scan`, do they get a "command not found" error? A "this is an enterprise feature" message? Is the command hidden from `claws --help`?
- If they try `import { fleetScan } from '@claws/compiler'`, what happens? TypeScript error? Runtime error? Graceful message?
- Are enterprise commands visible in help text (creating awareness) or hidden (reducing confusion)?

These are three different UX philosophies and the plan does not choose one. "Enable/disable" is an implementation description, not a user experience description.

**Fix**: Specify the progressive disclosure strategy for enterprise features. Recommendation: enterprise commands appear in `claws --help` under an "Enterprise" section with a lock icon or tag, running them prints a clear message with the exact npm install command and a URL, and the commands never throw stack traces or confusing errors. Add this as a spec requirement (likely a new CL-spec or amendment to CL-01).

---

#### NAV-04: `npx claws pinch` in H1 validation violates project rules

**Severity**: MAJOR
**Lens**: Coherence between plan and project conventions

H1 validation step 2 says: `npm init -y && npm install @claws/compiler && npx claws pinch`. The CLAUDE.md says "No npx (REQUIRED): npx leaves orphaned processes on Windows." If the getting-started tutorial uses `npx`, it will break on Windows -- the primary development platform.

This is not just a process rule violation; it is a user journey failure. A getting-started tutorial that does not work on the developer's own platform is a red flag for external users on Windows.

**Fix**: Replace `npx claws pinch` with the correct invocation pattern. Either (a) the package installs a `claws` binary via `package.json#bin` and the user runs `claws pinch` after install, or (b) the tutorial uses `node_modules/.bin/claws pinch`. Option (a) is strongly preferred for UX. Ensure H1, H2, and the getting-started tutorial all use the same invocation pattern.

---

### WARNING

#### NAV-05: "Extends, never forks" is developer language -- user impact unclear

**Severity**: WARNING
**Lens**: "The user's mental model is the spec"

H3 says "Paid tier extends free tier -- never forks it." This is an important architectural principle but the plan never translates it into user terms. The user cares about:

- "Will my `.claws` config files work the same in both tiers?"
- "Will my compile output be identical?"
- "Do I need to learn new commands when I upgrade?"

The plan's validation ("claws pinch produces identical output regardless of which package is installed") is the right test, but it is buried in H3 validation. It should be a user-facing guarantee with its own scenario.

**Fix**: Reframe H3 from an architectural principle to a user promise: "Upgrading to enterprise never changes your existing workflow." Add a scenario `graduation/upgrade-preserves-workflow` that validates config files, compile output, CLI commands, and imports all remain identical after upgrading.

---

#### NAV-06: Two npm scopes will confuse users

**Severity**: WARNING
**Lens**: User mental model

Free tier is `@claws/compiler`. Paid tier is `@bic/claws-sdk`. These are two different npm scopes (`@claws` vs `@craftworks`). Users will ask:

- "What is the relationship between @claws and @craftworks?"
- "I see @claws/compiler and @bic/claws-skill-kit but @bic/claws-sdk -- are these from the same team?"
- "Should I install @claws/compiler or @bic/claws-sdk? The README says claws but the enterprise docs say craftworks."

The scope split makes commercial sense but creates a naming journey discontinuity. When users search npm for "claws" they may not find the enterprise package, and vice versa.

**Fix**: (a) Add a "Naming and Scope" section to the plan explaining the two-scope strategy. (b) Ensure `@claws/compiler` README links to `@bic/claws-sdk` and vice versa. (c) Add `claws` (no scope) as a keyword in both packages. (d) Consider whether a `@claws/enterprise` alias would reduce confusion (even if it just re-exports `@bic/claws-sdk`). (e) Add scenario: `graduation/scope-discovery` testing that users can find both packages from either starting point.

---

#### NAV-07: Audit chain split creates a trust discontinuity

**Severity**: WARNING
**Lens**: Progressive disclosure

Free tier gets "basic HMAC" audit chain. Paid tier gets "Ed25519, RFC3161." From a user's perspective:

- They set up governance with HMAC audit trails in the free tier
- They upgrade to enterprise
- Now their audit chain has two different crypto schemes?
- Do they need to re-sign? Migrate? Is the old chain still valid?

The plan does not address the audit chain upgrade path. For a governance tool, audit integrity across tiers is table stakes.

**Fix**: Specify the audit chain migration path: (a) HMAC chains remain valid after upgrade, (b) Ed25519 signing is additive (new entries use Ed25519, old entries keep HMAC), (c) a migration command (`claws audit upgrade-chain`) exists for users who want full Ed25519. Add scenario: `graduation/audit-chain-upgrade`.

---

#### NAV-08: Phase 3 "Migration guide" for existing users is a checkbox, not a design

**Severity**: WARNING
**Lens**: Journey coherence for existing users

Phase 3 includes "Migration guide: existing @bic/claws-sdk users -> no changes needed." If no changes are needed, the migration guide is just a notice. But:

- Do existing users need to update their package.json?
- Does `@bic/claws-sdk` silently pull in `@claws/compiler` as a transitive dep?
- Will existing import paths (`from '@bic/claws-sdk'`) still work?
- If they pin versions, will the free tier version match the paid tier version?

"No changes needed" needs to be verified, not assumed. And even "no changes needed" requires a communication to users explaining what happened.

**Fix**: Promote the migration guide from a Phase 3 checkbox to a Phase 2 deliverable with specific content: (a) import path compatibility table, (b) version alignment strategy, (c) "nothing breaks" test scenario. Add scenario: `graduation/existing-user-no-break`.

---

#### NAV-09: Free tier test framework naming is confusing

**Severity**: WARNING
**Lens**: Progressive disclosure

Free tier includes "Test (12 checks, 16 scans)" and Phase 1 mentions "Own 12-check validator (no eval framework)." Paid tier has "RELAX policy evaluation." The relationship between "12 checks" and "RELAX evaluation" is unclear to users:

- Are the 12 checks a subset of RELAX?
- If I write custom checks in the free tier, do they work in RELAX?
- What is the upgrade path from basic testing to full evaluation?

**Fix**: Define the testing tier progression: free checks are compatible with RELAX (RELAX extends the check format), not a separate system. Document this in the freemium boundary section.

---

#### NAV-10: No CLI messaging spec for the upsell surface

**Severity**: WARNING
**Lens**: Error message craft

The plan mentions 'Enterprise features available in @bic/claws-sdk' as the upsell message. But:

- Is this the exact text? Who writes the final copy?
- Does it include a URL? A command to run?
- Is it a single message or does it vary by feature?
- Is it stdout or stderr? Does it affect exit codes?
- Can it be silenced (`--quiet`, `CLAWS_NO_UPSELL=1`)?

Upsell messages in CLI tools are notoriously irritating if done wrong (see: npm fund, yarn telemetry). The tone, frequency, and dismissibility are critical to the user experience.

**Fix**: Add a "CLI Messaging Spec" section with: (a) exact message templates for each enterprise feature group, (b) output channel (stderr, not stdout -- never break pipes), (c) suppression mechanism (env var or config), (d) frequency cap (once per session, not once per command), (e) tone guide (helpful, not salesy). This is important enough to warrant its own spec amendment.

---

## Summary

| Severity | Count |
| -------- | ----- |
| MAJOR    | 4     |
| WARNING  | 6     |
| Total    | 10    |

## Recommendation

**Fix before implementation.** The plan is architecturally sound but user-journey-blind. It describes what to build without describing what users experience. The four MAJOR findings (no first-use journey, no upgrade journey, unspecified enterprise command behavior, npx violation) must be resolved before Phase 1 begins. The six WARNINGs should be addressed before Phase 2 (package split) since they affect the freemium boundary design.

The core architectural decision (extends, never forks) is correct. The freemium boundary is well-placed. But the plan treats the user experience as an afterthought ("getting-started tutorial" as a Phase 3 checkbox) rather than the primary design artifact. For a product whose adoption depends on a free-tier funnel, the user journey IS the architecture.
