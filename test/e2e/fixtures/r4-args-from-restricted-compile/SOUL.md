# r4-args-from-restricted-compile fixture — SOUL

Expected decision verb: **review**. Expected audit signature:
`declaredTier: 'R4'`, `effectiveTier: 'R5'`, `effectiveSensitivity:
'RESTRICTED'`, `escalationSource: 'generator-compile-time'`.

Per CL-07 §1a, generator-compile-time escalation reads `args_from` and
elevates `effectiveTier` in `policy-ir.json`. Runtime provider reads the
compiled value — does NOT re-derive.

## Policy

- R4 declared + `args_from: RESTRICTED-classifier` → R5 at generate time.
- `policy-ir.json` carries the escalation; runtime preAuthorize returns
  review based on the compiled value.
- `escalationSource: 'generator-compile-time'` on the DecisionEntry.
