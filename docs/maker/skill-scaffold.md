# Skill Scaffold

<!-- atom:skill-scaffold (C11) -->

## Overview

`claws scaffold` generates a new skill directory with frontmatter, handler template, test stub, and configuration. The scaffold is designed to produce pinch-clean output from the first build -- a newly scaffolded skill should pass `claws pinch` without edits. Scaffold behavior adapts to the workspace trust tier to prevent immediate governance violations.

---

## Trust Tier Derivation

The scaffold derives the maximum risk level from the workspace's current trust tier:

| Workspace tier | Max scaffold risk | Reason                                           |
| -------------- | ----------------- | ------------------------------------------------ |
| T1             | R3                | T1 workspaces have limited enforcement           |
| T2             | R4                | T2 workspaces enforce up to R4                   |
| T3             | R5                | T3 enterprise workspaces support full risk range |

P-225 (scaffold risk exceeds workspace trust tier) drives this constraint. Without it, a developer in a T2 workspace could scaffold an R5 skill that immediately fails governance checks. The scaffold should not produce something that breaks on first build.

The `--tier` flag allows explicit risk level selection, but claws validates it against the workspace tier and warns if the selected risk exceeds what the workspace can enforce.

---

## Dependency Management

The scaffold checks for `@bic/claws-skill-kit` and handles installation:

1. **Already installed**: scaffold proceeds. Version alignment is checked between claws CLI and skill-kit package.
2. **Not installed**: claws offers guided install with the compatible version. The developer confirms before `npm install` or `pip install` runs.
3. **Version mismatch**: claws warns that the installed skill-kit version differs from the claws CLI version and suggests upgrading.

Automatic silent installation is never performed. The developer always sees what will be installed and confirms.

---

## OBO Auto-Suggestion

When the skill name contains heuristic keywords suggesting OBO behavior, `claws scaffold` suggests setting `obo: true` in the frontmatter:

| Keyword pattern                     | Suggestion                                                        |
| ----------------------------------- | ----------------------------------------------------------------- |
| `send-*`, `post-*`, `publish-*`     | "This skill name suggests it acts as the user. Set obo: true?"    |
| `delete-*`, `remove-*`, `destroy-*` | "This skill name suggests destructive actions. Set obo: true?"    |
| `pay-*`, `invoice-*`, `transfer-*`  | "This skill name suggests financial transactions. Set obo: true?" |

The suggestion is advisory. The developer can decline. OBO heuristics have defined accuracy bounds -- claws does not claim certainty from name patterns alone.

---

## Scaffold Output

A complete scaffold produces:

```
skills/{name}/
  frontmatter.yaml      # Risk level, OBO flag, tool declarations
  handler.ts            # Handler template with typed decorators (or handler.py)
  handler.test.ts       # Test stub with governance assertions
  .gitignore            # Excludes build artifacts
```

**Skill name vs directory name**: claws enforces consistency between the skill name in frontmatter and the directory name. A skill named `send-email` must live in `skills/send-email/`. Mismatches are a scaffold-time error.

**Pinch-clean guarantee**: the scaffold template is maintained to always pass `claws pinch` with default configuration. If a claws update changes pinch rules, the scaffold template is updated to match.

---

## Scaffold and Tier Interaction

The scaffold sets the initial trust tier to DECLARED. The developer can progress to VERIFIED (via `claws sign`) and TYPED (via adding typed decorators) after scaffolding. The scaffold does not attempt to produce TYPED output because the developer has not yet written the handler logic.

---

## Scenario Sources

- **S01**: Scaffold generation and governance alignment
- **S01-F01**: Scaffold risk exceeds workspace trust tier (P-225)
- Skill-lifecycle FINDINGS-APPLIED.md: CL-05 (scaffold risk derivation, dependency auto-install, OBO suggestion, name consistency, pinch-clean output, .gitignore template, --tier flag)

---

## Related Concepts

- [Three-Tier Adoption](three-tier-adoption.md) -- how tiers progress after scaffold
- [Error Messages](error-messages.md) -- diagnostics during scaffold
- [Tool Classification](../governance/tool-classification.md) -- R1-R5 risk levels
