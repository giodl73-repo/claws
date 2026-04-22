---
covers: [atom:ACS/severity-gating]
---

# Pitfalls: severity gates

The severity-gate model is simple but produces reliable surprises
when teams misconfigure it.

## P-01 · `severity-gate: warn` after a dependency bump

**Scenario**: Claws 0.1 → 0.2 adds 3 new G-rules (G-27, G-28, G-29).
A PR that was clean yesterday now shows 2 new WARN findings.

**Consequence without expectation**: CI fails, the PR author thinks
their code broke something.

**Fix**: communicate ahead of claws version bumps. Include the new
rules list in the release notes. Teams can re-baseline at `off`
temporarily while triaging.

## P-02 · BLOCK masquerading as WARN after policy drift

**Scenario**: A team manually relaxed a rule severity from BLOCK to
WARN in policy config. A new finding under that rule should block
but doesn't.

**Consequence**: the gate is silently less strict than the operator
thinks.

**Fix**: `claws doctor` flags policy drift from defaults. Run
`doctor` regularly to detect intentional-or-accidental relaxations.

## P-03 · `severity-gate: off` in production

**Scenario**: A team set `off` while onboarding and forgot to
tighten it. Six months later, actual BLOCKs are landing on main.

**Fix**: `claws-action` emits a warning annotation on every run at
`severity-gate: off` reminding operators to tighten the gate. The
warning is persistent — it never goes away until the gate is
changed.

## P-04 · Fleet gate inheritance

**Scenario**: Fleet `acme` sets `severity-gate: warn`. Individual
workspace `claws.json` sets `severity-gate: off` (for migration).
Operator expects workspace to win.

**Consequence**: fleet wins, because in the gate-inheritance model
the fleet is the policy owner. This is INTENTIONAL — a fleet admin
should be able to enforce a strictness floor.

**Fix**: if a workspace genuinely needs a laxer gate, the fleet
admin must add an exception to the fleet binding (named-workspace
opt-out). Workspace-local override of fleet gate is NOT supported.

## P-05 · SARIF upload failing silently

**Scenario**: The `github/codeql-action/upload-sarif` step fails
(token permission, path issue). Action exits 0 because the claws
step succeeded; findings never reach the security tab.

**Consequence**: findings emitted, invisible to reviewers.

**Fix**: the action fails loudly if the SARIF upload step fails.
The upload step is NOT optional. A failed upload sets the action
outcome to `failure` regardless of the findings gate.
