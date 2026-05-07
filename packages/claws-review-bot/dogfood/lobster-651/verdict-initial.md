<!-- claws-lobster-architect:initial -->

## Architect Review — PR #651 @ `06dc7ab1b`

## Sources of truth (R0)

**PR claim digest**: 8 claims.
- C1 — Brings JourneyAvatar / JourneySkills / JourneyHabits / JourneyReady / JourneyHandoff into production "on top of the JourneyName step (PR #499 lineage)."
- C2 — Step ports preserve "verbatim visual + interaction layer from the Lovable prototype, prop interfaces and a11y are production's."
- C3 — JourneyAvatar delivers "curated grid + upload toggle, dashed selected ring."
- C4 — Production-readiness sweep: typecheck fix, OnboardingPage split into `OnboardingPage.steps.ts` + `services/onboardingHandoff.ts`.
- C5 — JourneyTeams converted from 552-line monolith into a 6-file Griffel folder.
- C6 — Fixes a "latent WCAG 2.4.7 issue: focus ring spread into React inline `style={}` silently dropped the `:focus-visible` pseudo-selector."
- C7 — Step order is "name → avatar → habits → skills → ready → /chat."
- C8 — Test plan: web-type-check / web-lint / web-test (onboarding-scoped, 48 tests) green; Playwright manual drive across the flow.

**Specs read**:
- `CLAUDE.md` (root) §"Repo Layout" / §"Key Design Decisions" — high-level repo orientation; no contract for the web layer.
- `src/lobster_web/README.md` §"Contract — what NOT to put here" + §"Routes" — orientation, not contract.
- Inline contract docstrings:
  - `src/lobster_web/src/services/onboardingTransaction.ts:1-25` (panel-M-A submit ordering + marker-LAST invariant).
  - `src/lobster_web/src/components/onboarding/types.ts:60-79` (the `pickedAvatar` enum vs `avatarSrc` string contract — "submit pipeline derives a deterministic value from the assistant name when this is null").
  - `src/lobster_web/src/pages/OnboardingPage.steps.ts:1-30` (step config + `STEP_DEFS` table as single source of truth).
  - `src/lobster_web/src/components/onboarding/steps/JourneyAvatar.tsx:21-25` (Avatar step "commits a string src ... separate from the legacy enum `pickedAvatar` written to IDENTITY.md by the submit pipeline").

**Spec gaps**: `src/lobster_web/` has no `CLAUDE.md`. R0 walk-up productive: nearest authority was `src/lobster_web/README.md` plus inline contract docstrings. The `pickedAvatar` vs `avatarSrc` distinction is documented only inline in `types.ts`, which made the disagreement reportable but means a reader who hasn't read that file can't tell the picker is decoupled from the persistence layer. See LQ1.

**Drift hypotheses**:
- H1 — JourneyAvatar `onPick` writes only to `state.avatarSrc`; submit reads `state.pickedAvatar`; user-picked avatar may not flow through to IDENTITY.md (becomes F1).
- H2 — CapabilityBanner is suppressed on `/onboarding` but OnboardingPage takes no `capabilityStatus` / `onSignIn` props — auth-required users on this route may have no recovery affordance (becomes F3).
- H3 — PR body / OnboardingPage docstring step order disagrees with `STEP_DEFS` (becomes F5).

## Findings

**Findings**: 6 total — 1 code, 1 spec gap (LQ), 4 drift (1 drift:pr-code, 3 drift:code-code, 1 drift:code-tests). 4 Major-block, 1 Major, 1 Minor.

