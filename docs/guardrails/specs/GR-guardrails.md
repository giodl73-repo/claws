# GR — @bic/openclaw-guardrails (primary spec)

**Status**: Alpha · **Upstream target**: `@openclaw/guardrails` · **Supersedes**: CL-03, CL-07 (+ amendments), CL-12

## Package overview

The guardrails package is the runtime-governance core. Every policy
decision, every approval flow, every audit entry, every file-ingest
review passes through interfaces defined here.

## Exported subpaths

| Subpath     | Exports                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/provider` | `GuardrailProvider`, `FileIngestProvider`, `AuthorizationContext`, `HostContext` — see [GRG](./GRG-guardrail-provider.md), [GRF](./GRF-file-ingest.md) |
| `/audit`    | `AuditChainWriter`, `AuditChainReader`, `DecisionEntry`, `ApprovalEntry`, `ProducerEntry`, `verifyChain` — see [GRA](./GRA-audit-chain.md)             |
| `/handle`   | `ApprovalHandle`, `mintHandle`, `verifyHandle` — see [GRH](./GRH-approval-handle.md)                                                                   |
| `/host`     | `HostAdapter` interface + the 4 concrete adapters — see [GRD](./GRD-host-adapter.md)                                                                   |
| `/trust`    | `TrustSet`, `reloadTrustSet`, `TrustSetReloadFailure` — see [GRT](./GRT-trust-set.md)                                                                  |
| `/runtime`  | `enforce`, R5 guard — see [GRR](./GRR-runtime.md)                                                                                                      |

## Sub-spec index

| Code    | File                                                     | Authority over                                                |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| **GRG** | [GRG-guardrail-provider.md](./GRG-guardrail-provider.md) | `GuardrailProvider.preAuthorize`, decision vocab, composition |
| **GRF** | [GRF-file-ingest.md](./GRF-file-ingest.md)               | `FileIngestProvider.beforeIngest`, redirectPath invariant     |
| **GRA** | [GRA-audit-chain.md](./GRA-audit-chain.md)               | 10 entry types, cross-link schema, 4 sinks, sequence-counter  |
| **GRH** | [GRH-approval-handle.md](./GRH-approval-handle.md)       | 7-tuple binding, mint/verify, signature semantics             |
| **GRD** | [GRD-host-adapter.md](./GRD-host-adapter.md)             | 4-method host contract, 4 concrete adapters                   |
| **GRT** | [GRT-trust-set.md](./GRT-trust-set.md)                   | schema, fs.watch reload, reload failure handling              |
| **GRR** | [GRR-runtime.md](./GRR-runtime.md)                       | R5 non-overridability, fail-mode policy                       |

## Stability contract

Alpha. `GuardrailProvider.preAuthorize` and `FileIngestProvider.beforeIngest`
are the load-bearing async interfaces — field additions follow
semver-minor; signature changes follow semver-major. Audit entry schemas
are append-only (new fields allowed, no removals) until v1.0.

## Spec changelog

- **v0.1** (Horus wave) — absorbs CL-03, CL-07, CL-12; 7 sub-specs seeded.
