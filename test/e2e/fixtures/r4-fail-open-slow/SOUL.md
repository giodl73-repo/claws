# r4-fail-open-slow fixture — SOUL

Expected decision verb on RESTRICTED args: **review** (escalated).
Expected terminal on companion-stall + TTL-advance: **deny** (ttl-expired).

Per CL-07 §1a, a tool's `failOpen: true` declaration governs behaviour under
companion-unreachable OR generator-escalation conditions, BUT the R5-fail-
closed floor applies: TTL expiry is non-recoverable regardless of
`failOpen`. That is the R5 floor — non-uplift Rule 4 (CL-07 §1a Rules 1-4).

## Policy

- Tier ladder: R0 .. R5.
- R4 declared + RESTRICTED sensitivity at runtime → effective tier R5.
- `failOpen: true` + TTL expiry → deny (R5-floor invariant).
- `failOpen: true` + companion deny → deny.
- `failOpen: true` + companion allow → allow (after successful approval).
- Control: R4 declared + PUBLIC sensitivity → allow (no escalation).

## Notes

SC-04 is the interesting case — a regression that silently allows on
timeout for fail-open tools fails this scenario's F-02 and F-05 asserts.
