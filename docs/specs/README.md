# claws Spec Index

**Version**: 1.4
**Specs**: 14 (CL-01 through CL-14)
**Status**: All Draft
**Pipeline**: `.craft/pipelines/claws.yaml`

---

## Specs

| ID | Title | Source | Status | Reviewer roles |
|----|-------|--------|--------|---------------|
| CL-01 | [CLI Surface & Schema](specs/CL-01-cli-surface-schema.md) | Q12a-d, Q12g | Draft v1.2 | founder, new-hire, skill-author |
| CL-02 | [Security Model](specs/CL-02-security-model.md) | Q12h | Draft | ciso, gateway-eng, founder |
| CL-03 | [Runtime Enforcement](specs/CL-03-runtime-enforcement.md) | Q12i, Q12r | Draft | gateway-eng, ciso, platform-eng |
| CL-04 | [Compilation Pipeline](specs/CL-04-compilation-pipeline.md) | Q12j, Q12m, claws-compile-dx plan (Ra) | Draft v1.2 | gateway-eng, skill-author |
| CL-05 | [Developer Experience](specs/CL-05-developer-experience.md) | Q12e-f, Q12o, Q12q | Draft | skill-author, new-hire, power-user, platform-eng |
| CL-06 | [Platform Ecosystem](specs/CL-06-platform-ecosystem.md) | Q12k-l, Q12n | Draft | founder, skill-author, platform-eng |
| CL-07 | [Deep Integration](specs/CL-07-deep-integration.md) | Q12p, Q12b | Draft | founder, gateway-eng |
| CL-08 | [Freemium Boundary](specs/CL-08-freemium-boundary.md) | Q12s | Draft | founder, enterprise-architect |
| CL-09 | [OC Workspace Format](specs/CL-09-oc-workspace-format.md) | Q12t | Draft | gateway-eng, skill-author |
| CL-10 | [CAP Integration & Serve API](specs/CL-10-cap-integration.md) | CAP Product Day | Draft | founder, gateway-eng, skill-author |
| CL-11 | [Upstream Governance](specs/CL-11-upstream-governance.md) | Q12b, Thoth | Draft | founder, ciso, gateway-eng |
| CL-12 | [Approval Event Schema](specs/CL-12-approval-event-schema.md) | Q12b, Thoth | Draft | founder, ciso, gateway-eng |
| CL-13 | [Repo Boundary](specs/CL-13-repo-boundary.md) | Horus / claws-repo-migration | Draft | claws-repo-steward, claws-release-eng, compliance |
| CL-14 | [Emitter Architecture](specs/CL-14-emitter-architecture.md) | Ra CP-2 R1 / pulse 12.5 emit-ast-codegen / claws-compile-dx H5 | Draft v1.4 | craft:codegen, craft:architect, claws:platform-eng, craft:dragon, craft:conformance |

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

Note: CL-13 (Repo Boundary) is cross-cutting — infrastructural, not in the dependency graph.

Note: CL-14 (Emitter Architecture) depends on CL-04 (Compilation Pipeline) and CL-06 (Platform Ecosystem) — it establishes the quality contract every emitter must satisfy regardless of platform target.

## Review Protocol

Each spec is reviewed by 2-3 roles from `.craft/roles/claws/`. Reviewers are selected for maximum tension — the founder and CISO see the same feature differently.
