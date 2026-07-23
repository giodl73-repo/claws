# Three-Model Review

Date: 2026-07-23

This directory records three independent, read-only reviews of RFC 0018,
RFC 0023, their normative sidecar specifications, and the exact readiness and
Hosting Profiles implementation diffs.

| Review | Model | Mandate | Result |
| --- | --- | --- | --- |
| Architecture | GPT-5.6-Sol | Contract coherence and OpenClaw ownership | Request changes |
| Resilience | GPT-5.5 | Adversarial runtime, reliability, and security | Block |
| Maintainer | GPT-5.4 | API compatibility, repository fit, and landing shape | Request changes |

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

## Disposition

The foundational direction remains sound, and no reviewer found Lobster, OCC,
or AgentHarness coupling. The current package should not be presented as
conformant until these changes are made:

1. Enforce and redact provider results before caching or projection. Retain raw
   invocation ownership after timeout so a cancellation-ignoring provider
   cannot create overlapping work; bind cache and cancellation to registry
   generation.
2. Make `TrustedProxyReady` consume or prove the real authentication contract,
   including loopback behavior, and test authenticated ingress plus forged and
   direct-header rejection.
3. Keep unprofiled readiness byte-compatible. Emit activation and profile-only
   conditions only for a selected profile, or deliberately move a global
   activation contract into RFC 0018 and regenerate every protocol surface.
4. Consume the canonical effective node-command policy rather than rebuilding
   authorization semantics inside hosting readiness.
5. Either implement RFC 0023's host-visible result, operator inheritance,
   immutable conformance records, and full matrix, or narrow V1 to the standard
   profile subset this implementation actually delivers.
6. Align stable workspace reasons and deterministic condition ordering between
   both specs and code.

These are pre-landing contract corrections. They do not invalidate readiness
conditions or standard profiles as OpenClaw primitives; they make the proposed
support promise match what OpenClaw can enforce and test.
