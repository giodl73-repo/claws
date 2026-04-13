# GovernanceIR

The intermediate representation produced by the claws compilation pipeline -- transforms governance declarations into enforceable artifacts.

## Overview

GovernanceIR is the output of the claws compiler. It takes governance declarations (policies, rules, capability manifests) and compiles them into a structured IR that the runtime enforcement engine consumes. GovernanceIR is to governance what ProgramIR is to workspaces -- the machine-readable form that bridges human-authored config and runtime execution.

## Structure

```
GovernanceIR
  ├── policies: PolicyNode[]        # Compiled policy rules
  ├── capabilities: CapabilityNode[] # Capability manifest entries
  ├── enforcement: EnforcementNode[] # Runtime enforcement config
  ├── gates: GateConfig[]           # G1-G4 gate parameterization
  └── metadata: CompilationMeta     # Version, timestamp, source hashes
```

## Compilation Pipeline

```
  claws.json + .claws/policies/
       │
       ▼
  [Parse]         → raw governance declarations
       │
       ▼
  [Validate]      → check references, detect conflicts
       │
       ▼
  [Lower]         → transform to enforcement-ready form
       │
       ▼
  [Emit]          → write GovernanceIR to .claws/compiled/
```

The pipeline reads from ProgramIR (the workspace's compiled state) to resolve cross-references -- for example, a policy that says "all skills with Confidential data must have timeout < 30s" needs the SkillIR to identify which skills have Confidential data.

## Related

- [The Compilation Pipeline](compiler.md) -- claws pipeline overview
- [Governance Plugin](governance-plugin.md) -- how GovernanceIR is consumed
- `design/claws/ATOMS.md` -- C02 `atom:governance-ir`
