# r4-fail-open-slow fixture — TOOLS

## tool: summarize-leak

- declaredTier: R4
- capability: READ
- sensitivity: PUBLIC (baseline)
- failOpen: true
- ttlMs: 1000
- action: review (when args classified RESTRICTED)

R4 tool declared with `failOpen: true`. The **interesting** R5-floor test
case: a companion that never answers within TTL MUST still produce a
terminal `deny` — `failOpen: true` does NOT override `ttl-expired`.

Runtime classifier escalates to R5 + effectiveSensitivity RESTRICTED when
args carry a RESTRICTED-provenance field (SC-04 F-01). Control path
(non-RESTRICTED args) returns `allow` without a handle (SC-04 F-08).

SC-04 drives:
- `programVerdict({ kind: 'stall' })` (companion never answers)
- `fakeClock.advance(1001)` (past TTL)
- Expected: `result.decision === 'deny'`, `reason === 'ttl-expired'`,
  `ApprovalEntry.outcome === 'timeout'`, plugin fail-open path hit count 0.
