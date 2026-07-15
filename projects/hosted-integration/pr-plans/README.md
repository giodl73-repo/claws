# Hosted Integration PR Plans

Each file is the execution brief for one reviewable PR in
`../implementation-pr-series.md`.

| PR | Plan |
| --- | --- |
| A1 | `a1-rfc-contract.md` |
| A2 | `a2-hosting-profiles.md` |
| A3 | `a3-owner-readiness-registration.md` |
| B1 | `b1-provider-dispatch-local-seam.md` |
| B2 | `b2-network-guard-profile.md` |
| B3 | `b3-credential-slot-resolver.md` |
| B4 | `b4-capi-owner-adapter.md` |
| B5 | `b5-host-bundle-registration.md` |
| B6a | `b6a-binding-status-inventory.md` |
| B6b | `b6b-hosted-binding-doctor.md` |
| C1 | `c1-reverse-carrier-contract.md` |
| C2 | `c2-openclaw-reverse-endpoint.md` |
| C3 | `c3-lobster-reverse-dispatcher.md` |
| D1a | `d1a-openclaw-lobster-host-package.md` |
| D1b | `d1b-lobster-host-package.md` |
| D2a | `d2a-openclaw-capi-hosted-binding.md` |
| D2b | `d2b-lobster-capi-cutover.md` |
| D3a | `d3a-openclaw-substrate-owner.md` |
| D3b | `d3b-lobster-substrate-adoption.md` |
| D4a | `d4a-openclaw-webiq-owner.md` |
| D4b | `d4b-lobster-webiq-adoption.md` |
| D4c | `d4c-openclaw-anthropic-owner.md` |
| D4d | `d4d-lobster-anthropic-adoption.md` |
| D5a | `d5a-openclaw-acf-channel-owner.md` |
| D5b | `d5b-lobster-entra-obo-resolver.md` |
| D5c | `d5c-openclaw-graph-owner.md` |
| D5d | `d5d-lobster-agentic-user-resolver.md` |
| E1a | `e1a-openclaw-approval-host-surface.md` |
| E1b | `e1b-lobster-approval-client.md` |
| E2a | `e2a-openclaw-teams-endpoint-contract.md` |
| E2b | `e2b-lobster-teams-endpoint.md` |
| E3a | `e3a-openclaw-traffic-policy.md` |
| E3b | `e3b-lobster-enterprise-egress-policy.md` |
| E4a | `e4a-openclaw-continuity-restore-hold.md` |
| E4b | `e4b-lobster-continuity-restore-hold.md` |
| F1 | `f1-bundle-profile-activation.md` |
| F2 | `f2-mixed-version-observation.md` |
| F3 | `f3-downstream-egress-retirement.md` |
| F4 | `f4-compatibility-config-doc-cleanup.md` |

## Shared Merge Rules

- Upstream changes are independently useful OpenClaw factorings.
- Every file maps to one repository PR.
- Receiver and registry support lands before Lobster emits or selects it.
- Wire and registry PRs declare compatibility and version-skew behavior.
- Unknown required versions and fields fail closed.
- No governed hosted binding silently falls back to direct execution.
- Owners retain validation, activation, generation, and semantic retry.
- Lifecycle holds reuse the owner's generation and never create a parallel
  lease or generation domain.
- Cross-repository fixtures have one canonical owner.
- Downstream deletion waits for authority cutover, telemetry, rollback expiry,
  and mixed-version support expiry.
