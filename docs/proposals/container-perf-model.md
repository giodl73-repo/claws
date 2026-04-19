# OpenClaw Compile — Performance Model

**Status**: Shareable one-pager
**Date**: 2026-04-17
**Related**: `docs/claws/proposals/aether-integration.md`, `docs/claws/proposals/container-threat-model.md`, `design/claws/specs/CL-04-compilation-pipeline.md`

---

## Context

This document covers the performance characteristics of the workspace-write → compile → replicate → rehydrate path, and compares two deployment options:

- **Option A — Aether hub**: a single authoritative compile site inside the aether pod (current plan).
- **Option B — Dual-compile with reconciliation**: a local-side optimistic compile + aether's authoritative compile running in parallel, reconciled by hash.

Threat-model invariants (Inv 1-4, see `container-threat-model.md`) hold under both options. Option B is an optional UX / DX accelerator on top of Option A — not a replacement.

---

## Small-Delta Property

Most writes are small. A 3-line edit to SOUL.md, TOOLS.md, or any of the 9 workspace files produces three independent deltas, each replicated only if it actually moved:

| Delta | Replicates when | Typical size |
|-------|----------------|--------------|
| **Workspace file diff** | Always (that's the user's edit) | ≤1 KB (unified diff) |
| **Policy artifact delta** | Only if compile produces a new artifact hash | 0 bytes (Class A) → ~1-5 KB (Class B) → up to full (Class C) |
| **Snapshot pointer** | Always bumps | ~200 bytes (id, parent_id, timestamps, hash) |

The container's RO workspace mount is a CAS-backed union view; a new snapshot pointer fetches only the changed blobs. The container doesn't redownload anything it already has.

---

## The Write Path — What Actually Moves

```
  user edit (3 lines)
      │
      ▼  PATCH /v1/workspace-write    ~0.5 KB    (unified diff)
  ┌──────────────────────┐
  │  Aether gateway      │   authN + validate
  └──────────┬───────────┘
             │  in-pod RPC       ~0.5 KB   (same diff forwarded)
  ┌──────────▼───────────┐
  │  claws compile       │   50-1000 ms depending on cascade
  │  + forest cache      │
  └──────────┬───────────┘
             │  returns {snapshot_id, content_hash, artifact_delta?}
  ┌──────────▼───────────┐
  │  Aether canonical    │   stores snapshot; hash-compares policy artifact
  └──────────┬───────────┘
             │
             ▼  push to container:   {ws_file_diff, policy_artifact_delta?}
  ┌──────────────────────┐
  │  Container RO view   │   updates file; swaps policy pointer if hash changed
  └──────────────────────┘
```

---

## Perf Classes — What 3 Lines Actually Cost

| Class | Edit example | Compile (warm) | Artifact delta | End-to-end target |
|-------|-------------|---------------|----------------|-------------------|
| **A — Cosmetic** | Agent personality, style guide, architecture note | ~50 ms (PARSE one file, all other phases cache-hit) | **0 bytes** — artifact hash unchanged | **~100-200 ms** |
| **B — Single rule** | `Risk: R5` annotation, one OBO scope, one tool ceiling | ~150 ms (PARSE + ANALYZE + re-emit one rule) | ~1-5 KB (JSON patch on one rule set) | **~300-400 ms** |
| **C — Cascading** | Fleet-inherited policy change, MEMORY.md label added that re-labels many data sources | 500-1000 ms (ANALYZE cascade through G-A2A-FLOW or G-CHAIN) | Up to full artifact (~50-100 KB) | **~1-2 s** |

Most edits are Class A. Free-form prose, code examples, architecture notes, personality — none of it changes the compiled policy hash, so none of it replicates beyond the workspace file diff.

---

## The Forest Cache

Per-phase per-workspace content-addressed cache. Pipeline:

```
PARSE  →  EXTRACT  →  ANALYZE  →  OPTIMIZE  →  EMIT
 ▲ miss     ▲ hit      ▲ hit       ▲ hit       ▲ hit
```

A 3-line SOUL.md edit misses PARSE for *that one file only*; every other phase reads the cached output of the prior phase keyed by the unchanged input hashes. That's why Class A is ~50 ms warm — you pay for one parse and a hash-compare cascade.

Cold compile (first write of the day, or after eviction) is 1-3 seconds. Warm is ~50-500 ms. The forest cache closes that gap.

---

## Option A — Aether Hub (current plan)

