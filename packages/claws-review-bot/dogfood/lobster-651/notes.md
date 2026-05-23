# notes — claws-lobster-architect dogfood on bic/lobster#651

PR: `feat(lobster-web): port remaining onboarding steps + production-readiness pass` by `Jesse-Francisco`. HEAD `06dc7ab1bf7555a28201a797964489e95bc52a53`. 6709 additions, 2559 deletions, 111 files. ~10,993 line diff.

## R0 process — was the spec walk-up productive?

**Walk-up from each changed file (`specs.md` heuristic 1)**: most touched files live under `src/lobster_web/src/components/onboarding/` and `src/lobster_web/src/pages/`. There is no `CLAUDE.md` in `src/lobster_web/` or any of its subdirectories — only a `README.md` in `src/lobster_web/` and the root `CLAUDE.md` at the repo root.

The fallback chain in `specs.md` heuristic 1 — *"If no CLAUDE.md exists in any ancestor up to the repo root ... fall back to: nearest README.md, then root-level README.md and CONTRIBUTING.md, then any docs/architecture.md / docs/overview.md"* — fired productively. The two specs that grounded the review were:

- `src/lobster_web/README.md` — names the surfaces the web app talks to (aether `/v1/lobster/workspace/files*` for browse, `/v1/messages` for chat) and the `Contract — what NOT to put here` section. Useful orientation, no contract-class invariants.
- `CLAUDE.md` (root) — repo-level orientation. Names lobster_runtime + lobster_web + plex_mock as siblings, mentions the unified PR validation pipeline. No web-layer contracts.

The actually-load-bearing specs for this PR's findings were **inline contract docstrings**:

- `services/onboardingTransaction.ts:1-25` (panel-M-A submit ordering: IDENTITY → SOUL → AGENTS → skills → marker LAST) — pinned the F1 frame ("the picker writes; the submit reads").
- `components/onboarding/types.ts:60-79` (the `pickedAvatar` enum vs `avatarSrc` string distinction; the explicit comment *"`pickedAvatar` (the enum) stays in sync for legacy callers"* IS the contract that F1 violates).
- `components/onboarding/steps/JourneyAvatar.tsx:21-25` (Avatar step "commits a string src ... separate from the legacy enum `pickedAvatar` written to IDENTITY.md by the submit pipeline" — this is itself a comment that admits the drift, but the drift is real and silent on the user-experience side).
- `pages/OnboardingPage.steps.ts:48-55` (`STEP_DEFS` table as canonical step order) — pinned F5.

The R0 fallback heuristic in `specs.md` is **doing real work** on PRs in `src/lobster_web/`. Recommend keeping the explicit "no CLAUDE.md found — fall back to inline contract" path as a first-class outcome rather than a secondary rescue. **Verdict**: walk-up successful via fallback; no CLAUDE.md needed for this review to be grounded, but adding one (LQ1) would push F1-class drift to design time.

## Drift hypotheses → findings