### F1 — [Major | block | drift:code-code] — Status: open
**Recommendation**: block — must fix before merge.
**Invariant**: `src/lobster_web/src/components/onboarding/types.ts:60-79` documents two coupled fields — `pickedAvatar: AvatarId | null` (the persistence-layer enum written to `IDENTITY.md`) and `avatarSrc: string | null` (the visual avatar src committed by the new picker). The same docstring asserts: *"`pickedAvatar` (the enum) stays in sync for legacy callers."* The picker is the only writer the user touches; it MUST keep the two in sync, otherwise the user's pick never reaches the workspace.
**Where**:
- Picker writes only `avatarSrc`: `OnboardingPage.tsx:227-229` (`setAvatarSrc` callback, the only `onPick` wired into `<JourneyAvatar/>`).
- Submit reads only `pickedAvatar`: `services/onboardingTransaction.ts:295` — `const avatar: AvatarId = picks.pickedAvatar ?? avatarFromName(name);` — `pickedAvatar` is always `null` on the production submit path because no code in this PR (or pre-existing) sets it from the picker.
- Display reads `avatarSrc`: `JourneyReady.tsx:42-49` — PeopleCard renders the picked PNG. So the user *sees* their pick on Ready, then it's silently swapped for a name-hash enum on submit.
- Catalog of curated PNGs is added (`public/avatars/avatar-1.png` … `avatar-48.png` plus 8 person-*.jpg) and exposed via `avatar-catalog.ts`, but `PREMADE_AVATARS[*].id` is the file basename ("avatar-1") — there is no mapping back to the `AvatarId` enum (`'aurora' | 'graphite' | 'ember'`).
**Counter-search**: searched the repo for `setPickedAvatar`, every reader of `pickedAvatar`, and every writer to the journey state for an avatar field. No writer for `pickedAvatar` exists in `src/lobster_web/`. The same pattern is mirrored in the sandbox `JourneyShell.tsx:125-126` (only `setAvatarSrc` is provided to the step). Cross-checked the upload-tab path: the data URL also flows only into `avatarSrc` and is dropped at submit.
**Suggested fix**: pick one — either (a) delete the `pickedAvatar` enum field and write `avatarSrc` (or a stable PNG-id derived from it) into IDENTITY.md instead, OR (b) wire the picker's curated tile id and upload data URL into `pickedAvatar` via a mapping (PNG basename → upstream-known `AvatarId`, or extend the persistence layer to take a free-form src). Add a unit test that asserts: picking `avatar-1.png` causes IDENTITY.md content to reference that pick. Without the test, the next refactor in this area silently breaks the same way (see F4).

### F2 — [Major | block | drift:pr-code | W9] — Status: open
**Recommendation**: block — fix the PR body or fix the code; per `watches.md` W9 the bot does not yield on material claims.
**Invariant**: PR body C3 claims this PR delivers "JourneyAvatar — curated grid + upload toggle, dashed selected ring, batched scroll-snap with right-edge fade." The user-perceived contract of "curated grid + upload toggle" includes "the avatar I picked is the avatar that ends up on my agent." `watches.md` W9 names this kind of contract claim as material — non-negotiable.
**Where**: PR body §"Step ports" first bullet; substantiation lives in F1's evidence. The diff lands the visual surface and the interaction layer but not the persistence path; the PR body does not disclose this gap.
**Counter-search**: re-read the PR body in full looking for a caveat ("avatar pick is visual-only this wave," "persistence in a follow-up," etc.). None present. The "Production-readiness sweep" framing implies the entire onboarding arc is now production, which makes the silent-drop a more material claim drift, not less.
**Suggested fix**: cheaper side is to fix the code (per F1) and let the PR body's claim become true. If the persistence wiring is intentionally deferred, the PR body must say so explicitly — "user-picked avatar is collected for UX validation but not yet persisted; tracked in #..." — and the code should at minimum log a telemetry event so SRE sees how often picks would have been written.

