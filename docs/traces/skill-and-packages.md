# Trace: Skill Kit, Tier Adoption, and Package Model

> Covers: `atom:skill-kit`, `atom:tier-adoption`, `atom:three-tier-packages`

How governance-aware skills are built, tested, and published through the three-tier package system.

---

## Skill Development Flow

```
  Developer wants a governed skill
       │
       ▼
  [1. Scaffold with @bic/claws-skill-kit]
       │   claws skill create my-skill
       │   Generates:
       │   ├── src/index.ts          Skill implementation
       │   ├── SKILL.md              Skill manifest (intent, tools, inputs)
       │   ├── tests/                Test harness with governance assertions
       │   └── claws.skill.json      Skill-level governance config
       ▼
  [2. Implement]
       │   Write skill logic in src/index.ts
       │   Declare tool usage in SKILL.md
       │   Define governance constraints in claws.skill.json
       ▼
  [3. Test with @bic/claws-test]
       │   claws test
       │   Runs skill tests WITH governance enforcement active
       │   Verifies: tool classifications respected, budget within limits,
       │             elicitation gates triggered correctly
       ▼
  [4. Publish]
       │   claws publish
       │   Package includes: skill code + governance metadata + test results
       │   Published to ClawHub (npm-style registry)
       ▼
  [5. Badge]
       │   DECLARED → TYPED → VERIFIED badge levels
       │   Based on governance metadata completeness and test coverage
```

---

## Three-Tier Package Model

Skills and governance packages are organized into three tiers:

```
  Tier 1: @claws/* (core)
  ─────────────────────────
  Packages maintained by the claws team
  Examples: @claws/core, @bic/claws-skill-kit, @bic/claws-test, @claws/sift
  Guarantee: semver, backwards compatible, enterprise-grade

  Tier 2: @openclaw/* (community)
  ─────────────────────────────────
  Community-contributed open-source packages
  Examples: @openclaw/langchain-bridge, @openclaw/bedrock-adapter
  Guarantee: community-maintained, reviewed but not enterprise-guaranteed

  Tier 3: @{org}/* (private)
  ─────────────────────────────
  Organization-private packages
  Examples: @contoso/sales-governance, @fabrikam/hr-compliance
  Guarantee: organization-maintained, internal-only
```

The tier determines supply chain trust:
- **Tier 1**: auto-trusted, no additional verification
- **Tier 2**: requires workspace-level opt-in, supply chain warnings
- **Tier 3**: trusted within the publishing organization

---

## Tier Adoption Path

Organizations adopt claws governance progressively:

```
  Stage 1: AWARENESS
       │   claws init + claws check
       │   See what governance looks like, no enforcement
       ▼
  Stage 2: ADVISORY (Tier 1 only)
       │   claws build with enforcement: "minimal"
       │   L1 SKILL.md only, agent reads but not enforced
       ▼
  Stage 3: ENFORCED (Tier 1 + 2)
       │   claws build with enforcement: "standard"
       │   L1-L4 active, tool classification enforced
       ▼
  Stage 4: ENTERPRISE (Tier 1 + 2 + 3)
       │   claws build with enforcement: "enterprise"
       │   L1-L5 active, sidecar running, fleet operations
       ▼
  Stage 5: COMPLIANT
       │   claws compliance generate
       │   Evidence packages for SOC2, HIPAA, EU AI Act
```

Each stage adds capability without requiring the previous stage to be torn down. An organization at Stage 3 can adopt Stage 4 by adding the sidecar -- no rewrite of existing governance.

---

## Related

- [Skill Kit](../concepts/skill-kit.md) -- @bic/claws-skill-kit reference
- [Tier Adoption](../concepts/tier-adoption.md) -- adoption path detail
- [Three-Tier Packages](../concepts/three-tier-packages.md) -- package model
- [Governance Badge](../concepts/governance-badge.md) -- DECLARED/TYPED/VERIFIED
