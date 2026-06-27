# ClawPilot PR Plan Files

These files are implementation-grade plans reverse-engineered from the current
ClawPilot proof stacks. They are meant for an AI or engineer to recreate the
code shape of each PR without treating the PR body as the only source of truth.

Each plan records:

- PR identity, branch, base, and status.
- Implementation objective.
- Code surfaces to create or edit.
- Behavioral contract and acceptance criteria.
- Tests/proof expected.
- Explicit non-goals.

## Local OpenClaw Stack

| Step | PR | Plan |
| --- | --- | --- |
| 1 | [#35](https://github.com/giodl_microsoft/m/pull/35) | [01-provider-discovery.md](local-openclaw/01-provider-discovery.md) |
| 2 | [#36](https://github.com/giodl_microsoft/m/pull/36) | [02-runtime-core-agent-roster.md](local-openclaw/02-runtime-core-agent-roster.md) |
| 3 | [#37](https://github.com/giodl_microsoft/m/pull/37) | [03-policy-session-foundation.md](local-openclaw/03-policy-session-foundation.md) |
| 4 | [#38](https://github.com/giodl_microsoft/m/pull/38) | [04-dogfood-lifecycle-transport.md](local-openclaw/04-dogfood-lifecycle-transport.md) |
| 5 | [#39](https://github.com/giodl_microsoft/m/pull/39) | [05-dogfood-ui-chat-routing.md](local-openclaw/05-dogfood-ui-chat-routing.md) |
| 6 | [#40](https://github.com/giodl_microsoft/m/pull/40) | [06-sidecar-package-dogfood.md](local-openclaw/06-sidecar-package-dogfood.md) |
| 7 | [#41](https://github.com/giodl_microsoft/m/pull/41) | [07-node-policy-evals.md](local-openclaw/07-node-policy-evals.md) |
| 8 | [#42](https://github.com/giodl_microsoft/m/pull/42) | [08-node-runtime-entrypoint.md](local-openclaw/08-node-runtime-entrypoint.md) |
| 9 | [#43](https://github.com/giodl_microsoft/m/pull/43) | [09-filesystem-read-handler.md](local-openclaw/09-filesystem-read-handler.md) |
| 10 | [#44](https://github.com/giodl_microsoft/m/pull/44) | [10-shell-exec-diagnostics.md](local-openclaw/10-shell-exec-diagnostics.md) |
| 11 | [#57](https://github.com/giodl_microsoft/m/pull/57) | [11-gui-dogfood-e2e.md](local-openclaw/11-gui-dogfood-e2e.md) |
| 12 | [#58](https://github.com/giodl_microsoft/m/pull/58) | [12-lobster-package-adapter.md](local-openclaw/12-lobster-package-adapter.md) |

## Cloud Agent Stack

| Step | PR | Plan |
| --- | --- | --- |
| 1 | [#45](https://github.com/giodl_microsoft/m/pull/45) | [01-tether-status.md](cloud-agent/01-tether-status.md) |
| 2 | [#46](https://github.com/giodl_microsoft/m/pull/46) | [02-hosted-roster.md](cloud-agent/02-hosted-roster.md) |
| 3 | [#47](https://github.com/giodl_microsoft/m/pull/47) | [03-runtime-routing.md](cloud-agent/03-runtime-routing.md) |
| 4 | [#48](https://github.com/giodl_microsoft/m/pull/48) | [04-session-binding.md](cloud-agent/04-session-binding.md) |
| 5 | [#49](https://github.com/giodl_microsoft/m/pull/49) | [05-hosted-chat-adapter.md](cloud-agent/05-hosted-chat-adapter.md) |
| 6 | [#50](https://github.com/giodl_microsoft/m/pull/50) | [06-desktop-capability-envelope.md](cloud-agent/06-desktop-capability-envelope.md) |
| 7 | [#51](https://github.com/giodl_microsoft/m/pull/51) | [07-approval-ux-contract.md](cloud-agent/07-approval-ux-contract.md) |
| 8 | [#52](https://github.com/giodl_microsoft/m/pull/52) | [08-audit-replay.md](cloud-agent/08-audit-replay.md) |
| 9 | [#53](https://github.com/giodl_microsoft/m/pull/53) | [09-lobster-policy-contract.md](cloud-agent/09-lobster-policy-contract.md) |
| 10 | [#54](https://github.com/giodl_microsoft/m/pull/54) | [10-device-routing.md](cloud-agent/10-device-routing.md) |
| 11 | [#55](https://github.com/giodl_microsoft/m/pull/55) | [11-rollout-readiness.md](cloud-agent/11-rollout-readiness.md) |
| 12 | [#56](https://github.com/giodl_microsoft/m/pull/56) | [12-degraded-mode-evals.md](cloud-agent/12-degraded-mode-evals.md) |
| 13 | [#59](https://github.com/giodl_microsoft/m/pull/59) | [13-protocol-transcript.md](cloud-agent/13-protocol-transcript.md) |
| 14 | [#60](https://github.com/giodl_microsoft/m/pull/60) | [14-hosted-dispatch-seam.md](cloud-agent/14-hosted-dispatch-seam.md) |
| 15 | [#61](https://github.com/giodl_microsoft/m/pull/61) | [15-hosted-adapter-composition.md](cloud-agent/15-hosted-adapter-composition.md) |
