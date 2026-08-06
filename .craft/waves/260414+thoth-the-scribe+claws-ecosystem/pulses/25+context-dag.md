---
pulse: 25
slug: context-dag
plan: claws-press-context
depends_on: [21, 22]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [lossless-roundtrip/S03, lossless-roundtrip/S04]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 25: Context DAG

## Objective

Implement a content-addressed DAG (Directed Acyclic Graph) for structural sharing across multi-agent fleets. In enterprise deployments with dozens of agents, most governance content is shared — common policies, shared risk frameworks, organization-wide OBO chains. The context DAG eliminates redundant storage by identifying shared governance subgraphs and storing per-agent deltas only.

**Content Addressing**: Each governance subgraph node is identified by its SHA-256 content hash. Identical policy fragments across different agents resolve to the same DAG node, regardless of which agent introduced them.

**Deduplication**: When building a fleet's governance context, the DAG identifies shared subgraphs (common policies, shared rule sets) and stores them once. Per-agent customizations (agent-specific risk overrides, local OBO additions) are stored as delta nodes that reference the shared base.

**Per-Agent Resolution**: Each agent's GovernanceIR is fully resolvable from the DAG — the resolution process walks from the agent's delta node through shared parents to reconstruct the complete GovernanceIR. The resolved output must be byte-identical to what individual compilation would produce.

**Storage Target**: A 47-agent fleet with 80% shared policy should achieve at least 70% storage reduction compared to individual per-agent compilation. DAG invalidation propagates correctly when shared policies change — all dependent agents' caches are invalidated.

## Deliverables

- [ ] `claws-sdk/src/context/context-dag.ts` — content-addressed DAG: subgraph nodes with SHA-256 hash, duplicate subgraph deduplication, per-agent delta storage, DAG resolution to per-agent GovernanceIR
- [ ] `claws-sdk/tests/context/context-dag.unit.test.ts` — L0: node hashing correct (1), duplicate subgraph deduplicated (1), per-agent delta stored (1), DAG invalidation on shared policy change (1)
- [ ] `claws-sdk/tests/context/context-dag.integration.test.ts` — L1: 47-agent fleet build achieves <= 30% storage (1), resolved GovernanceIR byte-identical to individual compile (1)
- [ ] `claws-sdk/tests/context/context-dag.e2e.test.ts` — L2: fleet-scale DAG build + resolve + invalidation (1)
- [ ] `claws-sdk/tests/context/context-dag.accept.test.ts` — L3: SDK acceptance — consumer builds a 47-agent DAG, resolves per-agent GovernanceIR, and verifies byte-identical output with >= 70% storage reduction
- [ ] `claws-cli/tests/context/context-dag.accept.test.ts` — L3: CLI acceptance — `claws press --dag` on fleet fixture produces correct per-agent output and reports storage savings
- [ ] `claws-sdk/tests/fixtures/fleet-47/` — 47-agent fixture set with 80% overlapping policies

## Acceptance Criteria

- [ ] DAG nodes are identified by SHA-256 content hash
- [ ] Identical governance subgraphs across agents are stored once
- [ ] Per-agent deltas are stored as separate nodes referencing shared base
- [ ] 47-agent fleet with 80% shared policy achieves >= 70% storage reduction
- [ ] Resolved GovernanceIR from DAG is byte-identical to individual compilation
- [ ] DAG invalidation propagates correctly when shared policies change
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] All 1 L2 e2e tests pass
- [ ] All 2 L3 accept tests pass (SDK + CLI)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies

- Pulse 21 (pinch-profiles) — profile definitions used during fleet-scale compression
- Pulse 22 (quality-matrix) — fidelity validation for resolved GovernanceIR

## Test Gates

- [ ] L0 unit (4 tests): node hashing correct, duplicate subgraph deduplicated, per-agent delta stored, DAG invalidation on shared policy change
- [ ] L1 integration (2 tests): 47-agent fleet build achieves <= 30% storage, resolved GovernanceIR byte-identical to individual compile
- [ ] L2 e2e (1 test): fleet-scale DAG build + resolve + invalidation
- [ ] L3 accept (2 tests): SDK — 47-agent DAG build + resolve with storage reduction; CLI — `claws press --dag` fleet output + savings report
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
