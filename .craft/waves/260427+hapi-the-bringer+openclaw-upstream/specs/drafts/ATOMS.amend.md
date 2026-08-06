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

| Atom ID                           | Name                                                                                                             | Parent               | Needs                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------- |
| atom:UG                           | upstream governance                                                                                              | —                    | spec                    |
| atom:UG/contribution-sequence     | PR sequencing                                                                                                    | atom:UG              | guide                   |
| atom:UG/r5-pre-merge-guard        | R5 pre-merge guard                                                                                               | atom:UG              | spec                    |
| atom:UG/bot-reviewer-constraints  | Bot-reviewer trio + cap + concurrency + baseline-hash refresh                                                    | atom:UG              | spec + guide            |
| atom:UG/runtime-gated-enforcement | Runtime-gated governance via before_agent_start (replaces dropped OC-1/2/6)                                      | atom:UG              | spec + scenarios        |
| atom:UG/trust-set-lifecycle       | Signing-key registry, rotation, revocation, verification                                                         | atom:UG              | spec + scenarios        |
| atom:UG/approval-audit-events     | issued / resolved / expired audit lifecycle events                                                               | atom:UG              | spec + scenarios        |
| atom:UG/audit-attribution         | mandatory sourcePluginId on AuditEntrySummary; adversarial-plugin defense                                        | atom:UG              | spec + scenarios        |
| atom:UG/temporal-queries          | snap resolvePolicy --at <timestamp> for e-discovery answerability                                                | atom:UG              | spec + scenarios        |
| atom:UG/lint-catalog              | 13-code JSONC config lint surface in @openclaw/workspace/lint (UG-upstream §12)                                  | atom:UG              | spec + scenarios + plan |
| atom:UG/lint-severity             | three-tier severity (error/warn/note) with stable per-code assignment across point releases                      | atom:UG/lint-catalog | spec                    |
| atom:UG/schema-DI                 | LintSchema interface for schema-aware rules; engine schema-agnostic                                              | atom:UG/lint-catalog | spec + tests            |
| atom:UG/parse-emit-short-circuit  | plain-JSON detection short-circuits emit to native JSON.stringify for parity-or-faster common path               | atom:UG              | spec + plan             |
| atom:UG/oc-config-uri             | oc://config/<path> URI scheme proto for runtime config; lint findings carry it pre-PR-2 canonicalization         | atom:UG              | spec + plan             |
| atom:UG/closeable-issue-evidence  | each lint code traces to ≥1 real openclaw/openclaw issue; evidence frozen at EVIDENCE.md, regenerable via gh CLI | atom:UG/lint-catalog | spec + tests            |
| atom:UG/fixer-roadmap             | class-by-class auto-fixers ship in follow-up PRs after PR-1 detection-only baseline (UG-upstream §13)            | atom:UG/lint-catalog | spec                    |
```

## Diff vs current

Current `docs/upstream/ATOMS.md` has 3 atoms. After this amendment, 16 atoms (3 retained + 13 new across v0.2 + v0.3).

| Action     | Atom ID                           | Source                                                                              |
| ---------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| Retain     | atom:UG                           | unchanged                                                                           |
| Retain     | atom:UG/contribution-sequence     | unchanged                                                                           |
| Retain     | atom:UG/r5-pre-merge-guard        | unchanged (the R5 pre-merge guard remains in force per amendment §0 reader's guide) |
| Add (v0.2) | atom:UG/bot-reviewer-constraints  | UG-upstream.amend.md §2                                                             |
| Add (v0.2) | atom:UG/runtime-gated-enforcement | UG-upstream.amend.md §3                                                             |
| Add (v0.2) | atom:UG/trust-set-lifecycle       | UG-upstream.amend.md §4                                                             |
| Add (v0.2) | atom:UG/approval-audit-events     | UG-upstream.amend.md §5                                                             |
| Add (v0.2) | atom:UG/audit-attribution         | UG-upstream.amend.md §6                                                             |
| Add (v0.2) | atom:UG/temporal-queries          | UG-upstream.amend.md §7                                                             |
| Add (v0.3) | atom:UG/lint-catalog              | UG-upstream.amend.md §12                                                            |
| Add (v0.3) | atom:UG/lint-severity             | UG-upstream.amend.md §12.1                                                          |
| Add (v0.3) | atom:UG/schema-DI                 | UG-upstream.amend.md §12.2                                                          |
| Add (v0.3) | atom:UG/parse-emit-short-circuit  | claws-workspace-lint plan H3                                                        |
| Add (v0.3) | atom:UG/oc-config-uri             | UG-upstream.amend.md §12.4 + PR-2 of revised wave plan                              |
| Add (v0.3) | atom:UG/closeable-issue-evidence  | UG-upstream.amend.md §12.3                                                          |
| Add (v0.3) | atom:UG/fixer-roadmap             | UG-upstream.amend.md §13                                                            |

Domain-directory description prose also updated: original "the contribution roadmap, decide/track/enforce+review workflow, R5 pre-merge guard, PR sequencing, scope-flip at publish" extended with the v0.2 atom topics (bot-reviewer constraints, runtime-gated enforcement, trust-set lifecycle, approval-audit events, audit attribution, temporal queries) and the v0.3 lint surface (catalog, severity, schema-DI, short-circuit, oc-config-uri, evidence base, fixer roadmap).
