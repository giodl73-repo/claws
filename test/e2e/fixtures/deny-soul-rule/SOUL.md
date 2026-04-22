# deny-soul-rule fixture — SOUL

Expected decision verb: **deny**.

This SOUL.md carries an explicit named deny rule. Scenario SC-02 asserts
the resulting `DecisionEntry` has `decision === 'deny'`, carries the rule
name in the emitted plugin envelope, and the merger surface deterministically
resolves to deny on first pass (SC-02 F-01..F-05).

## Deny rules

### rule: prohibit-secrets-exfil

- match: any tool whose `capability` includes `network.http.write` **AND**
  any arg key matches the regex `(?i)secret|token|password|api[-_]?key`.
- action: deny
- reason: "Exfiltration pattern — outbound write with secret-shaped arg."

The scenario issues a tool call that hits both legs of the conjunction, so
the deny rule fires. Audit entry assertions check:

- `decision === 'deny'`
- `declaredTier === 'R3'` (tool self-declaration)
- `effectiveTier === 'R3'` (deny short-circuits uplift ladder)
- `modifiedArgsHash` absent (deny does not mutate args)
- `invalidReason` absent (deny is a valid terminal outcome)
