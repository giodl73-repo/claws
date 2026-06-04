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

## Current Stack

| PR | Branch | Purpose | Status |
| --- | --- | --- | --- |
| #2210 | `user/giodl/lobster-admin-spaces` | Design doc for Lobster admin spaces. | Merged |
| #2211 | `user/giodl/lobster-admin-spaces-runtime` | Runtime authorization primitives for deployment and tenant admins. | Ready; waiting on PoP/merge |
| #2275 | `user/giodl/lobster-admin-policy-state` | Policy baseline state primitives stacked on #2211. | Ready; waits for #2211 |
| #2270 | `user/giodl/lobster-admin-policy-bootstrap` | OpenClaw container policy baseline bootstrap stacked on #2275. | Ready; waits for #2275 |

## Merge Order

1. #2211
2. #2275
3. #2270

## Related Areas

- `projects/policy/README.md` for OpenClaw policy conformance and baseline
  policy surface.
- `projects/feeds/README.md` for OpenClaw feed primitives.
- `projects/lobster/feeds-scout.md` for Lobster Scout feed integration.
- `projects/lobster/README.md` for Lobster worktrees and LobsterTank.
