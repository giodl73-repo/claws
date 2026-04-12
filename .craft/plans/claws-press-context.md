---
slug: claws-press-context
preset: "claws"
plan: "2 headlines: PRESS compression reduces governance SKILL.md from 2400 to 1100 tokens at 92% quality, Context DAG achieves 70% storage reduction for 47-agent fleet"
area: claws
status: Draft
phase: thoth
atoms: [atom:press-pinch, atom:three-engine-model, atom:claws-relax]
specs: [CL-04, CL-06]
---

# claws-press-context — PRESS Compression + Context DAG

## Headlines

1. **H1: PRESS compression reduces governance SKILL.md from 2,400 to 1,100 tokens while maintaining 92% governance quality** — The PRESS-to-pinch mapping compresses L1 advisory SKILL.md prompts using 5 reusable PRESS modules (bipartite-split, quality-matrix, rewrite-rules, press-profiles, cache-contract) plus 2 new governance-specific modules (governance-cost-estimator, rule-ordering-optimizer). Pinch profiles define 4 governance density levels: G0 (minimal, 400 tokens), G1 (standard, 800 tokens), G2 (strict, 1,100 tokens), G3 (paranoid, 1,600 tokens). The quality matrix scores compressed output against 5 governance fidelity dimensions: rule coverage, risk accuracy, OBO preservation, tension visibility, and remediation actionability. A compressed SKILL.md at G2 density achieves 92% fidelity vs the uncompressed version at 54% token cost.
   - Validation: `pinch()` on a 2,400-token SKILL.md at G2 profile produces output <= 1,100 tokens
   - Validation: Quality matrix scores the G2 compressed output >= 0.92 on all 5 fidelity dimensions
   - Validation: G0 profile compresses to <= 400 tokens while maintaining >= 0.80 on rule-coverage and risk-accuracy

2. **H2: Context DAG achieves 70% storage reduction for a 47-agent fleet through structural sharing** — The Context DAG identifies shared governance context subgraphs across multi-agent sessions and deduplicates them. In a fleet with 47 agents sharing 80% of the same governance policy (common SOUL.md, shared TOOLS.md subset), the DAG stores shared subgraphs once and references them via content-addressed hashes. Each agent's GovernanceIR points to shared subgraph nodes for common rules and stores only the delta (agent-specific tool permissions, custom data labels). Compile-time context assembly resolves the DAG into per-agent GovernanceIR instances.
   - Validation: 47 agents with 80% shared policy produce a Context DAG with <= 30% of the naive per-agent storage
   - Validation: Per-agent GovernanceIR resolved from DAG is byte-identical to individually compiled GovernanceIR
   - Validation: Adding a new agent with 90% overlap increases DAG storage by <= 15% of a single agent's full IR

## Summary

This plan implements the two optimization engines from the Three-Engine Model (atom:three-engine-model, C06): PRESS compression for L1 advisory SKILL.md prompts and Context DAG for structural sharing across multi-agent sessions. PRESS compression directly reduces token cost for the advisory layer (the only layer that consumes tokens -- L2-L4 enforcement is zero-token via Gateway hooks). The Context DAG reduces compile-time storage and speeds fleet-wide governance operations by deduplicating shared policy fragments. Together they complete the optimization phase (Phase 4 of the compilation pipeline) that sits between analysis and emission.

## Coverage Contract

### Specs
- [ ] CL-04 -- Phase 4 OPTIMIZE: PRESS-to-pinch mapping, pinch profiles (G0-G3), dead-code elimination
- [ ] CL-06 -- PRESS module generalization (5/7 reusable), governance cost estimator, rule ordering

### Concept Guides
- [ ] docs/claws/optimization/press-pinch.md -- NEW: how PRESS generalizes to governance compression
- [ ] docs/claws/optimization/context-dag.md -- NEW: structural sharing, content-addressed subgraphs

