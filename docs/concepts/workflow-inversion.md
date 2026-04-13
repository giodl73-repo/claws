# Workflow Inversion

Compiling governance checkpoints into existing workflows without modifying the original workflow definition.

## Overview

Workflow inversion inserts governance gates into an OpenClaw workspace's compiled workflow graph without rewriting the original TASK.md files. The claws compiler reads the compiled StageTaskIR, identifies stages that require governance checkpoints, and emits wrapper stages that enforce policies before and after the original stage executes.

## How It Works

```
Original workflow:        After inversion:

  A ──► B ──► C           A ──► [G] ──► B ──► [G] ──► C
                                 │              │
                           governance         governance
                           pre-check          pre-check
```

The `[G]` nodes are synthesized governance stages. They do not appear in the original workflow definition -- they are injected by the claws compiler based on policy rules that declare "stage X requires governance gate Y."

## Inversion Rules

Policy rules trigger inversion:

```yaml
# .claws/policies/stage-governance.yaml
rule: pii-access-gate
trigger: "stage accesses entity with classification >= confidential"
action: insert-pre-gate
gate: approval-required
```

The compiler walks the StageTaskIR, evaluates each stage against the trigger conditions, and inserts wrapper stages where matches are found.

## Lossless Guarantee

Workflow inversion respects the lossless guarantee. The original OC files are never modified. The injected stages exist only in the compiled output (`.claws/compiled/`), not in the source workspace.

## Related

- [The Compilation Pipeline](compiler.md) -- claws compilation overview
- [Lossless Guarantee](lossless-guarantee.md) -- OC files are never modified
- `design/claws/ATOMS.md` -- C05 `atom:workflow-inversion`
