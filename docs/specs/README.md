# claws Spec Index

**Version**: 1.0
**Specs**: 7 (CL-01 through CL-07)
**Status**: All Draft
**Pipeline**: `.craft/pipelines/claws.yaml`

---

## Specs

| ID | Title | Source | Status | Reviewer roles |
|----|-------|--------|--------|---------------|
| CL-01 | [CLI Surface & Schema](specs/CL-01-cli-surface-schema.md) | Q12a-d, Q12g | Draft | founder, new-hire, skill-author |
| CL-02 | [Security Model](specs/CL-02-security-model.md) | Q12h | Draft | ciso, gateway-eng, founder |
| CL-03 | [Runtime Enforcement](specs/CL-03-runtime-enforcement.md) | Q12i, Q12r | Draft | gateway-eng, ciso, platform-eng |
| CL-04 | [Compilation Pipeline](specs/CL-04-compilation-pipeline.md) | Q12j, Q12m | Draft | gateway-eng, skill-author |
| CL-05 | [Developer Experience](specs/CL-05-developer-experience.md) | Q12e-f, Q12o, Q12q | Draft | skill-author, new-hire, power-user, platform-eng |
| CL-06 | [Platform Ecosystem](specs/CL-06-platform-ecosystem.md) | Q12k-l, Q12n | Draft | founder, skill-author, platform-eng |
| CL-07 | [Deep Integration](specs/CL-07-deep-integration.md) | Q12p, Q12b | Draft | founder, gateway-eng |

## Spec Dependencies

```
CL-01 (CLI Surface)
  │
  ├──> CL-04 (Compilation) ──> CL-03 (Runtime)
  │                              │
  │                              └──> CL-02 (Security)
  │
  ├──> CL-05 (Dev Experience)
  │
  ├──> CL-06 (Platform Ecosystem)
  │
  └──> CL-07 (Deep Integration) ──> CL-04
```

CL-01 is foundational (name, commands, schema). CL-04 (compilation) and CL-02 (security) are the core engine. CL-05 and CL-06 are the product surface. CL-07 is the Craftworks bridge.

## Review Protocol

Each spec is reviewed by 2-3 roles from `.craft/roles/claws/`. Reviewers are selected for maximum tension — the founder and CISO see the same feature differently.
