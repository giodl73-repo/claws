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
| 1 | [#72](https://github.com/giodl_microsoft/m/pull/72) | [group-01-foundation-runtime.md](local-openclaw/group-01-foundation-runtime.md) |
| 2 | [#73](https://github.com/giodl_microsoft/m/pull/73) | [group-02-policy-lifecycle.md](local-openclaw/group-02-policy-lifecycle.md) |
| 3 | [#74](https://github.com/giodl_microsoft/m/pull/74) | [group-03-dogfood-sidecar.md](local-openclaw/group-03-dogfood-sidecar.md) |
| 4 | [#75](https://github.com/giodl_microsoft/m/pull/75) | [group-04-node-policy-runtime.md](local-openclaw/group-04-node-policy-runtime.md) |
| 5 | [#76](https://github.com/giodl_microsoft/m/pull/76) | [group-05-local-tools-diagnostics.md](local-openclaw/group-05-local-tools-diagnostics.md) |
| 6 | [#77](https://github.com/giodl_microsoft/m/pull/77) | [group-06-gui-lobster-dogfood.md](local-openclaw/group-06-gui-lobster-dogfood.md) |

The original 12 Local OpenClaw slice plans remain in `local-openclaw/` as
source material for the grouped plans. The old PRs #35-#44, #57, and #58 were
closed in favor of #72-#77.

## Local OpenClaw Switch-Over Stack

| Step | Planned PR | Plan |
| --- | --- | --- |
| 1 | #78 | [01-provider-credential-independence.md](local-openclaw-switch-over/01-provider-credential-independence.md) |
| 2 | #79 | [02-managed-package-reliability.md](local-openclaw-switch-over/02-managed-package-reliability.md) |
| 3 | #80 | [03-browser-clipboard-capabilities.md](local-openclaw-switch-over/03-browser-clipboard-capabilities.md) |
| 4 | #81 | [04-local-app-workspace-write.md](local-openclaw-switch-over/04-local-app-workspace-write.md) |
| 5 | #82 | [05-m365-token-broker.md](local-openclaw-switch-over/05-m365-token-broker.md) |
| 6 | #83 | [06-ci-switch-over-dogfood.md](local-openclaw-switch-over/06-ci-switch-over-dogfood.md) |

This planned follow-up stack turns the Local OpenClaw proof into a practical
switch-over path from GitHub Copilot CLI. It pairs runtime foundations with the
high-risk capability families so reviewers can see model/provider independence,
managed package reliability, browser/clipboard/local-app/write/M365 capability
expansion, token isolation, CI, dogfood proof, and rollback as one coherent
six-PR sequence.

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