Single compile site inside the aether pod. Everything routes through one place.

**Flow**: user edit → HTTP PATCH → aether gateway → in-pod compile service → canonical → replicate.

**Pros**:
- Simplest mental model — one artifact, one hash, one canonical.
- Shared forest cache across all users of the same fleet policy (meaningful at scale).
- One compiler version to manage.

**Cons**:
- Every user interaction is a network round-trip. First diagnostic latency is bounded by RTT + compile: **~100-200 ms minimum** for Class A, **~1.1 s** for Class C.
- No offline story. Aether outage = no feedback.

**Latency table (per-keystroke-group)**:

| Phase | Time |
|-------|------|
| Network RTT (client → aether) | 20-50 ms |
| Gateway authN + validate | 5-10 ms |
| In-pod RPC to compile service | 5-10 ms |
| Compile (warm, Class A) | 50 ms |
| Return to client | 20-50 ms |
| **First diagnostic visible** | **~100-170 ms** |

---

## Option B — Dual-Compile with Reconciliation

Parallel compile: a local-side optimistic compile (advisory) + aether's authoritative compile. Reconciled by hash. File diffs still go up to aether; aether still owns canonical.

### Flow

```
  user edit (3 lines)
      │
      ├──────────────────────────┐
      ▼ local                    ▼ wire: PATCH /v1/workspace-write  ~0.5 KB
  ┌─────────────────┐       ┌─────────────────────┐
  │ Local compile   │       │ Aether gateway      │
  │ (advisory)      │       │ authN + validate    │
  │ ~10-50 ms       │       └──────────┬──────────┘
  │ returns         │                  │
  │ hash_local      │                  ▼
  │ + diagnostics   │       ┌─────────────────────┐
  └────────┬────────┘       │ Aether compile      │
           │                │ (authoritative)     │
           │                │ ~50-200 ms warm     │
           │                │ returns hash_aether │
           │                │ + artifact_delta    │
           │                └──────────┬──────────┘
           │                           │
           │                           ▼
           │                ┌─────────────────────┐
           │                │ Reconcile:          │
           │                │ hash_local ==       │
           └───────────────►│ hash_aether?        │
                            └──────────┬──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼ match            ▼ mismatch         ▼ local timeout
             proceed as usual    emit divergence     aether alone wins;
             container "paid"    event; aether's     no signal gained
             for diagnostics     artifact wins
```

### Where "local" can live — three tiers

| Location | Network to user | Compile cost | Best use |
|----------|----------------|--------------|----------|
| **Cowork client (WASM claws)** | 0 ms (in-browser) | ~50-200 ms | Instant lint while user types |
| **Container-local** | 0 ms (same pod) | ~50-200 ms | Agent-initiated writes (agent edits TOOLS.md) |
| **Aether-pod (Option A)** | 50-100 ms RTT | ~50-200 ms | Current path, authoritative |

Option B uses one of the first two alongside the third.

### Latency comparison

```
                      Option A           Option B
                      (aether-only)      (dual-compile)

  User keystroke
   ↓                  instant            instant
  Parse for lint      —                  ~10 ms     ◄ local
  First diagnostic    ~100-170 ms        ~10-50 ms  ← 5-15× faster
  Policy artifact     ~100-170 ms        ~150 ms    (unchanged)
  Canonical commit    ~200 ms            ~200 ms    (unchanged)
  Reconciliation      —                  background (no user wait)
```

**First diagnostic in 10-50 ms instead of 100-200 ms.** That's the UX delta — the difference between "feels live" and "feels like a server." It's the same reason client-side lint won over server-side lint in editors.

### What a hash mismatch means

Three root causes, each with a different response:

| Cause | Signature | Response |
|-------|-----------|----------|
| **Compiler version skew** | Container on `claws v1.2`, aether on `claws v1.3`. One emits a new field. | Expected during deploys. Version handshake on pod start; fail gracefully if skew > minor. Covered by Inv 4. |
| **Determinism bug** | Same inputs, same version, different output. Floating-point order, map iteration, baked-in timestamps. | Compile-time invariant failure. File a bug; fix the non-determinism. Determinism is a spec requirement (byte-identical artifact for given input hash). |
| **Attack** | Compromised compiler emits a plausible artifact that downgrades one R-tier but looks structurally normal. Hash differs from aether's. | Security event. Quarantine the local compile output, rotate user session, audit the delta. This is the signal we actually want. |

### Reconciliation logic

