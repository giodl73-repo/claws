# Latency Budget

Performance constraints for governance operations -- 50ms per hook, 200ms for LSP.

## Overview

Governance enforcement runs in the critical path of agent execution. Every millisecond spent on governance is a millisecond not spent on the task. The latency budget defines hard limits for governance operations to prevent enforcement from becoming a bottleneck.

## Budget Allocations

| Operation | Budget | Rationale |
|-----------|--------|-----------|
| Single hook execution | 50ms | Hooks run per-skill-call; must be imperceptible |
| LSP diagnostic cycle | 200ms | Editor responsiveness threshold |
| Full gate evaluation (G1-G4) | 500ms | Runs at pipeline boundaries, not per-call |
| CGR chain write | 10ms | Append-only, batched |
| Capability manifest scan | 1000ms | Runs once during build, not at runtime |

## Enforcement

Operations that exceed their budget are:
1. **Logged** -- a `CLAWS-PERF-001` diagnostic records the overage
2. **Completed** -- the operation finishes (no timeout kill)
3. **Flagged** -- fleet monitoring surfaces repeated overages

The budget is advisory for correctness (operations complete) but enforced for observability (overages are always visible).

## Optimization Techniques

- **Cached GovernanceIR** -- rules are pre-compiled, not re-parsed on every evaluation
- **Incremental update** -- only re-compile changed policy files
- **Sift fast-path** -- simple expressions evaluate without AST walk

## Related

- [GovernanceHost](governance-host.md) -- the enforcement interface
- [claws-lsp](claws-lsp.md) -- the 200ms LSP target
- `design/claws/ATOMS.md` -- C86 `atom:latency-budget`