### F3 — [Major | block | drift:code-code] — Status: open
**Recommendation**: block — restore the recovery affordance or wire an equivalent inline path.
**Invariant**: `src/lobster_web/src/App.tsx:194-216` `CapabilityBanner` is documented as the app's recovery surface for `auth-required` / `unconfigured` / `unreachable` capability states; the `Sign in` CTA on the banner is the user-facing handle for re-acquiring auth. The banner is suppressed on `/` because the LandingPage's editorial header carries an inline equivalent. Suppressing it on a route that has NO inline equivalent breaks the contract.
**Where**:
- New suppression: `App.tsx:624-625` — `const isOnboarding = location === '/onboarding'; if (isLanding || isOnboarding) return null;`. The inline comment claims "Auth-required state surfaces via the disabled CTA + a11y hint instead of the banner here."
- OnboardingPage's prop surface (`OnboardingPage.tsx:73-119`) accepts `client`, `submitOpts`, `refreshDetection`, `pairingClient`, `conversationId` — NO `capabilityStatus`, NO `onSignIn`. There is no disabled CTA gated by capability, no inline sign-in affordance.
- Failure path: a user who lands on `/onboarding` while `capabilityStatus === 'auth-required'` will walk the journey, click Start chatting, and `client.writeFile(IDENTITY.md, ...)` will fail with the auth backend's error string surfaced via the error toast at `OnboardingPage.tsx:474-491`. The toast is a fixed-position alert with no action — no Sign-in button, no Reload button.
- `JourneyHandoff.tsx:24-27` reinforces this assumption verbatim: *"'skipped' → ... The CapabilityBanner's sign-in seam handles auth follow-up if relevant."* — but the banner is suppressed on this route. The seam only reactivates after navigation to `/chat`, which does not happen if the user is stuck on a failed submit.
**Counter-search**: searched OnboardingPage, JourneyName, JourneyAvatar, JourneyReady, JourneyHandoff, and the new `services/onboardingHandoff.ts` for any auth-required surfacing. None render a Sign-in affordance. The error toast is the only failure surface, and it's no-action by design ("Setup failed while writing your agent identity: ..."). The base `main` HEAD `a08baef1` shows only `isLanding` in the suppression — the `isOnboarding` clause is new in this PR, so this is a regression introduced here.
**Suggested fix**: cheapest option — drop the `isOnboarding` suppression. The yellow banner above the typography-themed onboarding shell is a smaller chrome cost than a stranded user. If the editorial chrome trade-off is non-negotiable, OnboardingPage must accept `capabilityStatus` + `onSignIn` and render an inline Sign-in CTA when `capabilityStatus === 'auth-required'` — same shape that LandingPage uses on `/`. Either choice ships with a unit test that mounts OnboardingPage with `capabilityStatus='auth-required'` and asserts a Sign-in affordance is reachable.

### F4 — [Major | drift:code-tests] — Status: open
**Recommendation**: fix-before-merge — add the regression test that would have caught F1.
**Invariant**: `code.md` L5 — wire-format / persistence assertions ("the avatar the user picks is what gets written to IDENTITY.md") need a test that fails when the assertion breaks. `drift.md` drift:code-tests bullet — when code claims (in spec / docstring / PR body) an invariant, a test must exercise the *contract*, not the implementation detail beneath it.
**Where**:
- `tests/pages/OnboardingPage.unit.test.tsx:128-184` — the journey walk pins `seen[0] === 'IDENTITY.md'` and the panel-M-A path order. Never inspects content. There is no test for "the pick the user clicked appears in `IDENTITY.md`'s `**Avatar:**` line."
- `tests/components/onboarding/steps/JourneyAvatar.unit.test.tsx:104-124` — pins that clicking a curated tile fires `onPick` with `tile.src`. Stops at the parent boundary. Doesn't pin that the parent then forwards the pick into the submit transaction.
- `tests/services/onboardingTransaction.unit.test.ts` — pins ordering + sanitize semantics, takes `pickedAvatar` as input directly, never asks "would the page-level wiring have set this correctly?"
**Counter-search**: searched the test directory for any assertion involving an avatar PNG path passing through to a file write. None found. The flow walk picks `avatar-tile-avatar-1` then never re-inspects the avatar's fate.
**Suggested fix**: add an OnboardingPage-level test that picks a specific tile (`avatar-tile-avatar-1`), runs through to submit, and asserts the IDENTITY.md content captured at writeFile carries a marker derived from that pick (whichever side F1 ends up resolving — enum mapping or PNG path). Pair it with a similar assertion for the upload tab so both branches of the picker are pinned.

