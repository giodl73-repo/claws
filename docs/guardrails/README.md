# @bic/openclaw-guardrails

The runtime-governance core of OpenClaw: `GuardrailProvider` interface,
decision vocabulary, audit chain, approval handle, host-adapter
contract. This is the package upstream contributions target.

## Two-letter code

**GR** — package primary. Sub-specs use 3-letter codes:
**GRG** (GuardrailProvider), **GRF** (FileIngestProvider), **GRA**
(audit chain), **GRH** (approval handle), **GRD** (host adapter),
**GRT** (trust set), **GRR** (runtime enforcement).

## Stability and upstream

- **Stability tier**: Alpha
- **Upstream target**: `@openclaw/guardrails`

## Contents

### Specs

- [GR-guardrails.md](./specs/GR-guardrails.md) — primary spec
- [GRG-guardrail-provider.md](./specs/GRG-guardrail-provider.md)
- [GRF-file-ingest.md](./specs/GRF-file-ingest.md)
- [GRA-audit-chain.md](./specs/GRA-audit-chain.md)
- [GRH-approval-handle.md](./specs/GRH-approval-handle.md)
- [GRD-host-adapter.md](./specs/GRD-host-adapter.md)
- [GRT-trust-set.md](./specs/GRT-trust-set.md)
- [GRR-runtime.md](./specs/GRR-runtime.md)

### Guides

- [approval-flow.md](./guides/approval-flow.md)
- [file-ingest-review.md](./guides/file-ingest-review.md)
- [decision-vocabulary.md](./guides/decision-vocabulary.md)
- [host-adapter-contract.md](./guides/host-adapter-contract.md)

### How-tos

- [inject-clock.md](./how-tos/inject-clock.md) — P-17 mitigation
- [reload-trust-set.md](./how-tos/reload-trust-set.md) — safe reload

### Pitfalls

- [composition.md](./pitfalls/composition.md)
- [path-and-binding.md](./pitfalls/path-and-binding.md)

### Scenarios

- [GRD/SC-01-openclaw.md](./scenarios/GRD/SC-01-openclaw.md)
- [GRD/SC-02-lobster.md](./scenarios/GRD/SC-02-lobster.md)
- [GRD/SC-03-aether.md](./scenarios/GRD/SC-03-aether.md)
- [GRD/SC-04-claws-service.md](./scenarios/GRD/SC-04-claws-service.md)

## Quick links

- [ATOMS.md](./ATOMS.md) — atom registry
- [CHANGELOG.md](./CHANGELOG.md) — version history
- [specs/GR-guardrails.md](./specs/GR-guardrails.md) — primary spec
