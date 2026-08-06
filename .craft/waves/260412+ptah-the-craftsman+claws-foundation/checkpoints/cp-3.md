---
checkpoint: 3
name: "Rules + Emit"
pulse_range: [13, 19]
depends_on_cp: 2
review_panel:
  [claws:ciso, claws:gateway-eng, claws:compliance, craft:dragon, craft:architect, craft:navigator]
---

# CP-3: Rules + Emit

## Dispatch Plan

### Batch 1

- Pulse 13: claws-rules — rule registry + G-CLASS (R1-R5)

### Batch 2 (depends on batch 1)

- Pulse 14: claws-rules — G-A2A + G-ELICIT + G-DATA
- Pulse 15: claws-rules — G-INPUT/CONTEXT/OUTPUT/BOUND + G-SUPPLY

### Batch 3 (depends on batch 2)

- Pulse 16: claws-emit — Gateway plugin TS emitter (L2+L3)

### Batch 4 (depends on batch 3)

- Pulse 17: claws-emit — governance SKILL.md (L1) + exec-approvals.json (L4)
- Pulse 18: claws-emit — workflow inversion (lobster.compiled.yaml)

### Batch 5 (depends on batch 4)

- Pulse 19: claws-emit — multi-platform emission + loss-aware routing

## Exit Criteria

- [ ] All 29 governance rules apply to CapabilityManifest
- [ ] R5 tools flagged as OBO with elicitation gate
- [ ] Gateway plugin type-checks against OC plugin types
- [ ] Zero @craftworks/ or @claws/ in generated output
- [ ] Workflow inversion injects governance steps around R5 operations
- [ ] Loss-aware routing selects optimal platform emission path
