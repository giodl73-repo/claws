# r4-args-from-restricted-compile fixture — TOOLS

## tool: summarize-secrets

- declaredTier: R4
- capability: READ
- args_from: [{ source: 'RESTRICTED-classifier' }]
- action: review (effective R5 via generator-compile-time escalation)

R4 tool whose `args_from` chain binds a RESTRICTED-classified upstream
source. `claws policy generate` MUST walk the `args_from` graph at compile
time and elevate this tool's `effectiveTier` to R5 in the emitted
`policy-ir.json` (SC-05 F-01; G-CHAIN shipping path per proposal §5 row 2).

At runtime, the emitted provider reads the compiled R5 and returns
`{ decision: 'review', approvalHandle }` without re-deriving the
escalation (SC-05 F-02). `DecisionEntry.escalationSource:
'generator-compile-time'` distinguishes this compile-axis path from the
runtime-axis one in SC-06.
