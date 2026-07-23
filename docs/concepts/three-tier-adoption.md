# Three-Tier Adoption

<!-- atom:three-tier-adoption (C11) -->

## Overview

claws uses a three-tier trust model for skill governance: DECLARED, VERIFIED, and TYPED. Each tier represents increasing confidence that a skill's governance metadata (risk level, OBO flag, tool classification) is accurate. Tiers are detected from workspace state, not stored in skill metadata. This prevents stale tier claims and ensures that governance confidence reflects current reality.

---

## Tier Detection from State

Tiers are not self-declared labels -- they are derived from the current workspace state at build time:

| Tier     | Detection criteria                                         | Confidence                                      |
| -------- | ---------------------------------------------------------- | ----------------------------------------------- |
| DECLARED | Frontmatter present, no verification                       | Self-reported. May be inaccurate.               |
| VERIFIED | Frontmatter + manifest signature valid + handler unchanged | Verified at signing time. Signature is fresh.   |
| TYPED    | Frontmatter + decorator types + static analysis pass       | Compiler-verified. Governance enforced in code. |

**Why state, not metadata?** If tiers were stored in skill metadata, a developer could publish a VERIFIED skill, modify the handler, and retain the VERIFIED label. Detecting from state means that any handler modification invalidates the VERIFIED tier automatically (P-227: stale VERIFIED badge after handler modification).

Signature staleness detection: when a skill's `handler.ts` (or `handler.py`) has been modified since the last manifest signing, claws downgrades the tier from VERIFIED to DECLARED and emits a diagnostic.

---

## Prompt-Only Tier Ceiling

Skills that exist only as prompt instructions (no executable handler) are capped at DECLARED or VERIFIED. They cannot reach TYPED because there is no code to type-check:

| Skill form       | Maximum tier | Reason                      |
| ---------------- | ------------ | --------------------------- |
| Prompt-only      | VERIFIED     | No code for static analysis |
| Handler + prompt | TYPED        | Full analysis possible      |
| Handler only     | TYPED        | Full analysis possible      |

This ceiling prevents prompt-only skills from claiming the highest governance confidence. A prompt-only skill can be signed (VERIFIED) but cannot be compiler-verified (TYPED) because there is nothing to verify beyond the frontmatter.

Frontmatter-to-decorator value propagation: when `claws import` processes a skill, frontmatter values (risk, obo, tools) are propagated to decorator parameters in the generated handler scaffold. This ensures that the TYPED tier can be reached without manual transcription.

---

## Enterprise Enforcement

Enterprise deployments (T3 workspaces) can enforce minimum tier requirements per risk level:

| Risk level | Minimum tier | Rationale                                 |
| ---------- | ------------ | ----------------------------------------- |
| R1-R2      | DECLARED     | Low risk, self-report sufficient          |
| R3         | VERIFIED     | Medium risk, signature required           |
| R4-R5      | TYPED        | High risk, compiler verification required |

The tier-per-risk enforcement is configured in `claws.json` under `governance.enterprise.tierPolicy`. When a skill does not meet the minimum tier for its risk level, `claws check` reports a violation and `claws build` refuses to emit guard code for that skill.

**Data sensitivity override**: skills handling data classified as CONFIDENTIAL or higher require one tier above the risk-level default, even at R1-R2. A DECLARED R1 skill reading CONFIDENTIAL data must be at least VERIFIED.

---

## Adoption Path

The three-tier model supports progressive adoption:

1. **Day 1**: developer adds frontmatter to skills. All skills are DECLARED. `claws build` works.
2. **Week 1**: developer runs `claws sign` to verify skills. High-value skills become VERIFIED.
3. **Month 1**: developer adds typed decorators. Critical skills become TYPED. Enterprise policies enforceable.

Each step is optional. A workspace can remain at DECLARED indefinitely for personal use. Enterprise enforcement only activates when the workspace trust tier is T3.

---

## Scenario Sources

- **S02**: Tier detection and badge accuracy
- **S02-F06**: Signature staleness detection + tier downgrade (P-227)
- **S03-F02**: DECLARED tier OBO claim unverified (P-226)
- Skill-lifecycle FINDINGS-APPLIED.md: CL-05 (tier detection from state, prompt-only ceiling, enterprise tier-per-risk, data sensitivity override, frontmatter-to-decorator propagation)

---

## Related Concepts

- [Skill Scaffold](skill-scaffold.md) -- how scaffolding interacts with tier derivation
- [Error Messages](error-messages.md) -- diagnostics for tier violations
- [OBO Boundary](../governance/obo-boundary.md) -- why R5 skills need TYPED tier
