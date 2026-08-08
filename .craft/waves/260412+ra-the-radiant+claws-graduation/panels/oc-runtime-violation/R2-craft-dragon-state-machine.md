# R2 — craft/dragon — Violation State Machine Review

**Spec**: CL-10 §State Machine (lines 1885–2003)
**Focus**: Correctness of states, transitions, invariants, PATCH matrix

---

## Findings

### F1: Missing lateral transitions between DEGRADED variants (MEDIUM)

The transition table only defines two lateral escalation paths: WARN→R5 and R5→STRUCTURAL. Missing:

- WARN → STRUCTURAL (direct structural violation while in WARN state)
- WARN → FLEET (fleet conflict while in WARN state)
- R5 → FLEET (fleet conflict while R5 violation active)
- FLEET → STRUCTURAL (structural violation while fleet-degraded)
- FLEET → R5 (R5 violation while fleet-degraded)
- STRUCTURAL → FLEET (fleet conflict while structurally degraded)

The "worst wins" invariant _implies_ these should resolve to the higher-severity state, but the severity ordering among DEGRADED variants is only partially defined. R5 > WARN is explicit. Where does FLEET rank relative to R5 and STRUCTURAL? Where does STRUCTURAL rank relative to FLEET? These are different failure modes with different enforcement semantics — they are not on a single severity axis.

**Risk**: Two orthogonal degradation types (FLEET + STRUCTURAL) have no defined composite state. "Worst wins" assumes a total ordering, but FLEET and STRUCTURAL are incomparable — one blocks a dependency chain, the other applies most-restrictive fleet interpretation. Both behaviors are needed simultaneously.

### F2: No DEGRADED_STRUCTURAL + DEGRADED_FLEET composite state (HIGH)

This is the specific "worst wins" gap. If an agent workspace has a broken trust chain (STRUCTURAL) AND a fleet policy conflict (FLEET) simultaneously, the system must pick one state. But the enforcement behaviors are distinct and non-overlapping:

- STRUCTURAL: block all tools in the affected dependency chain
- FLEET: apply most-restrictive interpretation of conflicting policies

Picking one loses the other's enforcement. The state machine needs either: (a) a composite state, (b) an explicit rule that STRUCTURAL subsumes FLEET (since blocking the chain is more restrictive), or (c) violation-level tracking that is independent of the single top-level state. Option (c) is already hinted at by the "scope field per violation" language, but the PATCH matrix and SSE events are keyed to the single state, not individual violations.

### F3: ERROR ← DEGRADED_* transition is under-specified for concurrent violations (MEDIUM)

The transition table says `DEGRADED_* → ERROR` triggers on "concurrent violation causes parse failure." But what if the system is in DEGRADED_R5 (one tool missing elicitation) and a _separate_ file becomes corrupt? The existing R5 violation is still real. The table says ERROR→CLEAN requires "zero violations," but ERROR→DEGRADED_* requires "violations remain." This correctly handles the case where the parse error is fixed but the R5 violation persists. However, the reverse recovery path (R5 violation fixed but parse error persists) stays in ERROR — which is correct but not explicitly stated.

No bug here, but the asymmetry deserves a note: violations are lost into ERROR and only re-emerge on partial fix. The system should track the full violation set, not just the top-level state.

### F4: Restart reconciliation is correct but has a cold-start gap (LOW)

The invariant says: "On startup, recompile determines actual state (may differ from persisted if files changed while server was down)." This is the right design — always recompile on startup, don't trust persisted state.

However: if the server starts for the first time (no `violation-state.json`, no last-good IR in the forest cache), and the workspace files have violations, there is no last-good IR to fall back to. The spec should define cold-start behavior: presumably compile, and if it fails, serve _nothing_ (hard block) until the admin fixes the workspace. This is implied by the "never accept a violation into GovernanceIR" invariant but should be explicit.

### F5: "Blocked for affected chain tools, normal for others" is enforceable but expensive (MEDIUM)

DEGRADED_STRUCTURAL's PATCH behavior says PATCHes targeting non-violation files are "blocked for affected chain tools, normal for others." This requires the PATCH middleware to:

1. Identify which tools are in the affected dependency chain
2. Determine whether the PATCH's target file contributes to those tools
3. Allow or block based on that mapping

This is a per-PATCH dependency-chain walk. The GovernanceIR must expose tool→file dependency edges, and the middleware must query them on every PATCH in STRUCTURAL state. This is implementable (the compilation forest already tracks dependencies), but the spec should acknowledge the cost and confirm the GovernanceIR exposes a `affectedChain(violation) → Set<tool>` query. Without it, implementors will approximate with file-level blocking (which is either too broad or too narrow).

### F6: Last-good IR eviction invariant vs. bounded cache (MEDIUM)

The invariant says: "The compilation forest retains the most recent clean GovernanceIR. It is never evicted while in any degraded/error state." The compilation forest is a bounded cache (per CL-04's forest design). If the cache has N slots and the system stays in DEGRADED state through N recompilation attempts (each producing a new violation variant), the last-good IR must survive all N evictions.

This requires the last-good IR to be _pinned_, not just retained by recency. A standard LRU/bounded eviction policy will evict it once enough newer (but violating) compilations push it out. The spec should say "pinned" not "retained" — the implementation must exempt it from normal eviction, not just hope it stays recent enough.

### F7: No transition from CLEAN back to itself on clean recompile (TRIVIAL)

The diagram shows recompile-produces-violations as the only trigger out of CLEAN. A file-change that triggers recompile but produces zero violations should be a CLEAN→CLEAN self-transition. This is implied (no state change = stay in CLEAN) but the SSE invariant says "SSE on every transition." Should a CLEAN→CLEAN non-transition emit an SSE event? Probably not, but the invariant as written is ambiguous. Recommend: "SSE on every _state change_" not "every transition."

---

## Verdict

**CONDITIONAL PASS** — The state machine is fundamentally sound: all states have a path back to CLEAN, there are no dead states, and the recovery flow is correct. The two blocking issues are:

1. **F2** (HIGH): STRUCTURAL + FLEET has no defined behavior. The "worst wins" rule assumes a total ordering that does not exist for orthogonal failure modes. Must define composite behavior or explicit subsumption rule.
2. **F6** (MEDIUM): "Never evicted" requires pinning semantics in the bounded forest cache, not just a retention hope. Without this, a long degraded period with repeated recompilation attempts will evict the last-good IR.

The remaining findings (F1, F3, F5, F7) are specification clarity issues, not correctness bugs. F4 is a cold-start edge case that should be documented but does not block.
