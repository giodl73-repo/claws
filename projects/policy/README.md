# Policy Project

Policy work belongs in OpenClaw and RFC branches. This folder tracks the stack,
proof, and next PRs without using `claws-hapi` as a prototype repo.

## Active PRs

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| giodl73-repo/openclaw | [#3](https://github.com/giodl73-repo/openclaw/pull/3) | `policy-sandbox-allow-modes` | Draft open | Stack `sandbox.allowModes` on exec approvals as the P1 remainder. |
| giodl73-repo/openclaw | Unfiled | `policy-config-coverage-p2` | Pushed branch | Stack P2 config coverage bundle on `sandbox.allowModes`. |
| openclaw/rfcs | [#6](https://github.com/openclaw/rfcs/pull/6) | `policy-conformance-exec-approvals` | Draft open | RFC addendum for exec approvals evidence. |
| openclaw/openclaw | [#94314](https://github.com/openclaw/openclaw/pull/94314) | `policy-doctor-register-split` | Open; CI green, ClawSweeper re-review pending | Split policy doctor metadata, strictness, shared types/helpers, and scope-owned health checks/findings. |
| openclaw/openclaw | [#87081](https://github.com/openclaw/openclaw/pull/87081) | `policy-config-coverage-maintainer-tool` | Rebased 2026-06-19 to `373f83cd0e`; fresh CI pending; maintainer-review gated | Add policy config coverage report. |
| openclaw/openclaw | [#87826](https://github.com/openclaw/openclaw/pull/87826) | `feeds-policy-conformance-4pr` | Draft open | Feed catalog policy conformance. |
| bic/lobster | [#2270](https://microsoft.ghe.com/bic/lobster/pull/2270) | `user/giodl/lobster-admin-policy-bootstrap` | Open | Bootstrap managed OpenClaw policy baselines. |
| bic/lobster | [#2275](https://microsoft.ghe.com/bic/lobster/pull/2275) | `user/giodl/lobster-admin-policy-state` | Open | Add policy baseline state primitives. |

## Landed PRs

| Repo | PR | Purpose |
| --- | --- | --- |
| openclaw/openclaw | [#87074](https://github.com/openclaw/openclaw/pull/87074) | Reject unsupported policy keys. |
| openclaw/openclaw | [#90003](https://github.com/openclaw/openclaw/pull/90003) | Cover `exec-approvals.json` policy evidence and rules. Merged 2026-06-16 at `55263b3dfa416425f4fc4fdc60cd08d6e8bbb345`. |
| openclaw/openclaw | [#89596](https://github.com/openclaw/openclaw/pull/89596) | Recognize declared plugin/MCP tool allowlists. Merged 2026-06-18 at `fadbcf8a4e43d7f4384c49972fdaff17bb34e6d7`. |
| openclaw/openclaw | [#87056](https://github.com/openclaw/openclaw/pull/87056) | Data handling conformance checks. |
| openclaw/openclaw | [#86768](https://github.com/openclaw/openclaw/pull/86768) | Policy file comparison command. |
| openclaw/openclaw | [#85817](https://github.com/openclaw/openclaw/pull/85817) | Agent-scoped policy overlays. |
| openclaw/openclaw | [#85795](https://github.com/openclaw/openclaw/pull/85795) | Policy rule reference tables. |
| openclaw/openclaw | [#85744](https://github.com/openclaw/openclaw/pull/85744) | Ingress channel conformance checks. |
| openclaw/openclaw | [#85572](https://github.com/openclaw/openclaw/pull/85572) | Sandbox posture conformance checks. |
| openclaw/openclaw | [#85482](https://github.com/openclaw/openclaw/pull/85482) | Tool posture conformance checks. |
| openclaw/openclaw | [#85096](https://github.com/openclaw/openclaw/pull/85096) | Agent workspace conformance checks. |
| openclaw/rfcs | [#2](https://github.com/openclaw/rfcs/pull/2) | Policy Conformance 1.0 RFC. |
| bic/lobster | [#1051](https://microsoft.ghe.com/bic/lobster/pull/1051) | Policy 1.0, Workspace 1.0, and ClawPilot 1.0 specs. |
| bic/lobster | [#878](https://microsoft.ghe.com/bic/lobster/pull/878) | Policy proposal coverage in oc-harness. |
| bic/lobster | [#877](https://microsoft.ghe.com/bic/lobster/pull/877) | OpenClaw policy proposal drafts. |

## Source Notes

- `.craft/waves/260528+hapi-the-bringer+openclaw-feeds/lobster-openclaw-default-policy-baselines.md`
- `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/lobster-policy-baseline-config.md`
- `projects/policy/plugin-feed-policy-rfc-draft.md` - unpublished RFC draft for
  plugin feed policy conformance, dependent on openclaw/rfcs#19 hosted feeds.
- `projects/policy/agent-control-specification-plugin-proposal.md` - proposal
  for an ACS/AGT-authored OpenClaw runtime governance plugin, including
  provider-backed LLM judge integration.

## Next

- #90003 landed the `exec-approvals.json` evidence scope. RFC #6 remains the
  related spec thread; the landed implementation honors
  `OPENCLAW_STATE_DIR/exec-approvals.json` before falling back to
  `~/.openclaw/exec-approvals.json`.
- Keep giodl73-repo/openclaw #3 scoped to `sandbox.allowModes` until #90003
  lands or the branch can be restacked for an upstream OpenClaw PR.
- Keep `policy-config-coverage-p2` as the next stack layer for the P2 bundle:
  `tools.elevated.requireDefaultOff`, `tools.agentToAgent`, `tools.exec.allowSafeBinDirs`,
  and `plugins.allow` / `plugins.deny`.
- Keep named product artifacts as concrete file evidence, not broad runtime calls.
- Move Lobster integration only through Lobster PRs; do not prototype policy code in `claws-hapi`.
- Keep the plugin feed policy RFC draft local until RFC #19 settles the hosted
  feed config surface; then move it to an RFC worktree if we decide to file it.
