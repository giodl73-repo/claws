---
slug: claws-fleet-ops
preset: "claws"
plan: "2 headlines: claws pinch --fleet checks 47 workspaces in <120s, claws broadcast reports per-workspace status with retry on transient failures"
area: claws
status: Closed
phase: anubis
atoms: [atom:fleet-broadcast, atom:fleet-drift, atom:fleet-scan, atom:fleet-doctor, atom:fleet-comply, atom:kill-switch]
specs: [CL-01, CL-02, CL-03, CL-05]
---

# claws-fleet-ops -- Fleet Operations

## Headlines

1. **H1: `claws pinch --fleet` checks 47 workspaces in <120s with per-workspace progress** -- `claws scan` discovers all agent workspaces under a configurable root path by scanning for platform marker files (SOUL.md, .cursorrules, CLAUDE.md, etc.) using agent-sdk's discovery module. `claws pinch --fleet` iterates all discovered workspaces, runs `pinch` on each, and reports per-workspace status (pass/fail/error) with a progress bar showing completion count, current workspace, and ETA. Workspace-level errors (e.g., missing claws.json) are reported per-workspace without aborting the fleet run. The fleet report shows aggregate statistics: total workspaces, passed, failed, errored, total violations by severity.
   - Validation: `claws scan` discovers 3 fixture workspaces from nested directories
   - Validation: `claws pinch --fleet` on 3 fixture workspaces completes and reports per-workspace pass/fail
   - Validation: A workspace with a broken claws.json reports "error" for that workspace without stopping the fleet run
   - Validation: Fleet progress bar shows `[12/47] my-agent-research (0.3s) ETA: 1m23s`

2. **H2: `claws broadcast` pushes policies to all workspaces with partial failure recovery** -- `claws broadcast` takes policy YAML files from the current workspace (or a fleet registry) and copies them to every discovered workspace's `.claws/policies/` directory. Each workspace push is independent -- partial failures do not abort the broadcast. Failed workspaces are retried once with exponential backoff. The broadcast report shows per-workspace status: updated/skipped/failed with failure reason. `--confirm` flag is required (destructive fleet op). `--reason <text>` is required for audit trail. A `BROADCAST` event is appended to every target workspace's audit chain and to the fleet audit chain.
   - Validation: `claws broadcast --confirm --reason "SOC2 v2 rollout"` copies policy files to 3 fixture workspaces
   - Validation: A workspace with read-only `.claws/` fails gracefully: "workspace-x: FAILED (permission denied)" with one retry
   - Validation: Broadcast without `--confirm` is rejected: "Fleet broadcast requires --confirm"
   - Validation: Broadcast without `--reason` is rejected: "Fleet broadcast requires --reason for audit trail"

3. **H3: `claws kill` stops an agent immediately with 3 out-of-band paths** -- `claws kill <workspace>` sends an emergency stop signal to the specified workspace's governance enforcement layer. Three out-of-band kill paths ensure the signal reaches the agent even under adversarial conditions: (1) write `.claws/kill` sentinel file that the governance plugin checks on every hook invocation, (2) HTTP POST to the sidecar health endpoint `/kill` (if sidecar is running), (3) `SIGTERM` to the Gateway process if the PID is known. `claws kill --fleet --confirm --reason <text>` kills all agents across the fleet. Kill events are logged to the audit chain as critical events. Kill requires `--reason` for incident response traceability.
   - Validation: `claws kill my-agent --reason "data exfiltration detected"` creates `.claws/kill` sentinel file in the workspace
   - Validation: `claws kill --fleet --confirm --reason "active incident"` creates kill sentinels in all discovered workspaces
   - Validation: Kill without `--reason` is rejected: "Kill requires --reason for incident response"
   - Validation: Kill without `--confirm` on `--fleet` is rejected: "Fleet kill requires --confirm"

## Summary

