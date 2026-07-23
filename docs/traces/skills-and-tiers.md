# Trace: Skill Kit, Tier Adoption, and Packages

> Covers: `atom:skill-kit`, `atom:tier-adoption`, `atom:three-tier-packages`, `atom:governance-plugin`

How governance skills are built, how workspaces adopt governance tiers, and how packages are structured.

---

## Skill Kit Authoring Flow

```
  Developer: create governance skill
       │
       ▼
  [Scaffold]
       │  claws skill init "pii-reviewer"
       │  Creates:
       │    skills/pii-reviewer/
       │      SKILL.md          (skill definition)
       │      test.eval.yaml    (evaluation declaration)
       │      governance.yaml   (skill-level governance config)
       ▼
  [Author]
       │  Write SKILL.md with governance-aware content
       │  Declare tool grants and classification requirements
       ▼
  [Test]
       │  claws test pii-reviewer
       │  Run eval harness against skill
       │  Verify governance rules don't block expected behavior
       ▼
  [Package]
       │  claws publish --scope @myorg
       │  Bundle skill + governance config + eval declaration
       │  Upload to ClawHub registry
       ▼
  Governance skill published
```

---

## Three-Tier Adoption Path

```
  Tier 1: DECLARED (getting started)
       │  claws init → baseline governance
       │  Advisory enforcement only
       │  Governance SKILL.md injected as L1 guidance
       │
       ▼
  Tier 2: TYPED (maturing)
       │  claws build → compile GovernanceIR
       │  Warning-level enforcement
       │  Policy rules validated and type-checked
       │  Workflow inversion active
       │
       ▼
  Tier 3: VERIFIED (production-ready)
       │  claws verify → compliance suite
       │  Error-level enforcement (blocking)
       │  Full audit chain + compliance evidence
       │  CI/CD integration required
```

### Breakpoint: Progressive Disclosure

The three tiers correspond to progressive command disclosure:

| Tier | Commands Available                         | Total   |
| ---- | ------------------------------------------ | ------- |
| 1    | init, check, status, uninstall             | 4       |
| 2    | + build, doctor, test, publish, assess     | 9 (+5)  |
| 3    | + verify, comply, audit, snap, bypass, lsp | 15 (+6) |

---

## Three-Tier Package Model

```
  @claws/ packages
       │
       ├── Tier 1: @claws/core
       │     Minimal types, config schema, basic rules
       │     Zero dependencies
       │
       ├── Tier 2: @bic/claws-skill-kit
       │     Skill scaffold, test harness, publisher
       │     Depends on: @claws/core
       │
       └── Tier 3: @claws/sdk (full SDK)
             Compiler, LSP, CI action, compliance
             Depends on: @claws/core, @bic/claws-skill-kit
```

---

## Governance Plugin Runtime

```
  Workspace boot
       │
       ▼
  [Load Governance Plugin]
       │  Read .claws/compiled/governance-ir.json
       │  Initialize GovernanceHost
       │  Register gate evaluators for G1-G4
       ▼
  [Attach to Pipeline]
       │  G1: register pre-compile hook
       │  G2: register post-compile hook
       │  G3: register pre-deploy hook
       │  G4: register post-deploy hook
       ▼
  Governance plugin active → all pipeline events flow through gates
```

---

## Related

- [Skill Kit](../concepts/skill-kit.md) -- skill authoring guide
- [Tier Adoption](../concepts/tier-adoption.md) -- adoption path details
- [Governance Plugin](../concepts/governance-plugin.md) -- runtime plugin
