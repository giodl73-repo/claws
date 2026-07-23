# GovernanceHost

The six-facet interface that connects the governance engine to the runtime execution environment.

## Overview

GovernanceHost is the contract between the claws governance engine and the host environment where agents execute. It exposes six facets that the governance engine calls during enforcement. Each host implementation (local, WorkIQ, cloud) provides its own GovernanceHost adapter.

## The Six Facets

| Facet                | What It Does                                     |
| -------------------- | ------------------------------------------------ |
| `evaluate(rule)`     | Evaluate a governance rule against current state |
| `enforce(action)`    | Apply an enforcement action (block, warn, log)   |
| `report(diagnostic)` | Emit a diagnostic to the host's output channel   |
| `query(expr)`        | Run a sift expression against workspace state    |
| `checkpoint()`       | Save governance state for crash recovery         |
| `health()`           | Report governance engine health status           |

## Host Implementations

```
  GovernanceHost (interface)
       │
       ├── LocalGovernanceHost    (in-process, file-based)
       ├── WorkIQGovernanceHost   (sandbox, gRPC transport)
       └── CloudGovernanceHost    (cloud functions, HTTP transport)
```

Each implementation adapts the six facets to the host's execution model. The local host reads workspace files directly. The WorkIQ host communicates via gRPC with the sandbox. The cloud host uses HTTP calls to a governance service.

## Relationship to ExecHost

GovernanceHost is parallel to ExecHost (the agent execution contract). ExecHost dispatches skills; GovernanceHost enforces policies. Both share the same host adapter pattern and are initialized together during workspace boot.

## Related

- [ExecHost](../../craft/concepts/exec-host.md) -- the agent execution contract
- [Three Rings Architecture](architecture-three-rings.md) -- inner/middle/outer rings
- `design/claws/ATOMS.md` -- C22 `atom:governance-host`