Fleet operations form the outer ring of the three-ring continuous governance model. `claws scan` discovers workspaces, `claws broadcast` pushes policies, `claws drift` detects hash-based divergence, `claws report` generates fleet dashboards, `claws push` deploys compiled artifacts, and `claws kill` provides emergency stop. All fleet operations use agent-sdk's discovery module for workspace enumeration and agent-sdk's gate infrastructure for validation. Fleet commands are inherently fleet-scoped (no `--fleet` flag needed -- they only operate on fleets). Scope-sensitive commands (pinch, comply, snap, budget, kill) accept `--fleet` to escalate from workspace to fleet scope.

## Coverage Contract

### Specs
- [ ] CL-01 -- Fleet commands (scan, broadcast, drift, report, push, kill), --fleet flag on scope-sensitive commands, --confirm/--reason on destructive ops
- [ ] CL-02 -- Kill switch (3 out-of-band paths), audit chain for fleet events
- [ ] CL-03 -- Kill sentinel file checked in governance plugin hooks, sidecar kill endpoint
- [ ] CL-05 -- Outer ring of three-ring model, <120s fleet latency, progress bar

### Concept Guides
- [ ] docs/claws/fleet/overview.md -- NEW: fleet architecture, discovery, broadcast/drift/report cycle
- [ ] docs/claws/fleet/kill-switch.md -- NEW: 3 kill paths, incident response, audit trail
- [ ] docs/claws/fleet/broadcast-vs-push.md -- NEW: policy broadcast (declarative) vs artifact push (imperative)

### Scenario Coverage
- [ ] fleet/scan-discovery -- discover 3 nested workspaces from marker files
- [ ] fleet/scan-empty -- scan with no workspaces found reports "0 workspaces discovered"
- [ ] fleet/pinch-fleet -- pinch --fleet on 3 workspaces, per-workspace results
- [ ] fleet/pinch-fleet-partial-error -- one workspace broken, others complete
- [ ] fleet/broadcast-success -- push policies to 3 workspaces
- [ ] fleet/broadcast-partial-failure -- one workspace read-only, retry, report
- [ ] fleet/broadcast-requires-confirm -- reject without --confirm
- [ ] fleet/broadcast-requires-reason -- reject without --reason
- [ ] fleet/drift-detection -- modify policy in one workspace, drift detects divergence
- [ ] fleet/drift-clean -- all workspaces match, drift reports "0 drift detected"
- [ ] fleet/report-dashboard -- fleet report with aggregate statistics (CSV + JSON)
- [ ] fleet/push-artifacts -- deploy compiled artifacts from promoted snapshot
- [ ] fleet/kill-workspace -- kill single workspace via sentinel file
- [ ] fleet/kill-fleet -- kill all workspaces with --fleet --confirm
- [ ] fleet/kill-requires-reason -- reject without --reason
- [ ] fleet/kill-audit-trail -- kill event appears in workspace and fleet audit chains

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 20 | Discovery (3), broadcast copy/retry (4), drift hash comparison (3), kill sentinel (3), report aggregation (3), progress rendering (2), confirm/reason validation (2) |
| L1 integration | 8 | Full fleet pipeline per command (scan -> operate -> report), broadcast with retry, kill with audit recording |
| L2 e2e | 4 | scan -> pinch --fleet, broadcast -> drift, kill -> audit verify, report generation |
| L3 acceptance | 2 | Full fleet workflow: scan -> broadcast -> pinch --fleet -> report; kill -> verify audit |

## Scope