| H | Hypothesis | Outcome | Finding |
|---|---|---|---|
| H1 | Avatar pick (avatarSrc) doesn't reach submit (pickedAvatar) | Confirmed | F1 (drift:code-code, block) + F2 (drift:pr-code, W9, block) |
| H2 | CapabilityBanner suppressed on /onboarding without inline replacement | Confirmed | F3 (drift:code-code, block) |
| H3 | PR body / OnboardingPage docstring step-order drift vs STEP_DEFS | Confirmed | F5 (drift:code-code, Minor) |
| H4 | No test fails if avatar pick is dropped | Confirmed | F4 (drift:code-tests, Major) |
| H5 | Upload-tab data URL silently dropped at submit | Confirmed | F6 (folded into F1's root cause, kept separate as Minor) |

## Other reviewer signal

- `Galin-Iliev` (changes-requested at this same HEAD): independently flagged P1 (avatar persistence) and P2 (banner suppression). My F1 + F3 corroborate Galin's findings with independent evidence. This is good — two independent code-grounded reviews converging on the same regressions is strong signal that a third human reviewer can validate quickly.
- `harryf` (peer-review, 11 approvals): named "design discipline" and the "WCAG 2.4.7 focus-ring fix" as wins. Did not surface F1/F3. Style-checklist tier review; not a substitute for contract review on a 6.7k-line diff.
- `dspektor` (4 APPROVALs): "lobster-fork posture: lean APPROVE on web-tier work" — explicit posture not to dig into web-tier behavior. Reasonable for a fork-coordination role; means F1/F3-class regressions need a different reviewer.
- `Copilot` inline review comments: 4 nits — `whileHover` conditional spread (already correct, code comment explains the intent), comment duplication in `InlineText.tsx`, non-null assertions in `name-suggestions.ts`. None of these are F1/F3 class.

## Findings the bot considered but dropped

- **`whileHover` conditional spread in AvatarGrid.tsx:321** — Copilot flagged this as potentially adding an `undefined` property. Re-read: with `exactOptionalPropertyTypes: true`, spreading `{}` does NOT add the key (the spread is empty), and the inline comment explicitly explains the choice. PR body C4 names this as the typecheck failure being fixed. Dropped at counter-search — the Copilot reading is wrong here.
- **`whileHover` is Pre-existing dead-callback à la PR #634 F1** — H4 was originally "look for a config-vs-code mismatch like the dead callback in #634." The avatar findings ARE the local equivalent (visible UI surface that doesn't reach persistence), but the shape is different — F1 is about the picker→persistence path, not a registered-but-never-invoked callback. Reframed during R3.
- **CSS injection / data URL XSS via UploadAvatarPanel** — considered W6-class. The data URL is set on `<img src>` only via React (escaped) and never written to a file (per F1, dropped at submit). No raw HTML injection surface. Dropped — would survive only if the data URL ever made it into a markdown body, which F1 says it doesn't.
- **Cross-repo paired aether PR (L7)** — the PR touches no aether wire format, no SSE event, no Pydantic alias, no shared schema. The new files write through the existing `AetherWorkspaceClient.writeFile` and `AetherTeamsPairingClient.pair` interfaces (both already shipped). No paired aether PR is needed for this diff. The PR is correctly scoped as web-only. Skipped L7 finding.
- **W7 import-time assertion** — none of the new files have module-level `assert` / network probes / env reads outside functions. Safe.
- **W8 fork-boundary leak check** — searched the diff for `claws`, `bic/`, `microsoft.ghe.com`, internal incident IDs. None present. Safe.
- **L1 Rust safety / L2 plex-mock contract / L3 OpenClaw shard / L4 Azure Linux build** — PR touches no Rust files, no plex-mock, no gateway/dispatch/snap-restore, no Dockerfile / pipeline YAML. Skipped per the "skip when" clauses in `code.md`.

## Voice-file feedback (v9+)

The voice files held up well on a large web-only PR. Three observations:

### 1. R0 fallback should be explicit about inline contracts as first-class

`specs.md` heuristic 1's fallback chain is README → root README → CONTRIBUTING.md → docs/architecture.md. Inline contract comments (the kind that powered F1's invariant citation) appear only in heuristic 6 (*"Inline contract comments: search the changed file for ..."*). On `src/lobster_web/` PRs the `README` is orientation-only and the actual contracts live in inline docstrings. Suggest reordering for the lobster_web case: when no CLAUDE.md found, **inline contracts in the changed area outrank a generic README**. This is what R0 did in practice; the file should match.

### 2. drift:pr-code material-claim discipline is paying off

Without W9's "material claim" framing, F2 would have looked like nitpicking ("the PR body says 'curated grid + upload toggle' and the diff delivers exactly that"). The material-claim test — "does a downstream reviewer reading this changelog one quarter from now act on the wrong information?" — pushes the finding through. F2 stands as written and Strong-tier yields ONLY on the author updating either the code or the body. Good shape.

### 3. Pre-existing modifier worth thinking about for F6

F6 was on the edge: the upload-tab → silent-drop pattern existed before this PR (single-PNG flow had the same gap). This PR makes it MORE prominent by promoting it to a tab. Watches.md "Pre-existing drift surfaced by this PR" branch fits cleanly — Default tier: Strong-with-modifier. Demoted to Minor in the verdict because the user-visible damage is small (compared to F1) and the pre-existing nature is honest. Mark this as a successful application of the pre-existing branch — without it, F6 would either have inflated to Major (overcounting) or been dropped (missing the prominence regression).

## Density check

6 findings + 3 LQs on a ~10k-line diff with major refactor + new components + new tests. Spot-check against the `voice.md` "ilygre density (3-8 findings is normal range)" guidance: in range, anchored by 2 reviewer-corroborated regressions (F1/F3 = Galin's P1/P2). Confidence is high on the four block-class findings. Without Galin's review I would have raised the same F1/F3 from the diff — the cross-check confirms the bot's signal isn't stale.

## Time / process

Single tick, single SHA. No `:hold` needed (PR not actively pushing — Galin's review is 2 hours stale; harryf approvals from `:approve`-class bots have been pinging on every push without surfacing F1/F3). Verdict was `block` because four findings hit Major-block tier; even one would have blocked.
