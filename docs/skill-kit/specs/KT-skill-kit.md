# KT — @bic/claws-skill-kit (primary spec)

**Status**: Alpha · **Upstream target**: none

## Package overview

Skill authoring kit — the TS API skill authors use to write skills
that run under claws governance. Runtime helpers (for in-skill
decision wiring), build tooling (for emitting skill artifacts), and
the three-rings adoption model.

A "skill" in claws is a workspace extension — a bundle of
TOOLS.md + AGENTS.md + code that an end-user installs into their
own workspace to extend claws's capabilities.

## Exported subpaths

| Subpath | Exports |
|---------|---------|
| `/runtime` | `SkillContext`, `defineTool`, helper types |
| `/build` | `buildSkill`, `bundleSkill` |
| `/types` | Shared skill types |

## Sub-spec index

| Code | File | Authority over |
|------|------|----------------|
| **KTR** | [KTR-skill-runtime.md](./KTR-skill-runtime.md) | Runtime helpers, SkillContext, decision wiring |
| **KTB** | [KTB-skill-build.md](./KTB-skill-build.md) | Build pipeline, artifact schema, prohibition rules |
| **KTA** | [KTA-three-rings.md](./KTA-three-rings.md) | Three-rings adoption model (DECLARED / TYPED / VERIFIED) |

## Stability

Alpha. The `/runtime` helpers are the stable surface. `/build` is
semver-minor flexible — build output shape is stable but build
options can change.
