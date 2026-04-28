---
spec: UG (atom registry)
applies_to: docs/upstream/ATOMS.md
applies_at: deploy stage of wave 260427+hapi-the-bringer+openclaw-upstream
companion_to: UG-upstream.amend.md
---

# ATOMS.md amendment — UG domain (DRAFT)

When the wave deploys, the existing `docs/upstream/ATOMS.md` table is updated to add the new atoms introduced by `UG-upstream.amend.md` v0.2.

## Replacement table

The full replacement table to apply at deploy time:

```markdown
# upstream — Atom Registry

Domain directory for upstream governance — the contribution roadmap,
decide/track/enforce+review workflow, R5 pre-merge guard, PR sequencing,
scope-flip at publish, bot-reviewer constraints, runtime-gated enforcement
model, trust-set lifecycle, approval lifecycle audit events, audit
attribution, temporal queries. Extends CL-11.

| Atom ID | Name | Parent | Needs |
|---------|------|--------|-------|
| atom:UG | upstream governance | — | spec |
| atom:UG/contribution-sequence | PR sequencing | atom:UG | guide |
| atom:UG/r5-pre-merge-guard | R5 pre-merge guard | atom:UG | spec |
| atom:UG/bot-reviewer-constraints | Bot-reviewer trio + cap + concurrency + baseline-hash refresh | atom:UG | spec + guide |
| atom:UG/runtime-gated-enforcement | Runtime-gated governance via before_agent_start (replaces dropped OC-1/2/6) | atom:UG | spec + scenarios |
| atom:UG/trust-set-lifecycle | Signing-key registry, rotation, revocation, verification | atom:UG | spec + scenarios |
| atom:UG/approval-audit-events | issued / resolved / expired audit lifecycle events | atom:UG | spec + scenarios |
| atom:UG/audit-attribution | mandatory sourcePluginId on AuditEntrySummary; adversarial-plugin defense | atom:UG | spec + scenarios |
| atom:UG/temporal-queries | snap resolvePolicy --at <timestamp> for e-discovery answerability | atom:UG | spec + scenarios |
```

## Diff vs current

Current `docs/upstream/ATOMS.md` has 3 atoms. After this amendment, 9 atoms (3 retained + 6 new).

| Action | Atom ID | Source |
|---|---|---|
| Retain | atom:UG | unchanged |
| Retain | atom:UG/contribution-sequence | unchanged |
| Retain | atom:UG/r5-pre-merge-guard | unchanged (the R5 pre-merge guard remains in force per amendment §0 reader's guide) |
| Add | atom:UG/bot-reviewer-constraints | UG-upstream.amend.md §2 |
| Add | atom:UG/runtime-gated-enforcement | UG-upstream.amend.md §3 |
| Add | atom:UG/trust-set-lifecycle | UG-upstream.amend.md §4 |
| Add | atom:UG/approval-audit-events | UG-upstream.amend.md §5 |
| Add | atom:UG/audit-attribution | UG-upstream.amend.md §6 |
| Add | atom:UG/temporal-queries | UG-upstream.amend.md §7 |

Domain-directory description prose also updated: original "the contribution roadmap, decide/track/enforce+review workflow, R5 pre-merge guard, PR sequencing, scope-flip at publish" extended with the six new atom topics.
