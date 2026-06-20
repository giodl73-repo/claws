# Admin Project

Use this area for admin-plane work across Lobster and OpenClaw: admin spaces,
managed policy baselines, Partner Center submission inputs, and tenant/global
settings models.

Feeds are related because feed settings may later use the same global-floor plus
tenant-subset model, but feed implementation and Scout catalog work belong in
`projects/feeds/` and `projects/lobster/feeds-scout.md`.

## Active Notes

| Area | File |
| --- | --- |
| Lobster admin spaces and managed policy baselines | `lobster-admin-spaces.md` |
| Partner Center registration | `partner-center.md` |
| Policy admin PR stack after feeds | `policy-admin-pr-stack.md` |
| Policy UX shape proposal | `policy-ux-proposal.md` |

## Current Stack

| PR | Branch | Purpose | Status |
| --- | --- | --- | --- |
| #2210 | `user/giodl/lobster-admin-spaces` | Design doc for Lobster admin spaces. | Merged |
| #2211 | `user/giodl/lobster-admin-spaces-runtime` | Runtime authorization primitives for deployment and tenant admins. | Merged |
| #2275 | `user/giodl/lobster-admin-policy-state` | Policy baseline state primitives with optional MOS3 artifact metadata. | Merged 2026-06-19 |
| #2270 | `user/giodl/lobster-admin-policy-bootstrap` | OpenClaw container policy baseline bootstrap. | Merged 2026-06-19 at `12772710` |
| #3355 | `user/giodl/lobster-scout-policy-cli` | Scout tenant feed policy preview command stacked after #2270. | Merged 2026-06-19 |
| #3383 | `user/giodl/lobster-scout-policy-polish` | Follow-up polish for Scout policy preview scope ordering, sanitized reason text, and help. | Merged 2026-06-20 at merge commit `af6bfa7c`; final head `ccb87b2ef` |
| #3388 | `user/giodl/lobster-personal-policy-mos3` | Personal policy baseline state, accepted only when MOS3-backed and equal-or-stricter than the tenant-effective baseline. | Merged 2026-06-20 at merge commit `f9278926`; final head `0b9f4af53` |
| #3391 | `user/giodl/lobster-policy-ux-gate` | URL-gated Policy UX preview with scope/section controls, strictness preview, and generated policy JSON; save path remains disabled. | Copilot feedback fixed; head `a07e8915e`; ADO `168861357`/`168861356` queued; blocked on GitOps PoP and refreshed review |

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
