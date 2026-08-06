# Admin Project

Use this area for admin-plane work across Lobster and OpenClaw: admin spaces,
managed policy baselines, Partner Center submission inputs, and tenant/global
settings models.

Feeds are related because feed settings may later use the same global-floor plus
tenant-subset model, but feed implementation and Scout catalog work belong in
`projects/feeds/` and `projects/lobster/feeds-scout.md`.

## Active Notes

| Area                                              | File                       |
| ------------------------------------------------- | -------------------------- |
| Lobster admin spaces and managed policy baselines | `lobster-admin-spaces.md`  |
| Partner Center registration                       | `partner-center.md`        |
| Policy admin PR stack after feeds                 | `policy-admin-pr-stack.md` |
| Policy UX shape proposal                          | `policy-ux-proposal.md`    |

## M5 Rendezvous Commitment

Lobster #867 now explicitly includes a tenant admin control to enable or
disable Scout through the Microsoft 365 admin center path. Merged #3555
documents registration and deployment boundaries but does not implement this
control. #5422 implements the runtime half: MAC/MOS3 owns native availability
for the existing Scout Teams app, while Lobster reads, caches, and enforces it
after operator enrollment. No profile, custom policy, or declarative agent is
added. Registration only needs to publish the existing package and supply its
per-environment MOS3 title ids; its stable AppId already exists. Keep deployment
availability separate from per-action user/Desktop approval.

See `projects/rendezvous/pr-plan.md`.

## Current Stack

| PR    | Branch                                        | Purpose                                                                                                                                                                                                 | Status                                                                                                                                                                                                                                                                                                                 |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #2210 | `user/giodl/lobster-admin-spaces`             | Design doc for Lobster admin spaces.                                                                                                                                                                    | Merged                                                                                                                                                                                                                                                                                                                 |
| #2211 | `user/giodl/lobster-admin-spaces-runtime`     | Runtime authorization primitives for deployment and tenant admins.                                                                                                                                      | Merged                                                                                                                                                                                                                                                                                                                 |
| #2275 | `user/giodl/lobster-admin-policy-state`       | Policy baseline state primitives with optional MOS3 artifact metadata.                                                                                                                                  | Merged 2026-06-19                                                                                                                                                                                                                                                                                                      |
| #2270 | `user/giodl/lobster-admin-policy-bootstrap`   | OpenClaw container policy baseline bootstrap.                                                                                                                                                           | Merged 2026-06-19 at `12772710`                                                                                                                                                                                                                                                                                        |
| #3355 | `user/giodl/lobster-scout-policy-cli`         | Scout tenant feed policy preview command stacked after #2270.                                                                                                                                           | Merged 2026-06-19                                                                                                                                                                                                                                                                                                      |
| #3383 | `user/giodl/lobster-scout-policy-polish`      | Follow-up polish for Scout policy preview scope ordering, sanitized reason text, and help.                                                                                                              | Merged 2026-06-20 at merge commit `af6bfa7c`; final head `ccb87b2ef`                                                                                                                                                                                                                                                   |
| #3388 | `user/giodl/lobster-personal-policy-mos3`     | Personal policy baseline state, accepted only when MOS3-backed and equal-or-stricter than the tenant-effective baseline.                                                                                | Merged 2026-06-20 at merge commit `f9278926`; final head `0b9f4af53`                                                                                                                                                                                                                                                   |
| #3391 | `user/giodl/lobster-policy-ux-gate`           | URL-gated Policy UX preview with scope/section controls, strictness preview, and generated policy JSON; save path remains disabled.                                                                     | Merged 2026-06-20 at head `a07e8915e`                                                                                                                                                                                                                                                                                  |
| #3555 | `user/giodl/lobster-mac-registration-refresh` | Refresh Partner Center / MAC registration guidance to align with Aether/Cowork MOS3 registration and runtime boundaries.                                                                                | Merged 2026-06-24 at head `44cc96c6`                                                                                                                                                                                                                                                                                   |
| #5422 | `user/giodl/scout-tenant-availability`        | Enforce native MAC/MOS3 availability for the existing Scout Teams app after operator enrollment.                                                                                                        | Non-draft/mergeable at `8feadccf92`; fail-closed cold resolution, last-known fallback, resolver/cache tests, and aligned ECS text are pushed. PullRequest rerun `173385787` is queued; Build Validation is blocked by the current-main web-bundle regression isolated in #5495. GitHubPop and refreshed review remain. |
| #5495 | `user/giodl/buildvalidation-web-dist`         | Restore Build Validation's published web-bundle handoff before the runtime Docker build.                                                                                                                | Open/mergeable at `7d76d8ff68`; focused contracts plus SDL validator suites pass. PullRequest `173387944` and Build Validation `173387953` are queued on merge `f044795806`; review and GitHubPop remain.                                                                                                              |
| #3585 | `user/giodl/lobster-personal-policy-upload`   | First live authenticated personal-policy accept route, requiring durable policy state plus MOS3 artifact metadata and OpenClaw comparison attestation.                                                  | Draft; ADO queued 2026-06-24                                                                                                                                                                                                                                                                                           |
| #3586 | `user/giodl/lobster-policy-ux-save`           | Stacked on #3585; wires gated Policy UX save to selected MOS3 artifact metadata and the personal-policy accept API.                                                                                     | Draft; ADO queued 2026-06-24                                                                                                                                                                                                                                                                                           |
| #3588 | `user/giodl/lobster-policy-mos3-upload`       | Stacked on #3586; adds policy-specific MOS3 publish backend and updates Policy UX save to publish before accepting returned artifacts.                                                                  | Draft; ADO queued 2026-06-24                                                                                                                                                                                                                                                                                           |
| #3590 | `user/giodl/lobster-policy-materialization`   | Stacked on #3588; projects the selected effective policy baseline into OpenClaw gateway start env for container materialization.                                                                        | Draft; ADO queued 2026-06-24                                                                                                                                                                                                                                                                                           |
| #3603 | `user/giodl/lobster-policy-review-fixes`      | Stacked on #3590; fixes review findings with durable publish gating, HMAC-backed OpenClaw comparison attestation verification, camelCase MOS3 pending fields, and locked temp-file policy state writes. | Draft; ADO queued 2026-06-24                                                                                                                                                                                                                                                                                           |
| #3607 | `user/giodl/lobster-feed-policy-sources`      | Stacked on #3603; records tenant-admin-selected attested tenant-approved feed policy sources in durable policy state.                                                                                   | Draft; ADO queued 2026-06-24                                                                                                                                                                                                                                                                                           |