### Scenario Coverage
- [ ] press/minimal-skill-compress -- compress a 600-token SKILL.md at G0, G1, G2 profiles
- [ ] press/large-skill-compress -- compress a 2,400-token SKILL.md at G2, verify quality >= 0.92
- [ ] press/fidelity-dimensions -- verify all 5 fidelity dimensions score independently
- [ ] press/profile-regression -- G3 profile output is strict superset of G2 content
- [ ] context/fleet-47-agents -- 47-agent fleet with 80% shared policy, verify 70% storage reduction
- [ ] context/dag-resolution -- resolve per-agent GovernanceIR from DAG, verify byte-identical to individual compile
- [ ] context/incremental-agent -- add agent to existing DAG, verify incremental storage cost
- [ ] context/dag-invalidation -- update shared policy fragment, verify all dependent agents invalidated

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 18 | Pinch profiles (4), quality matrix dimensions (5), governance cost estimator (3), rule ordering (2), DAG node hashing (2), subgraph dedup (2) |
| L1 integration | 7 | Full pinch pipeline per profile (4), DAG build + resolve (2), cache invalidation (1) |
| L2 e2e | 3 | Fleet-scale DAG with 47 fixtures, full PRESS compress + quality check, round-trip fidelity |
| L3 acceptance | 0 | No CLI acceptance yet (optimization is SDK-internal) |

## Scope

- `claws-sdk/src/optimize/pinch/pinch-profile.ts` (NEW) -- 4 governance density profiles (G0-G3) with token budgets and fidelity targets
- `claws-sdk/src/optimize/pinch/risk-matrix.ts` (NEW) -- Quality matrix: 5 governance fidelity dimensions, scoring function
- `claws-sdk/src/optimize/pinch/fix-rules.ts` (NEW) -- Governance-specific rewrite rules for auto-remediation suggestions in compressed output
- `claws-sdk/src/optimize/pinch/governance-cost-estimator.ts` (NEW) -- Token cost estimation for governance content (different algorithm from PRESS token-counter)
- `claws-sdk/src/optimize/pinch/rule-ordering-optimizer.ts` (NEW) -- Cost-based rule ordering for compressed output (governance-specific, not attention-based like PRESS)
- `claws-sdk/src/optimize/dead-code.ts` (NEW) -- Remove inapplicable governance rules (tools not in manifest, disabled rules)
- `claws-sdk/src/optimize/merge-checks.ts` (NEW) -- Combine redundant governance checks (same tool, compatible rules)
- `claws-sdk/src/optimize/materialize.ts` (NEW) -- DataFrame -> const objects for generated code (compile-time materialization)
- `claws-sdk/src/context/context-dag.ts` (NEW) -- Content-addressed DAG: subgraph nodes, hash-based dedup, per-agent delta storage
- `claws-sdk/src/context/context-press.ts` (NEW) -- PRESS compression adapter for context subgraphs

## Deliverables

