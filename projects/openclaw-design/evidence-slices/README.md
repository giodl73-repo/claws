# OpenClaw Design Evidence Slices

These notes frame bounded proofs for high-value cross-facility gaps. They are
not implementation plans or normative RFCs.

| Slice | Status | File |
| ----- | ------ | ---- |
| Memory corpus lifecycle evidence | Source-framed; evidence contract proposed | `memory-corpus-lifecycle.md` |
| Authorized external-action evidence | Source-framed; evidence contract proposed | `authorized-external-action.md` |
| Release activation evidence bundle | Source-framed; evidence composition proposed | `release-activation.md` |
| Provider candidate attempt and usage | Source-framed; identity split revised | `provider-attempt-usage.md` |
| Remote node invocation trust | Source-framed; dispatch/settlement evidence proposed | `remote-node-invocation-trust.md` |
| Session export and deletion propagation | Source-framed; export/delete contracts split | `session-export-deletion-propagation.md` |
| Rust Gateway live admission | Implemented and merged; authenticated protocol 4 accepted and obsolete protocol 1 refused | `rust-gateway-live-admission.md` |
| Rust Gateway side-effect-free invocation | Implemented and merged; one owner-approved `system.which` executed and one undeclared command refused before Rust dispatch | `rust-gateway-side-effect-free-invocation.md` |
| Rust Gateway reconnect continuity | Implemented and merged; replacement connection retires old work, refuses its late result, and alone settles fresh work | `rust-gateway-reconnect-continuity.md` |
| Rust Gateway cold-restart continuity | Implemented and merged; fresh Gateway and Rust processes reuse durable pairing without renewed approval and execute fresh bounded work | `rust-gateway-cold-restart-continuity.md` |

Cross-slice result:
`evidence-header-comparison.md`.

Ranked portfolio:
`../enterprise-evidence-slices-2026-08-01.md`.
