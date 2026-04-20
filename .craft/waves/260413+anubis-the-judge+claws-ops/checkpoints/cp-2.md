---
checkpoint: 2
name: "Init + Three Rings — Watch, Doctor, Amend"
pulse_range: [10, 18]
depends_on_cp: 1
review_panel: [claws:gateway-eng, claws:platform-eng, craft:architect, claws:skill-author, claws:compliance]
---

# CP-2: Init + Three Rings — Watch, Doctor, Amend

## Dispatch Plan

### Batch 1 (parallel)
- Pulse 10: init-orchestrator — platform detect → template select → scaffold → emit

### Batch 2 (depends on batch 1)
- Pulse 11: init-templates — minimal, soc2, hipaa, eu-ai-act template generators
- Pulse 12: uninstall-bypass — uninstall orchestrator + backup + CLAWS_BYPASS audit recording
- Pulse 13: watch-core — fs.watch on 9 files, 300ms batch window, incremental parse

### Batch 3 (depends on batch 2)
- Pulse 14: watch-recompile — auto-pinch + auto-recompile on change, content hash cache
- Pulse 15: doctor-checks — config-schema, artifact-compat, dependency-check, policy-syntax

### Batch 4 (depends on batch 3)
- Pulse 16: doctor-migrate — claws.json schema migration v1→v2, dead man's switch support
- Pulse 17: amend-pipeline — FORMA amendment pipeline: validate → preview → apply
- Pulse 18: e2e-init-watch — init → edit TOOLS.md → watch detects → check reports → build regenerates

## Exit Criteria
- [ ] `claws init --template soc2` produces 16 files + 3 modified in <5s
- [ ] `claws uninstall` removes .claws/, backup in ~/.claws-backups/, audit archived
- [ ] `claws uninstall && claws init` round-trip leaves workspace byte-identical
- [ ] CLAWS_BYPASS=1 disables enforcement, records BYPASS event to audit chain
- [ ] `claws watch` reports TOOLS.md violation within 1s of save
- [ ] Batch deduplication: 3 saves in 100ms → 1 analysis pass
- [ ] `claws doctor --post-upgrade` detects OC version gap, applies config migration
- [ ] `claws amend` blocks invalid amendment, shows diff preview
- [ ] E2E: init → edit → watch → check → build full loop on reference workspace
- [ ] L0: 38+ unit tests, L1: 16+ integration, L2: 7+ e2e