### Specs & Design
- [ ] CL-04 amendment -- Phase 4 OPTIMIZE finalized: pinch profiles, dead-code, merge, materialize
- [ ] CL-06 amendment -- PRESS generalization confirmed: 5 modules backward-compatible, 2 new modules specified

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/optimize/pinch/pinch-profile.ts -- G0-G3 profiles with token budgets
- [ ] claws-sdk/src/optimize/pinch/risk-matrix.ts -- 5-dimension quality matrix
- [ ] claws-sdk/src/optimize/pinch/fix-rules.ts -- governance rewrite rules
- [ ] claws-sdk/src/optimize/pinch/governance-cost-estimator.ts -- token cost estimation
- [ ] claws-sdk/src/optimize/pinch/rule-ordering-optimizer.ts -- cost-based rule ordering
- [ ] claws-sdk/src/optimize/dead-code.ts -- inapplicable rule removal
- [ ] claws-sdk/src/optimize/merge-checks.ts -- redundant check merging
- [ ] claws-sdk/src/optimize/materialize.ts -- DataFrame materialization to const objects
- [ ] claws-sdk/src/context/context-dag.ts -- content-addressed governance DAG
- [ ] claws-sdk/src/context/context-press.ts -- PRESS compression for context subgraphs
- [ ] claws-sdk/tests/optimize/pinch/pinch-profile.unit.test.ts -- profile token budgets, fidelity targets
- [ ] claws-sdk/tests/optimize/pinch/risk-matrix.unit.test.ts -- 5 dimension scores, threshold checking
- [ ] claws-sdk/tests/optimize/pinch/governance-cost-estimator.unit.test.ts -- token counting accuracy
- [ ] claws-sdk/tests/optimize/pinch/rule-ordering-optimizer.unit.test.ts -- cost-based ordering
- [ ] claws-sdk/tests/optimize/dead-code.unit.test.ts -- rule removal for absent tools
- [ ] claws-sdk/tests/optimize/merge-checks.unit.test.ts -- compatible rule merging
- [ ] claws-sdk/tests/optimize/materialize.unit.test.ts -- DataFrame to const serialization
- [ ] claws-sdk/tests/context/context-dag.unit.test.ts -- node hashing, dedup, delta storage
- [ ] claws-sdk/tests/context/context-dag.integration.test.ts -- 47-agent fleet build + resolve
- [ ] claws-sdk/tests/context/context-press.unit.test.ts -- PRESS compression of context subgraphs
- [ ] claws-sdk/tests/fixtures/fleet-47/ -- 47-agent fixture set with overlapping policies

### Infrastructure Reuse
- [ ] Reuse `compiler-sdk/src/astro/ir/press/bipartite-split.ts` -- governed/ungoverned section split (type-parametric)
- [ ] Reuse `compiler-sdk/src/astro/ir/press/quality-matrix.ts` -- injectable governance config for quality scoring
- [ ] Reuse `compiler-sdk/src/astro/ir/press/rewrite-rules.ts` -- generic transition validator for fix-rules
- [ ] Reuse `compiler-sdk/src/astro/ir/press/press-profiles.ts` -- generic profile registry for pinch profiles
- [ ] Reuse `compiler-sdk/src/astro/ir/press/cache-contract.ts` -- generic cache contract for governance cache
- [ ] Reuse `compiler-sdk/src/astro/relax/` -- RELAX expression evaluation for policy compression decisions

### CLI Wiring
- None in this plan (optimization is SDK-internal -- CLI `claws pinch` already calls the pipeline)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- L1 SKILL.md emission (that's claws-emit plan -- this plan optimizes what emit produces)
- L2-L4 Gateway plugin optimization (zero-token enforcement, no PRESS needed)
- Full fleet management commands (that's fleet plan scope)
- PRESS module modifications in compiler-sdk (reuse via type parameters, not modification)
- Runtime PRESS evaluation (PRESS is compile-time only per CL-04 constraints)

## Notes

- 5 of 7 PRESS modules are reused via type parameters (backward-compatible generalization per CL-06). The 2 new modules (governance-cost-estimator, rule-ordering-optimizer) are claws-specific because governance token counting uses different heuristics than prompt compression, and rule ordering is cost-based (not attention-based).
- The quality matrix's 5 fidelity dimensions are governance-specific: (1) rule coverage (are all applicable rules represented?), (2) risk accuracy (are R-levels correct?), (3) OBO preservation (are OBO boundaries visible?), (4) tension visibility (are cross-file tensions mentioned?), (5) remediation actionability (can the agent act on the guidance?).
- Context DAG uses content-addressed hashing (SHA-256 of serialized subgraph) for deduplication. This is the same hashing approach as GovernanceIR cache but applied at subgraph granularity.
- The Three-Engine Model (C06) is: PRESS compresses L1 SKILL.md (token cost), Context DAG shares compile-time context (storage cost), Plugin enforces L2-L4 at zero tokens. This plan implements engines 1 and 2.
- Depends on claws-emit (needs SKILL.md emitter to have something to compress) and claws-governance-ir (needs GovernanceIR for DAG nodes).
- This plan has ZERO imports from craftworks-sdk -- enforced by tsconfig.json paths.