- `claws-sdk/src/fleet/scan.ts` (NEW) -- Workspace discovery: recursively scan for marker files. Imports agent-sdk/src/discovery/ for workspace detection patterns
- `claws-sdk/src/fleet/broadcast.ts` (NEW) -- Policy broadcast: copy policy YAMLs to discovered workspaces, retry on failure, report per-workspace status
- `claws-sdk/src/fleet/drift.ts` (NEW) -- Drift detection: compute SHA-256 hashes of governance files in each workspace, compare against baseline (last broadcast or snapshot)
- `claws-sdk/src/fleet/report.ts` (NEW) -- Fleet report generator: aggregate pinch/comply/drift results across workspaces, output as default/JSON/CSV
- `claws-sdk/src/fleet/push.ts` (NEW) -- Artifact push: deploy compiled artifacts from a promoted snapshot to target workspaces
- `claws-sdk/src/fleet/kill.ts` (NEW) -- Kill switch: 3 out-of-band kill paths (sentinel, sidecar, SIGTERM), fleet-wide kill, audit recording
- `claws-sdk/src/fleet/fleet-runner.ts` (NEW) -- Fleet execution engine: iterate workspaces, run operation, collect results, handle partial failure. Imports agent-sdk/src/suite/gates/ for validation gates
- `claws-sdk/src/fleet/types.ts` (NEW) -- FleetConfig, WorkspaceInfo, FleetResult, BroadcastResult, DriftResult, KillResult types
- `claws-cli/src/commands/fleet.ts` (EDIT) -- scan, broadcast, drift, report, push, kill command registrations
- `claws-cli/src/commands/pinch.ts` (EDIT) -- Add --fleet flag handling to pinch command

## Deliverables

### Specs & Design
- [ ] CL-01 amendment -- fleet commands finalized with flag inventory and scope model
- [ ] CL-02 amendment -- kill switch 3 paths finalized with implementation details
- [ ] CL-05 amendment -- outer ring of three-ring model finalized with fleet latency targets

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/fleet/scan.ts -- scanWorkspaces(root, options): discover workspaces using agent-sdk discovery
- [ ] claws-sdk/src/fleet/broadcast.ts -- broadcast(policies, options): copy to workspaces, retry, report
- [ ] claws-sdk/src/fleet/drift.ts -- detectDrift(baseline, workspaces): hash-compare governance files
- [ ] claws-sdk/src/fleet/report.ts -- generateReport(results, format): aggregate fleet statistics
- [ ] claws-sdk/src/fleet/push.ts -- pushArtifacts(snapshot, workspaces): deploy compiled output
- [ ] claws-sdk/src/fleet/kill.ts -- kill(workspace, reason): sentinel + sidecar + SIGTERM; killFleet(workspaces, reason)
- [ ] claws-sdk/src/fleet/fleet-runner.ts -- runFleet(workspaces, operation): parallel execution with progress callback
- [ ] claws-sdk/src/fleet/types.ts -- all fleet types
- [ ] claws-sdk/tests/fleet/scan.unit.test.ts -- marker file detection, nested directories, filtering
- [ ] claws-sdk/tests/fleet/broadcast.unit.test.ts -- copy logic, retry on failure, confirm/reason validation
- [ ] claws-sdk/tests/fleet/drift.unit.test.ts -- hash computation, divergence detection, clean report
- [ ] claws-sdk/tests/fleet/kill.unit.test.ts -- sentinel creation, 3 kill paths, fleet kill, audit event
- [ ] claws-sdk/tests/fleet/fleet-runner.unit.test.ts -- parallel execution, partial failure handling, progress callback
- [ ] claws-sdk/tests/fleet/report.unit.test.ts -- aggregate statistics, CSV/JSON output
- [ ] claws-sdk/tests/fleet/broadcast.integration.test.ts -- broadcast to temp directories with retry
- [ ] claws-sdk/tests/fleet/scan.integration.test.ts -- discover workspaces in nested temp directory tree
- [ ] claws-sdk/tests/fleet/kill.integration.test.ts -- kill sentinel creation and audit chain recording
- [ ] claws-sdk/tests/fixtures/fleet/ (NEW) -- 3 nested fixture workspaces for fleet testing
- [ ] claws-sdk/tests/fixtures/fleet/workspace-a/ (NEW) -- OpenClaw workspace fixture
- [ ] claws-sdk/tests/fixtures/fleet/workspace-b/ (NEW) -- Cursor workspace fixture
- [ ] claws-sdk/tests/fixtures/fleet/workspace-c/ (NEW) -- Claude workspace fixture