```
On each compile pair (hash_local, hash_aether):
  if hash_local == hash_aether:
    proceed; no audit event
  elif compiler_version_skew:
    emit compile_divergence_version_skew (info)
    use hash_aether
  elif first_mismatch_for_user_and_version_pair:
    emit compile_divergence_investigate (warn)
    use hash_aether
    start determinism-bug probe (diff artifacts, log structural delta)
  else:
    emit compile_divergence_security (critical)
    use hash_aether
    quarantine local compile output going forward
    freeze workspace until investigation clears
```

### What Option B buys

1. **Sub-100 ms diagnostic feedback.** Local compile returns before the aether round-trip completes. Matches IDE-lint expectations.
2. **Verification channel.** Aether's authoritative compile can catch tampering in the local compiler. The signal is actionable (quarantine, audit).
3. **Cheap offline story.** Local compile works without aether for linting/preview. Writes don't promote without aether, but the diagnostic surface stays alive during transient outage.
4. **Measured determinism.** Hash-compare across real traffic surfaces non-determinism bugs that unit tests miss. Free corpus.

### What Option B costs

1. **2× compile CPU** on writes. Most writes are Class A (≤50 ms warm) so this is cheap. Class C writes become 2 × 1 s = meaningful. Knob: skip local compile for edits that obviously cascade.
2. **Reconciliation logic.** New code path, new failure modes, new audit event class. Additional test surface.
3. **False-positive fatigue.** If determinism is flaky, the divergence signal gets ignored. The signal must stay high-precision or it is worse than useless.
4. **In-flight race window.** Between local-compile returning and aether-compile completing, a second edit can arrive. Manageable because local compile is advisory only — nothing material promotes on its word.

---

## Invariant Impact

Option B does not weaken any of the four invariants; it reinforces them.

| Invariant | Under Option A | Under Option B |
|-----------|---------------|----------------|
| **Inv 1** EROFS + write gateway | Unchanged | Unchanged — writes still route through aether |
| **Inv 2** Compiled policy authoritative | Aether is authoritative | **Reinforced.** Aether's compile produces canonical; local compile is advisory, same role as the guardrail-provider classifier |
| **Inv 3** snapshot_id + replay defense | Unchanged | Unchanged — artifact identity still comes from aether |
| **Inv 4** Versioned policy format | Semver handshake on pod start | **Extended.** Handshake now covers the local compiler too; version-skew divergence is recognizable |

New audit event class: `compile_divergence` — belongs in the same audit chain as ProducerEntry / DecisionEntry / ApprovalEntry (CL-12 approval-event-schema). Not a policy decision; an integrity signal.

---

## Staged Rollout

1. **Ship Option A first.** Aether hub; gets the trust architecture right. Current Horus plan.
2. **Add local compile as a lint-only layer.** WASM claws in Cowork client, or container-local compile for agent writes. No hash compare yet. User gets instant diagnostics; artifact still comes from aether. Low risk, high UX win.
3. **Flip on hash-compare reconciliation.** Once local compile is proven deterministic under real traffic, turn on verification and start auditing divergence.

Stage 2 alone captures 90% of the UX win. Stage 3 captures the security signal. Neither disrupts Inv 1-4.

---

## Open Perf Questions Worth Measuring

1. **Warm Class B P50/P99** for a realistic workspace (100 tools, 5 agents, fleet policy inheritance).
2. **Artifact hash change rate** — how often does a 3-line edit actually produce a new artifact hash? Intuition: <10%, but needs measurement. Tells us how often Class A semantics hold in practice.
3. **Forest cache hit rate under concurrency** — does hit rate hold up across concurrent workspaces in the same fleet, or do we hit eviction pressure?
4. **Blob replication tail under load** — Graph sync can mask or dwarf compile latency. What's the P99 from canonical to container?
5. **Divergence rate under Option B** — what fraction of dual-compile pairs mismatch? Below 0.1% = clean signal; above 1% = noisy, needs investigation before hash-compare flips on.

---

## Summary

The write path is small in both directions. Three-line edits move ~1 KB up and 0-5 KB down in typical cases. Compile is ~50-200 ms warm for most writes. The forest cache is what makes this viable under write-gateway-in-loop semantics.

Option A (current plan) ships the trust architecture. Option B adds a local optimistic compile for sub-100 ms diagnostic feedback; aether stays authoritative; hash-compare turns compiler determinism into a free verification channel.

Options are additive, not alternatives. Ship A, then layer B on.
