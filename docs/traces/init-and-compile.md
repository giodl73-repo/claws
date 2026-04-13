# Trace: Init, Config, and Compilation Pipeline

> Covers: `atom:claws-init`, `atom:claws-json`, `atom:claws-compiler`, `atom:workflow-inversion`

How governance is initialized, configured, compiled, and how workflow inversion injects governance gates.

---

## Init Flow

```
  Developer runs: claws init
       │
       ▼
  [Workspace Detection]
       │  Scan for .craft/ directory → found
       │  Scan for existing claws.json → not found
       │  Read ProgramIR to understand workspace capabilities
       ▼
  [Config Generation]
       │  Generate claws.json with defaults:
       │    version: "1.0.0"
       │    policies: ["default"]
       │    enforcement: "advisory"  (start soft)
       │    signing: { algorithm: "ed25519" }
       ▼
  [Policy Scaffold]
       │  Create .claws/policies/default.yaml
       │  Include baseline rules:
       │    - All skills must have timeout
       │    - External tools require T1+ permission
       │    - PII entities require classification declaration
       ▼
  [Key Generation]
       │  Generate Ed25519 signing key pair
       │  Write .claws/keys/signing.pub (committed)
       │  Write .claws/keys/signing.key (gitignored)
       ▼
  Workspace initialized with governance → DECLARED badge eligible
```

---

## Compilation Pipeline

```
  claws build
       │
       ▼
  [Parse Phase]
       │  Read claws.json → config
       │  Read .claws/policies/*.yaml → raw policy rules
       │  Read ProgramIR → workspace state
       ▼
  [Validate Phase]
       │  Check policy rule syntax
       │  Resolve atom references in rules
       │  Detect conflicting rules
       │  Emit diagnostics (CLAWS-POLICY-*)
       ▼
  [Lower Phase]
       │  Transform policies → GovernanceIR
       │  Compile sift expressions → evaluators
       │  Build capability manifest from ProgramIR
       │  Extract mechanical intent annotations
       ▼
  [Workflow Inversion Phase]
       │  Walk StageTaskIR from ProgramIR
       │  For each stage matching a governance trigger:
       │    Insert pre-gate wrapper stage
       │    Attach governance evaluation to wrapper
       │  Result: augmented StageTaskIR in GovernanceIR
       ▼
  [Emit Phase]
       │  Write .claws/compiled/governance-ir.json
       │  Write .claws/compiled/capability-manifest.yaml
       │  Write .claws/compiled/inverted-stages.json
       │  Emit CGR recording compilation
       ▼
  Governance compiled → TYPED badge eligible
```

### Breakpoint: Workflow Inversion in Detail

```
  Original: Enrich ──► Qualify ──► Score

  Rule: "stages accessing confidential entities require pre-gate"

  Enrich accesses Contact (confidential) → trigger
  Qualify accesses Lead (internal) → no trigger
  Score accesses Lead (internal) → no trigger

  Result: [G-Enrich] ──► Enrich ──► Qualify ──► Score
            │
       governance pre-check:
       verify agent has confidential clearance
```

---

## Related

- [claws init](../concepts/claws-init.md) -- init concept guide
- [GovernanceIR](../concepts/governance-ir.md) -- compiled governance representation