## Current Read

- Feed publishing and approved-feed workflow work has landed enough that policy
  admin should be teed up again.
- #2275 landed as the narrow policy baseline state primitive layer with
  optional MOS3 artifact metadata.
- #2270 landed after #2275 and updated Lobster to preserve the current
  `openclaw@2026.5.28` / `@openclaw/diagnostics-otel@2026.5.28` package shape
  while adding the policy plugin. It passed Codex/Codeclaw review and landed
  after the symlinked parent creation, Rust 1.85, Docker warm-up policy-path,
  and final Dockerfile merge-forward fixes.
- Storage split: MOS3 governs durable policy baseline artifacts; Lobster stores
  the selected artifact metadata and materializes the effective policy into
  OpenClaw; OpenClaw evaluates local policy conformance.
- Add quarantine policy as a feed-aware admin slice: quarantined or failed
  package defense state blocks new discovery/install unless there is an explicit
  tenant or Microsoft exception outcome.
- #3355 landed the first admin/feed policy slice with `scout policy preview`,
  which verifies tenant-approved feeds and previews allowed/warning/blocked
  package outcomes from package-defense and MOS3 block-status metadata before
  install/discovery enforcement is wired in.
- #3555 refreshes the Partner Center prep doc for filing: Partner Center or
  Microsoft 365/Teams admin center remains the app-package registration path;
  MOS3 is the catalog/governance authority behind package acquisition, policy
  artifacts, package-defense state, and effective availability; Lobster is the
  runtime materialization layer.
- Cowork's `x-policies` pattern applies because Cowork already ships as a
  declarative agent. Scout currently ships as a Teams tabs app, and MAC already
  exposes native app availability/block controls for that title. #5422 now
  consumes the targeted MOS3 marketplace preview state (`acquisitionState` and
  tenant `scope`/`blockStatus`) instead of creating a synthetic declarative
  agent or Lobster-owned setting. Registration only needs the existing app's
  environment title ids; Lobster consumes/caches and enforces the native value.
- #3391 landed the gated Policy UX preview. #3585 adds the first live
  personal-policy acceptance route and matching web API client. #3586 stacks on
  it and wires the Policy UX save action to selected MOS3 artifact metadata.
  #3588 replaces manual artifact metadata with a policy-specific MOS3 publish
  backend and publish-before-accept save flow. #3590 projects the selected
  effective baseline into OpenClaw starts for container materialization. #3603
  closes review findings across the stack. #3607 records tenant-selected feed
  policy sources. Next is quarantine enforcement.

## Merge Order

1. #3383 policy preview polish: scope-before-attestation error ordering,
   readable/sanitized reason text, and explicit read-only help text.
2. #3388 personal policy MOS3 slice: accept a user personal policy only when it is
   equal-or-stricter than the effective tenant/global baseline, store the
   accepted artifact in MOS3, and record the selected artifact id/revision/hash
   for Lobster materialization into OpenClaw.
3. #3391 gated Policy UX preview: hidden unless `?enablePolicyUx=1` is present;
   gives Jesse/admin reviewers a real surface for section/scope shaping before
   connecting MOS3 persistence.

## Related Areas

- `projects/policy/README.md` for OpenClaw policy conformance and baseline
  policy surface.
- `projects/feeds/README.md` for OpenClaw feed primitives.
- `projects/lobster/feeds-scout.md` for Lobster Scout feed integration.
- `projects/lobster/README.md` for Lobster worktrees and LobsterTank.
