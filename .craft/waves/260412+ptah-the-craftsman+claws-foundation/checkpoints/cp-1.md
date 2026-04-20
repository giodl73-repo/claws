---
checkpoint: 1
name: "Foundation — Packages + IR"
pulse_range: [1, 5]
depends_on_cp: null
review_panel: [claws:gateway-eng, claws:platform-eng, craft:architect, craft:dragon, craft:navigator]
---

# CP-1: Foundation — Packages + IR

## Dispatch Plan

### Batch 1 (parallel)
- Pulse 01: claws-sdk-bootstrap — package scaffolding + FORMA sidecar
- Pulse 02: claws-sdk-bootstrap — forbidden import lint + boundary

### Batch 2 (depends on batch 1)
- Pulse 03: claws-governance-ir — GovernanceIR types + FailMode<R>

### Batch 3 (depends on batch 2)
- Pulse 04: claws-governance-ir — serialization + round-trip + audit signing
- Pulse 05: claws-governance-ir — CapabilityManifest + GovAnalysis types

## Exit Criteria
- [ ] `npm run build` succeeds with both claws packages
- [ ] Forbidden import lint blocks craftworks-sdk imports
- [ ] GovernanceIR round-trip: parse(serialize(ir)) === ir
- [ ] FailMode<R5> with 'open' rejected by TypeScript compiler
- [ ] .claws FORMA sidecar registered in compiler-sdk format registry