### CLI Wiring
- [ ] claws-cli/src/commands/fleet.ts -- `claws scan`: scan and display workspace list
- [ ] claws-cli/src/commands/fleet.ts -- `claws broadcast --confirm --reason <text>`: broadcast with progress bar
- [ ] claws-cli/src/commands/fleet.ts -- `claws drift`: drift detection with per-workspace status
- [ ] claws-cli/src/commands/fleet.ts -- `claws report [--format json|csv]`: fleet compliance dashboard
- [ ] claws-cli/src/commands/fleet.ts -- `claws push`: deploy promoted snapshot artifacts
- [ ] claws-cli/src/commands/fleet.ts -- `claws kill [<workspace>] [--fleet] --confirm --reason <text>`: kill with audit
- [ ] claws-cli/src/commands/pinch.ts -- `claws pinch --fleet`: fleet-wide governance check with progress

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Praetor Integration

- **Compiled Context**: Fleet scan resolves workspaces as context forks. Fleet policy = governance layer.
- **Context Diff for Drift**: Structural comparison instead of file-hash comparison.
- **Identity Bridge**: Fleet identity (OIDC/SAML) maps to workspace trust tiers.

## Out of Scope

- Inner ring: watch (claws-three-rings plan)
- Middle ring: doctor (claws-three-rings plan)
- Snapshot save/restore/diff/promote (claws-snap-restore plan -- fleet snapshots call into snap)
- Compliance artifact generation (Phase 3 -- comply, assess are separate plan)
- Audit chain operations (Phase 3 -- audit, audit verify, audit export are separate plan)
- Sidecar installation and management (Phase 3 enterprise)
- Budget and secrets management (Phase 3 -- protect group)
- Identity/RBAC configuration (Phase 3 -- protect group)
- Fleet registry server (fleet uses file-based or URL-based registry, no server component in Phase 2)

## Notes

- Workspace discovery imports agent-sdk/src/discovery/ (scout.ts, types.ts) -- does NOT reimplement discovery
- Gate validation (confirm/reason requirements) imports agent-sdk/src/suite/gates/ patterns -- does NOT reimplement gate logic
- Fleet runner supports parallel workspace operations but is configurable: `--concurrency N` flag limits parallel operations (default: 8)
- Drift detection computes SHA-256 of governance files and compares against a stored baseline hash -- the baseline is set by the last broadcast or by `claws drift --baseline` explicit snapshot
- Kill sentinel file (`.claws/kill`) is checked by the generated governance plugin on every hook invocation -- this is the fastest kill path
- Broadcast vs push: broadcast copies policy YAML (declarative -- workspaces must recompile), push copies compiled artifacts (imperative -- skips recompilation)
- All destructive fleet operations (broadcast, push, kill --fleet) require both `--confirm` and `--reason` -- enforced by the CLI, not the SDK
- Depends on claws-parse + claws-rules (for pinch --fleet), claws-snap-restore (for push from promoted snapshot)

## Scenario-Driven Additions

### From three-rings scenarios
- **10 findings** applied: drift baseline source definition (promoted snapshot), workspace discovery and IR retrieval protocol, broadcast lossless conflict resolution via fleet overlay, parallel workspace scanning requirement, drift report divergence classification by remediation ring, broadcast schema version compatibility check, three-state drift classification (compliant/drifted/ungoverned), broadcast partial failure semantics, point-in-time vs eventual consistency for fleet scans, fleet scan skip for active middle-ring workspaces
- **4 new tests**:
  - [ ] Fleet baseline definition from promoted snapshot
  - [ ] Workspace discovery protocol with IR retrieval
  - [ ] Broadcast fleet overlay model (lossless conflict resolution)
  - [ ] Parallel workspace scanning with fault tolerance

