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
| 1 | [#66](https://github.com/giodl_microsoft/m/pull/66) | [group-01-foundations.md](cloud-agent/group-01-foundations.md) |
| 2 | [#67](https://github.com/giodl_microsoft/m/pull/67) | [group-02-approval-policy.md](cloud-agent/group-02-approval-policy.md) |
| 3 | [#68](https://github.com/giodl_microsoft/m/pull/68) | [group-03-device-readiness-evals.md](cloud-agent/group-03-device-readiness-evals.md) |
| 4 | [#69](https://github.com/giodl_microsoft/m/pull/69) | [group-04-hosted-runtime.md](cloud-agent/group-04-hosted-runtime.md) |
| 5 | [#70](https://github.com/giodl_microsoft/m/pull/70) | [group-05-desktop-approval-gateway.md](cloud-agent/group-05-desktop-approval-gateway.md) |
| 6 | [#71](https://github.com/giodl_microsoft/m/pull/71) | [group-06-execution-transport.md](cloud-agent/group-06-execution-transport.md) |

The original 19 cloud-agent slice plans remain in `cloud-agent/` as source
material for the grouped plans. The old draft PRs #45-#56 and #59-#65 were
closed in favor of #66-#71.
