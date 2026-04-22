# claws Spec Index

**Version**: 2.0 (Horus wave close)
**Specs**: 16 (CL-01 through CL-16)
**Status**: 6 Draft, 8 Retired (successor per-package specs), 2 Horus-promoted (CL-15, CL-16)
**Pipeline**: `.craft/pipelines/claws.yaml`

**Post-Horus advisory**: per-package doc trees under `docs/{package}/`
are canonical. See [../README.md](../README.md) for the package
directory map. The CL-NN specs retained here are reference material
only — Retired ones carry explicit `Status: Retired` headers + successor
pointers; Draft ones remain load-bearing until their per-package
successor is fully built out.

---

## Specs

| ID | Title | Source | Status | Reviewer roles |
|----|-------|--------|--------|---------------|
| CL-01 | [CLI Surface & Schema](CL-01-cli-surface-schema.md) | Q12a-d, Q12g | Draft v1.2 | founder, new-hire, skill-author |
| CL-02 | [Security Model](CL-02-security-model.md) | Q12h | Draft (successor `security/specs/SM-security.md`) | ciso, gateway-eng, founder |
| CL-03 | [Runtime Enforcement](CL-03-runtime-enforcement.md) | Q12i, Q12r | Retired pulse 74.5 → `guardrails/specs/GR-guardrails.md` + `GRR-runtime.md` | gateway-eng, ciso, platform-eng |
| CL-04 | [Compilation Pipeline](CL-04-compilation-pipeline.md) | Q12j, Q12m, claws-compile-dx plan (Ra) | Retired pulse 74.5 → `policy/specs/PO-policy.md` + `POI` + `POC` | gateway-eng, skill-author |
| CL-05 | [Developer Experience](CL-05-developer-experience.md) | Q12e-f, Q12o, Q12q | Draft | skill-author, new-hire, power-user, platform-eng |
| CL-06 | [Platform Ecosystem](CL-06-platform-ecosystem.md) | Q12k-l, Q12n | Retired pulse 74.5 → per-package primary specs | founder, skill-author, platform-eng |
| CL-07 | [Deep Integration](CL-07-deep-integration.md) | Q12p, Q12b | Retired pulse 74.5 → `guardrails/specs/GRG` + `GRD` + `GRF` + `snap/specs/SNP` (Horus amendments A+B merged pulse 73) | founder, gateway-eng |
| CL-08 | [Freemium Boundary](CL-08-freemium-boundary.md) | Q12s | Retired pulse 74.5 → `sdk/specs/SK-sdk.md` + `upstream/specs/UG-upstream.md` | founder, enterprise-architect |
| CL-09 | [OC Workspace Format](CL-09-oc-workspace-format.md) | Q12t | Retired pulse 74.5 → `workspace/specs/WS-workspace.md` + `WSA` + `WSE` + `WSP` + `WSC` | gateway-eng, skill-author |
| CL-10 | [CAP Integration & Serve API](CL-10-cap-integration.md) | CAP Product Day | Draft | founder, gateway-eng, skill-author |
| CL-11 | [Upstream Governance](CL-11-upstream-governance.md) | Q12b, Thoth | Draft v1.3 (Horus amendment merged pulse 73; successor `guardrails/specs/GRA-audit-chain` post-74.5) | founder, ciso, gateway-eng |
| CL-12 | [Approval Event Schema](CL-12-approval-event-schema.md) | Q12b, Thoth | Retired pulse 74.5 → `guardrails/specs/GRA-audit-chain.md` | founder, ciso, gateway-eng |
| CL-13 | [Repo Boundary](CL-13-repo-boundary.md) | Horus / claws-repo-migration | Draft v1.8 (Horus amendments A+B merged pulse 73; successor `repo/specs/RB-repo-boundary.md`) | claws-repo-steward, claws-release-eng, compliance |
| CL-14 | [Emitter Architecture](CL-14-emitter-architecture.md) | Ra CP-2 R1 / pulse 12.5 emit-ast-codegen / claws-compile-dx H5 | Retired pulse 74.5 → `workspace/specs/WSE-emitter.md` | craft:codegen, craft:architect, claws:platform-eng, craft:dragon, craft:conformance |
| CL-15 | [Canonicalizer](CL-15-canonicalizer.md) | Horus pulse 73 (promoted from CL-NEW-canonicalizer-byte-identical draft) | v1.0 (successor `workspace/specs/WSC-canonicalize.md`) | gateway-eng, claws-repo-steward |
| CL-16 | [OC URI Canonical](CL-16-oc-uri-canonical.md) | Horus pulse 73 (promoted from CL-NEW-oc-uri-canonical draft) | v1.0 (successor `workspace/specs/WSP-path.md`) | gateway-eng, claws-repo-steward |

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

CL-01 is foundational (name, commands, schema). CL-04 (compilation)
and CL-02 (security) are the core engine. CL-05 and CL-06 are the
product surface. CL-07 is the Craftworks bridge.

Note: CL-13 (Repo Boundary) is cross-cutting — infrastructural, not in
the dependency graph.

Note: CL-14 (Emitter Architecture) depends on CL-04 (Compilation
Pipeline) and CL-06 (Platform Ecosystem).

Note: CL-15 (Canonicalizer) + CL-16 (OC URI Canonical) are inputs to
CL-09 (OC Workspace Format).

## Review Protocol

Each spec is reviewed by 2-3 roles from `.craft/roles/claws/`.
Reviewers are selected for maximum tension — the founder and CISO
see the same feature differently.
