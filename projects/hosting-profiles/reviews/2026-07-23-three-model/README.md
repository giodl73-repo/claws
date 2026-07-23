# Three-Model Review

Date: 2026-07-23

This directory records three independent, read-only reviews of RFC 0018,
RFC 0023, their normative sidecar specifications, and the exact readiness and
Hosting Profiles implementation diffs.

| Review | Model | Mandate | Result |
| --- | --- | --- | --- |
| Architecture | GPT-5.6-Sol | Contract coherence and OpenClaw ownership | Approve |
| Resilience | GPT-5.5 | Adversarial runtime, reliability, and security | Ship |
| Maintainer | GPT-5.4 | API compatibility, repository fit, and landing shape | Approve |

The prompt and final result for each review are retained. Transient CLI logs are
not retained because they contain verbose source traversal rather than review
conclusions.

## Independently Converged Findings

| Finding | Review agreement | Source validation |
| --- | --- | --- |
| Plugin provider output does not enforce the RFC reason, size, and redaction contract. | 3/3 | Confirmed |
| Profile activation changes unprofiled readiness and is absent from the canonical protocol schema. | 3/3 | Confirmed |
| `reverse-proxy` can report ready without proving that configured ingress can authenticate. | 2/3 | Confirmed |
| A provider that ignores cancellation can accumulate overlapping calls after timeout/cache expiry. | 2/3 | Confirmed |
| RFC 0023's machine-readable profile/source/activation projection is not implemented. | 2/3 | Confirmed |
| `WorkspaceMissing` is emitted but absent from RFC 0018's stable reason catalog. | 2/3 | Confirmed |

The architecture review also identified a confirmed node-mode ownership issue:
the readiness evaluator reconstructs part of command approval from raw config,
pairing, and live command arrays instead of consuming the canonical effective
node-command policy. The current test proves canonical config field names, not
agreement with the command authorization path.

## Final Disposition

All confirmed findings were fixed and re-reviewed. The final exact heads are:

- RFC 0018: `9e87932863c`
- readiness implementation: `c1919669c3f`
- RFC 0023: `98b0713d271`
- Hosting Profiles implementation: `40b5b2e59d9`

The corrections cover provider bounds/redaction, duplicate registration,
atomic config/registry publication, deterministic projections, bounded
workspace and pairing recovery, trusted-proxy ownership, unprofiled
compatibility, canonical command policy, activation defaults, and profile
attribution on failure. No reviewer found Lobster, OCC, or AgentHarness
coupling.

The original prompts and findings remain in this directory. The three
`final-*-result.md` files record the post-fix verdicts.