### From fleet-operations scenarios
- **51 findings** applied: fleet scan three-state workspace classification (GOVERNED/UNGOVERNED/MISCONFIGURED), workspace discovery heuristic, scan fault tolerance and partial results, INACCESSIBLE workspace state for permission errors, broadcast stale enforcement window, pre-broadcast policy validation gate, per-workspace trust tier compatibility check, broadcast atomicity with manifest, broadcast version tracking, broadcast merge semantics (fleet override vs local), automatic pre-broadcast snapshot, drift hash composition (claws.json + policy YAML + GovernanceIR), drift severity classification (CRITICAL/HIGH/LOW), drift exception registration for intentional overrides, configuration vs build drift distinction, kill switch deny-all semantics, synchronous kill with per-workspace acknowledgment, kill partial failure escalation (CRITICAL alert), automatic pre-kill snapshot, post-kill restoration command, structured kill reason format, double-kill prevention, compliance matrix (workspace x framework), ungoverned workspace exclusion from compliance metrics, concurrent broadcast prevention via fleet lock, cross-workspace delegation reference format, case-insensitive agent name collision detection, fleet template signing (HMAC-SHA256), floor-only inheritance
- **18 new tests**:
  - [ ] Fleet scan three-state workspace classification
  - [ ] Workspace discovery with marker file heuristic
  - [ ] Scan fault tolerance with partial results
  - [ ] INACCESSIBLE workspace state for permission errors
  - [ ] Broadcast stale enforcement window detection
  - [ ] Pre-broadcast policy validation gate
  - [ ] Per-workspace trust tier compatibility check
  - [ ] Broadcast atomicity via manifest tracking
  - [ ] Drift hash composition (claws.json + policies + IR)
  - [ ] Drift severity classification (CRITICAL/HIGH/LOW)
  - [ ] Kill switch deny-all semantics (not disable-governance)
  - [ ] Synchronous kill with per-workspace acknowledgment
  - [ ] Kill partial failure escalation to CRITICAL alert
  - [ ] Double-kill prevention and state check
  - [ ] Compliance matrix (workspace x framework)
  - [ ] Ungoverned workspace exclusion from compliance metrics
  - [ ] Cross-workspace delegation cycle detection
  - [ ] Case-insensitive agent name collision blocking

### From snapshot-lifecycle scenarios
- **8 findings** applied: promote baseline invalidation of cached drift results, per-environment baselines, end-to-end integrity verification across transport
- **3 new tests**:
  - [ ] Promote baseline invalidation of cached drift results
  - [ ] Per-environment grouped baselines
  - [ ] End-to-end snapshot integrity verification across transport

### From a2a-governance scenarios
- **11 findings** applied: lateral movement pattern detection from correlated blocks, cross-workspace trust graph via fleet scan, fleet-wide minimum identity level metric, cross-workspace lateral movement correlation, cross-workspace transitive trust detection via claws scan
- **4 new tests**:
  - [ ] Lateral movement correlation from A2A block events
  - [ ] Cross-workspace trust graph construction via fleet scan
  - [ ] Fleet-wide minimum identity level metric
  - [ ] Cross-workspace transitive trust detection via Tarjan SCC

### From compliance-evidence scenarios
- **11 findings** applied: fleet-wide compliance reporting, compliance matrix per-workspace per-framework
- **5 new tests**:
  - [ ] Fleet-wide multi-framework compliance matrix
  - [ ] Ungoverned workspace exclusion from fleet compliance
  - [ ] Cross-framework rule evaluation deduplication
  - [ ] Evidence signing verification across fleet
  - [ ] Compliance history storage for trend analysis

### From platform-detection scenarios
- **3 findings** applied: platform coverage reporting across fleet workspaces
- **1 new test**:
  - [ ] Platform coverage reporting across fleet workspaces
