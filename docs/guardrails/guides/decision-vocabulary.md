---
covers: [atom:GRG]
---

# Decision vocabulary (package view)

The authoritative treatment of the 4-verb vocabulary, the composition
rule, and the risk-tier-×-sensitivity interaction lives at
[../../governance/decision-vocabulary.md](../../governance/decision-vocabulary.md).
This page is a package-scoped cheatsheet for `GuardrailProvider`
authors.

## The 4 verbs

| Verb     | Meaning                                                                       |
| -------- | ----------------------------------------------------------------------------- |
| `allow`  | Proceed as-is. Optional `requiresExternalApproval: true` still escalates.     |
| `deny`   | Reject with `reason`. No further processing; audited.                         |
| `review` | Route to supervisor with a signed `ApprovalHandle`. Call stalls.              |
| `modify` | Rewrite `args` (tool call) or `redirectPath` (file ingest) before proceeding. |

## Composition rule

```
deny > review > modify > allow
```

When multiple providers run against the same call, the runtime MUST
surface the highest-severity outcome. OC-7 merger makes
`requireApproval` non-downgradable — once any provider sets it, it
stays set for the decision lifetime; every `ApprovalDescriptor` the
plugins emitted is conjunctive (all must be approved).

See [../pitfalls/composition.md](../pitfalls/composition.md) for the
silent-allow failure mode this rule prevents.

## Effective tier

`effectiveTier = max(declaredTier, provenance-derived-tier)`. R5 is
terminal — never fail-open, never downgrade. See [GRR § R5
non-overridability](../specs/GRR-runtime.md).

## Cross-references

- [../specs/GRG-guardrail-provider.md § Decision vocabulary](../specs/GRG-guardrail-provider.md) —
  return type + HookResult shape
- [../specs/GRR-runtime.md](../specs/GRR-runtime.md) — fail-mode policy
  by tier
- [../../governance/decision-vocabulary.md](../../governance/decision-vocabulary.md) —
  full treatment with examples
