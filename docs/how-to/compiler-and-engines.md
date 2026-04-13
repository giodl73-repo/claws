# Use the claws Compiler

Understand the three-engine model, workflow inversion, and the claws compilation pipeline.

## The Three-Engine Model

claws uses three compilation engines working together:

1. **PRESS Engine** -- token optimization, priority-ranked section elimination
2. **Context DAG Engine** -- dependency graph resolution, context assembly
3. **Plugin Engine** -- governance artifact generation, runtime enforcement code

All three engines operate on the GovernanceIR -- the intermediate representation of governance rules and policies.

## Run a Compilation

```bash
claws build
```

The build pipeline:
1. Reads 9 workspace files (SOUL.md, AGENTS.md, TOOLS.md, etc.)
2. Constructs GovernanceIR from workspace state + policy rules
3. Generates CapabilityManifest (what the workspace can do)
4. Extracts MechanicalIntent (what the workspace intends to do)
5. Emits executable TypeScript skills and governance plugins

## Workflow Inversion

Workflow inversion transforms a workspace's task definitions into governance-aware execution plans. Instead of running tasks directly, claws inverts the workflow:

```
Traditional: Task → Execute → (maybe check governance)
Inverted:    Task → Governance check → Approved execution → Audit
```

Enable workflow inversion:

```json
{
  "workflowInversion": {
    "enabled": true,
    "preCheck": true,
    "postAudit": true
  }
}
```

## Inspect GovernanceIR

Dump the intermediate representation for debugging:

```bash
claws build --emit governance-ir --out ir/
cat ir/governance-ir.json
```

## Lossless Round-Trip

claws guarantees lossless round-trip fidelity. Your original workspace files are never modified:

```bash
claws init        # Creates governance overlay
claws build       # Emits governance artifacts
claws uninstall   # Removes governance overlay, originals untouched
```

Verify round-trip integrity:

```bash
claws verify --roundtrip
```

This computes SHA-256 hashes of all original workspace files and confirms they match their pre-init state.

## Configure claws.json

The three-layer configuration schema:

```json
{
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "platform": "claude-code",
  "layers": {
    "workspace": { "trustTier": 2, "policies": ["base"] },
    "user": { "trustTier": 3, "overrides": ["dev-mode"] },
    "system": { "trustTier": 1, "locked": true }
  }
}
```

Layers merge with system > user > workspace precedence. System-layer settings cannot be overridden.
