# Control UI Project

Use this area for hosting the version-matched OpenClaw Control UI inside
Lobster as the primary post-enrollment operator experience.

This project is narrower than `config-admin`: it owns the hosted UI route,
asset/version pairing, Lobster auth and Gateway relay integration, lockdown
presentation, and the migration away from duplicated Lobster SPA surfaces.
Field-level managed settings and schema authority still depend on OpenClaw's
generic config ownership work.

## Active Notes

| Area | File |
| ---- | ---- |
| Current session and resume state | `SESSION.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `bic/lobster` | [#6041](https://microsoft.ghe.com/bic/lobster/pull/6041) | `user/giodl/control-ui-hosting-design` | Draft design | Host the OpenClaw Control UI in Lobster with Lobster-owned auth, rollout, and enforced settings lockdown. |
| `bic/lobster` | [#6088](https://microsoft.ghe.com/bic/lobster/pull/6088) | `user/giodl/control-ui-hosting-runtime` | Draft implementation | Optional `/openclaw` static Control UI mount, version-matched asset staging, runtime host policy bootstrap, and hosted Gateway route. |
| `bic/lobster` | [#6113](https://microsoft.ghe.com/bic/lobster/pull/6113) | `user/giodl/control-ui-rollout-gate` | Draft stacked on #6088 | Process-scope ECS rollout gate for `/openclaw`, default hidden with live per-request rollback. |
| `bic/lobster` | [#6116](https://microsoft.ghe.com/bic/lobster/pull/6116) | `user/giodl/control-ui-root-cutover` | Draft stacked on #6113 | Separate process-scope ECS gate for redirecting `/` to `/openclaw/`, preserving `/web/` rollback and `/?health=1`. |
| `openclaw/openclaw` | [#115423](https://github.com/openclaw/openclaw/issues/115423) | n/a | Open umbrella issue | Host-controlled Control UI surface for embedded and managed deployments. |
| `openclaw/openclaw` | [#115408](https://github.com/openclaw/openclaw/pull/115408) | `user/giodl/control-ui-host-policy-main` | Draft main PR | Canonical generic opt-in host Control UI policy. |

## Delivery Shape

The current plan is one disposable proof before implementation PRs. First
slice is implemented locally in `C:\src\lobster-control-ui-proof`: Lobster can
serve an optional Control UI static bundle at `/openclaw` without touching the
Gateway relay or container allocation paths.

Remaining proof steps:

1. Extract one promoted Control UI artifact.
2. Prove the existing same-origin Gateway authentication seam.
3. Connect through Lobster's `/v1/openclaw-gateway` relay with read/write scopes only.
4. Load chat and one read-only settings page.
5. Deny a direct forbidden mutation server-side.
6. Flip the ECS flag off and return to the current Lobster SPA.

After the proof, keep the PR stack small:

- OpenClaw host access projection.
- Lobster hosted Control UI route and runtime method gate.
- OpenClaw config authority and field provenance.
- Lobster brokered config operations without browser admin.
- Lobster cohort acceptance and `/` cutover.
- Lobster deletion of replaced SPA surfaces.

## Working Lessons From Claws

- Keep the thesis and disproof criteria explicit before writing code.
- Prefer one vertical live proof over speculative infrastructure.
- Keep PR boundaries tied to release boundaries, rollback needs, or deletion
  evidence.
- Preserve standalone OpenClaw behavior when Lobster-specific policy is absent.
- Check live PR state, exact heads, and proof status before making readiness
  claims.
- Put detailed handoffs in `sessions/`; keep `SESSION.md` concise and current.

## Related Areas

- `projects/config-admin/README.md` for shared admin/config UX framing.
- `projects/hosted-integration/README.md` for host-runtime boundary contracts.
- `projects/managed-config/README.md` for deployment-owned config authority.
- `projects/admin/README.md` for tenant/global admin governance.
- `projects/ux-state/README.md` for Lobster SPA route and preview history.
- `projects/lobster/README.md` for Lobster worktrees and PR operations.
