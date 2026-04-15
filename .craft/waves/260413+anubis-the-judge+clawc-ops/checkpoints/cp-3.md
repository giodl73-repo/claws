---
checkpoint: 3
name: "Snapshot + Fleet — Save, Restore, Scan, Broadcast, Kill"
pulse_range: [19, 27]
depends_on_cp: 2
review_panel: [claws:gateway-eng, claws:platform-eng, craft:architect, claws:ciso, claws:compliance]
---

# CP-3: Snapshot + Fleet — Save, Restore, Scan, Broadcast, Kill

## Dispatch Plan

### Batch 1 (parallel)
- Pulse 19: snap-save-restore — save manifest with SHA-256 hashes, restore with integrity verification
- Pulse 20: fleet-scan — workspace discovery via marker files, 3-state classification

### Batch 2 (depends on batch 1)
- Pulse 21: snap-diff — governance-aware semantic diff (compile both snapshots, compare IR)
- Pulse 22: fleet-drift — SHA-256 hash baseline comparison, severity classification
- Pulse 23: fleet-broadcast — policy push with manifest atomicity, partial failure retry

### Batch 3 (depends on batch 2)
- Pulse 24: snap-promote — pinch gate verification, fleet registry signing, provenance chain
- Pulse 25: fleet-kill — 3 kill paths (sentinel + sidecar + SIGTERM), deny-all semantics, audit
- Pulse 26: fleet-report — compliance matrix (workspace × framework), CSV + JSON output

### Batch 4 (depends on batch 3)
- Pulse 27: e2e-fleet-loop — scan 3 fixtures → broadcast policy → drift detect → snap save → kill → verify audit

## Exit Criteria
- [ ] `claws snap save` captures claws.json + policies + IR + cache with per-file SHA-256
- [ ] `claws snap restore` verifies integrity, aborts on tamper, restores byte-identical
- [ ] `claws snap diff` shows semantic changes (tool risk, policy, violations), not file diffs
- [ ] `claws snap promote` enforces pinch gate, signs with provenance
- [ ] `claws scan` discovers 3 fixture workspaces (OpenClaw, Cursor, Claude Code)
- [ ] `claws broadcast` retries transient failures, skips permanent, reports per-workspace
- [ ] `claws drift` computes hash composition, classifies severity (CRITICAL/HIGH/LOW)
- [ ] `claws kill` records audit event in all 3 paths, double-kill prevention
- [ ] Fleet parallel execution <120s for 3 workspaces (8 concurrent default)
- [ ] E2E: full scan → broadcast → drift → snap → kill loop on fixtures
- [ ] L0: 51 unit tests, L1: 19 integration, L2: 9 e2e, L3: 5 acceptance