### F5 — [Minor | drift:code-code] — Status: open
**Recommendation**: fix-or-acknowledge — three code surfaces disagree on step order; pick one.
**Invariant**: `OnboardingPage.steps.ts:48-55` `STEP_DEFS` is the canonical step config (its docstring at lines 5-10 says "the single source of truth for the journey's step shape" — adding/reordering steps happens in `STEP_DEFS` once, projections update for free). Code surfaces that name the order in prose must agree with it.
**Where**:
- Canonical (`OnboardingPage.steps.ts:50-55`): name → avatar → **skills (Step 3) → habits (Step 4)** → ready.
- Disagrees: PR body §"Step ports" implicit ordering and the explicit "Test plan" list ("name → avatar → skills → habits → ready" — actually this part is correct in the test-plan checklist; the disagreement is below).
- Disagrees: `OnboardingPage.tsx:7-9` docstring — "Steps: name → avatar → habits → skills → ready → /chat."
- Disagrees: `tests/pages/OnboardingPage.unit.test.tsx:3` docstring — "(name → avatar → habits → skills → ready → /chat?welcome=1)" — but the test body at lines 87-110 walks **avatar → skills → habits**, matching production.
**Counter-search**: re-read `STEP_ANNOUNCEMENTS` ("Step 3 of 5: pick your skills" / "Step 4 of 5: pick your habits") to verify SR users hear the production order. They do, so no user-visible behavior bug — this is doc rot, not a behavior regression. Demoted from Major to Minor on that basis.
**Suggested fix**: align the two docstrings (`OnboardingPage.tsx:7` and the test header) with the production `STEP_DEFS` order. Five-second edit; eliminates a confusing read for the next person who walks the diff.

### F6 — [Minor | code | pre-existing] — Status: open
**Recommendation**: fix-or-acknowledge — file a follow-up issue if not in scope.
**Invariant**: `code.md` L5 — wire format is additive-only; visible-but-not-persisted UI surfaces are a category-error. The Upload tab in JourneyAvatar accepts a 4MB file, holds the resulting data URL on the journey state, displays it on the Ready summary card, then drops it on submit (folded into F1's root cause but distinct in shape — no enum mapping is plausible for a free-form upload).
**Where**: `JourneyAvatar.tsx:170-186` (`UploadAvatarPanel` calls `onPick(dataUrl)` which writes only `avatarSrc`); `services/onboardingTransaction.ts:295` (no upload handling); the upload-side code has no comment explaining the gap.
**Counter-search**: looked for any deferred-write path (queue, webhook, post-submit upload to a workspace asset directory). None exists. The 4MB cap (`UploadAvatarPanel.tsx:24` `MAX_BYTES = 4 * 1024 * 1024`) is the only constraint; there is no MIME validation either, but that's separate.
**Suggested fix**: short-term — disable the Upload tab behind a feature flag with a comment naming the deferred wiring. Long-term — write the data URL to `avatar.png` alongside `IDENTITY.md` (additive write, fits the panel-M-A sequence between phases 4 and 5), then have IDENTITY.md reference it. Tagged `pre-existing` because the gap was inherited from the prior single-PNG flow; the PR makes it more visible by promoting it to a tab in the new picker.

## Leading questions (non-blocking)

### LQ1 — [LQ | spec] — Status: open
There is no `src/lobster_web/CLAUDE.md`. The web layer's contract — including the load-bearing `pickedAvatar` enum vs `avatarSrc` string distinction documented only in `types.ts` — has no top-level home. Future PRs in this area lack grounding for review. Adding a `src/lobster_web/CLAUDE.md` documenting (a) the persistence-layer fields the picker steps must keep in sync, (b) the panel-M-A submit ordering, and (c) the Avatar step's curated/upload split would make F1-class drift detectable at design time. Cited at `src/lobster_web/`.

### LQ2 — [LQ | drift:code-code] — Status: open
`JourneyName.tsx:3` docstring says "Step 2: name your assistant." `OnboardingPage.steps.ts:50` puts `name` at index 0 (Step 1). Cosmetic but feeds the same doc-rot pattern as F5 — the in-component step labels should be derived from or named by the canonical `STEP_DEFS` rather than carrying a stale literal.

### LQ3 — [LQ | drift:code-code] — Status: open
`JourneyHandoff.tsx:24-27` docstring states the `'skipped'` case relies on "The CapabilityBanner's sign-in seam handles auth follow-up if relevant." If F3 is fixed by dropping the `isOnboarding` suppression, this comment becomes accurate again. If F3 is fixed by adding inline auth recovery to OnboardingPage, this comment needs updating to point at the new inline surface. Either way, the comment should be re-checked alongside the F3 fix.

---

> **Constraint 10**: if this PR merges with a Major finding ≥75% confidence, an issue will be auto-filed against `bic/lobster` with the finding skeleton and acceptance criteria.
