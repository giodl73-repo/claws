# Policy Project

Policy work belongs in OpenClaw and RFC branches. This folder tracks the stack,
proof, and next PRs without using `claws-hapi` as a prototype repo.

## Active PRs

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| giodl73-repo/openclaw | [#3](https://github.com/giodl73-repo/openclaw/pull/3) | `policy-sandbox-allow-modes` | Draft open | Stack `sandbox.allowModes` on exec approvals as the P1 remainder. |
| openclaw/openclaw | [#99686](https://github.com/openclaw/openclaw/pull/99686) | `policy-doctor-fix-rules` | Draft open; stacked on #99121 | Add policy doctor fix-class metadata and structured recommendation output. |
| openclaw/openclaw | [#99690](https://github.com/openclaw/openclaw/pull/99690) | `policy-doctor-automatic-narrowers` | Draft open; stacked on #99686; Codex clean at `30c3cace63` | Add first safe automatic policy repair narrowers. |
| openclaw/openclaw | [#99700](https://github.com/openclaw/openclaw/pull/99700) | `policy-doctor-required-deny-repairs` | Draft open; stacked on #99690; Codex clean at `40d680cc50` | Add automatic repairs for required tool deny findings. |
| openclaw/openclaw | [#99720](https://github.com/openclaw/openclaw/pull/99720) | `policy-doctor-channel-ingress-repairs` | Draft open; stacked on #99700; Codex clean at `0df67e7360` | Add automatic repairs for channel ingress narrowing findings. |
| openclaw/openclaw | [#99731](https://github.com/openclaw/openclaw/pull/99731) | `policy-doctor-gateway-http-repairs` | Draft open; stacked on #99720; Codex clean at `ebd841a8ca` | Add automatic repairs for denied Gateway HTTP endpoints. |
| openclaw/openclaw | [#99776](https://github.com/openclaw/openclaw/pull/99776) | `policy-doctor-review-required-previews` | Draft open; stacked on #99731; Codex clean at `80ecc9cbcc` | Add review-required repair previews for Gateway bind and node-command policy findings. |
| giodl73-repo/openclaw | Unfiled | `policy-config-coverage-p2` | Pushed branch | Stack P2 config coverage bundle on `sandbox.allowModes`. |
| openclaw/openclaw | [#87826](https://github.com/openclaw/openclaw/pull/87826) | `feeds-policy-conformance-4pr` | Draft open; clean at `bb7ed067` | Feed catalog policy conformance. |

## Landed PRs

| Repo | PR | Purpose |
| --- | --- | --- |
| openclaw/openclaw | [#87074](https://github.com/openclaw/openclaw/pull/87074) | Reject unsupported policy keys. |
| openclaw/openclaw | [#90003](https://github.com/openclaw/openclaw/pull/90003) | Cover `exec-approvals.json` policy evidence and rules. Merged 2026-06-16 at `55263b3dfa416425f4fc4fdc60cd08d6e8bbb345`. |
| openclaw/openclaw | [#87081](https://github.com/openclaw/openclaw/pull/87081) | Add policy config coverage report. Merged at head `68973454`. |
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
| openclaw/rfcs | [#6](https://github.com/openclaw/rfcs/pull/6) | RFC addendum for exec approvals evidence. |
| openclaw/openclaw | [#94314](https://github.com/openclaw/openclaw/pull/94314) | Split policy doctor modules. Merged 2026-06-19 at head `0d876ce3`. |
| bic/lobster | [#3555](https://microsoft.ghe.com/bic/lobster/pull/3555) | MAC / Partner Center registration guidance refresh. Merged 2026-06-24 at head `44cc96c6`. |
| bic/lobster | [#3391](https://microsoft.ghe.com/bic/lobster/pull/3391) | Gated Policy UX preview. Merged 2026-06-20 at head `a07e8915`. |
| bic/lobster | [#3388](https://microsoft.ghe.com/bic/lobster/pull/3388) | Personal policy baseline state with MOS3-backed equal-or-stricter acceptance. Merged 2026-06-20. |
| bic/lobster | [#3383](https://microsoft.ghe.com/bic/lobster/pull/3383) | Scout policy preview polish. Merged 2026-06-20. |
| bic/lobster | [#3355](https://microsoft.ghe.com/bic/lobster/pull/3355) | Scout tenant feed policy preview for package-defense and MOS3 block-status metadata. Merged 2026-06-19. |
| bic/lobster | [#2270](https://microsoft.ghe.com/bic/lobster/pull/2270) | Bootstrap managed OpenClaw policy baselines. Merged 2026-06-19. |
| bic/lobster | [#2275](https://microsoft.ghe.com/bic/lobster/pull/2275) | Policy baseline state primitives with optional MOS3 artifact metadata. Merged 2026-06-19. |
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
- `projects/policy/lobster-system-run-node-policy-handoff.md` - Lorant handoff
  and policy follow-up for Lobster Gateway node-command allowlists, including
  the ECS-gated `system.run` overlay path.
- `projects/policy/policy-doctor-fix-rule-inventory.md` - current OpenClaw
  policy doctor finding inventory mapped to automatic, review-required, manual,
  validate-only, or unsupported fix classes.

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
- Lobster policy-admin baseline work has landed through the gated Policy UX
  preview and MAC registration refresh. Draft Lobster #3585
  (`user/giodl/lobster-personal-policy-upload`) adds the first live
  personal-policy accept route and web API client against the #3388
  equal-or-stricter MOS3-backed state path. Draft Lobster #3586
  (`user/giodl/lobster-policy-ux-save`) stacks on #3585 and wires the gated
  Policy UX save action to selected MOS3 artifact metadata. Draft Lobster
  #3588 (`user/giodl/lobster-policy-mos3-upload`) stacks on #3586 and adds the
  policy-specific MOS3 publish backend plus publish-before-accept UX flow.
  Draft Lobster #3590 (`user/giodl/lobster-policy-materialization`) stacks on
  #3588 and projects the selected effective baseline into OpenClaw starts for
  container materialization. Next after those is feed policy source selection
  and quarantine enforcement.
- Overall policy queue: decide whether to ready #87826 or advance the Lobster
  personal-policy upload/admin slice first.
- New policy gap from Lobster `system.run` node support: effective policy
  baselines cover tool posture and Gateway auth/http/exposure posture, but not
  `gateway.nodes.allowCommands`. Keep the runtime ECS overlay as the immediate
  fix path, and follow up with either OpenClaw Policy schema/doctor support for
  node-command posture or Lobster posture tests proving the baked allowlist
  stays minimal and only `OPENCLAW_GATEWAY_ALLOW_SYSTEM_RUN` can widen it.
