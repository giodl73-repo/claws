# Error Messages

<!-- atom:claws-error-messages (C11) -->

## Overview

claws treats error messages as the primary onboarding surface. Most developers encounter claws through a failed `claws pinch` or `claws build`, not through documentation. Every error message must be actionable, suggest the closest valid alternative, and point to stable documentation URLs. The `claws annotate` command extends this philosophy by adding governance annotations as remediation guidance.

---

## Closest-Value Suggestion

When a frontmatter field contains an invalid enum value, claws suggests the closest valid value:

```
error: invalid risk level "r4" in skills/send-email/frontmatter.yaml
  expected: R1 | R2 | R3 | R4 | R5
  did you mean: R4 (case-sensitive)
```

This applies to all enum-typed fields: risk levels, trust tiers, OBO values, fail modes, and platform targets. The suggestion algorithm uses edit distance, not fuzzy matching, to keep results predictable.

**YAML None/null ambiguity**: P-229 (YAML None parsed as null breaks obo field) is addressed with a specific error message. When YAML parses `obo: None` as null instead of the string "none", claws detects the null value and suggests `obo: "none"` with quotes:

```
error: obo field is null in skills/send-email/frontmatter.yaml
  hint: YAML parses bare None as null. Use obo: "none" (with quotes)
```

---

## Collect-All-Errors

claws validates frontmatter by collecting all errors before reporting, rather than stopping at the first error:

```
skills/send-email/frontmatter.yaml: 3 errors
  line 2: invalid risk level "r4" (did you mean R4?)
  line 5: obo field is null (use obo: "none" with quotes)
  line 8: unknown tool "sendemail" (did you mean "send-email"?)
```

Stopping at the first error forces the developer into a fix-one-rebuild-fix-another cycle. Collecting all errors lets the developer fix everything in one pass.

---

## URL Stability

Error messages include documentation URLs. These URLs follow a versioning policy:

| URL form | Stability |
|----------|-----------|
| `https://claws.dev/docs/errors/{code}` | Permanent per error code |
| `https://claws.dev/docs/guides/{topic}` | Stable across minor versions |
| `https://claws.dev/docs/v{major}/{path}` | Version-pinned for breaking changes |

URLs must not break when claws is upgraded. Error codes are permanent identifiers -- once assigned, an error code always resolves to documentation for that error, even if the error is later removed. Removed errors redirect to a deprecation notice.

---

## Annotate as Remediation

`claws annotate` adds governance annotations to existing skill files. When used as a remediation path, it transforms error messages into fixes:

| Error | Annotate fix |
|-------|-------------|
| Missing risk level | Adds `risk: R3` (default) with comment explaining derivation |
| Missing OBO flag | Adds `obo: false` with comment if no OBO heuristic matches |
| Undeclared tool | Adds tool declaration extracted from handler analysis |

The annotate command has defined heuristic accuracy bounds. It does not claim perfect accuracy -- annotations are suggestions that the developer reviews. False-positive and false-negative targets are documented:

| Metric | Target |
|--------|--------|
| False-positive rate (incorrect annotation) | < 5% |
| False-negative rate (missed annotation) | < 10% |
| Coverage (annotations attempted) | > 90% of governance fields |

When annotate cannot determine a value with sufficient confidence, it inserts a `# TODO: review` comment rather than guessing.

---

## Error Messages as Onboarding

For platform-specific differences, error messages explain why the current platform behaves differently:

```
warning: R5 tool "process-payment" on Cursor (advisory platform)
  Cursor cannot enforce R5 governance at runtime.
  The LLM may ignore the deny instruction.
  Consider: move R5 tools to OpenClaw or Bedrock targets.
  See: https://claws.dev/docs/guides/advisory-enforcement
```

This framing treats every error as a teaching moment. The developer learns about platform enforcement models through the errors they encounter, not through documentation they may never read.

---

## Security-Relevant Warnings

Warnings related to security (unsigned skills, advisory R5 enforcement, L0 identity) cannot be suppressed by `--quiet`. The `--quiet` flag silences informational output but not security diagnostics. This prevents a CI pipeline from silently hiding governance gaps.

---

## Scenario Sources

- **S04**: Validation errors and error message quality
- **S04-F04**: YAML None parsed as null breaks obo field (P-229)
- Skill-lifecycle FINDINGS-APPLIED.md: CL-05 (closest-value suggestion, collect-all-errors, YAML None/null disambiguation, URL stability, annotate heuristic accuracy bounds, error messages as onboarding, security warnings not suppressible)

---

## Related Concepts

- [Skill Scaffold](skill-scaffold.md) -- scaffolding that avoids these errors
- [Three-Tier Adoption](three-tier-adoption.md) -- tier violations as error context
- [OBO Boundary](../governance/obo-boundary.md) -- OBO field errors
