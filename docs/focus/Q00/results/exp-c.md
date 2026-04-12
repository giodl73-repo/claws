# Experiment c: Operational Boundary Analysis

**Method**: design analysis
**Date**: 2026-04-11
**Sources**: docs/concepts/compiler/ (all incremental/cache/snapshot/session docs), Q12 working notes, Q11 use cases

---

## The Core Question

Where does build-time end and runtime begin? For each capability, is the operation:
- **Workspace-local** (one agent, one developer, one machine) → clawsc
- **Fleet-wide** (many agents, many teams, central control) → clawops
- **Transitional** (starts local, promotes to fleet) → needs a promotion protocol

---

## Boundary Table

| Capability | Scope | CLI | Boundary Rule | Why |
|-----------|-------|-----|---------------|-----|
| **Compile** | Workspace | clawsc | Always local — compilation reads source files on disk | Source files are workspace-local by definition |
| **Build (compile + emit)** | Workspace | clawsc | Always local — emits to workspace output directory | Output is workspace-local |
| **Cross-compile** | Workspace | clawsc | Local — emits to different format in workspace output | Target format doesn't change scope |
| **Optimize** | Workspace | clawsc | Always local — boost passes operate on compiled IR | Optimization is per-workspace |
| **Policy check** | Workspace | clawsc | Local first — fleet can mandate via broadcast | Developer checks their own workspace |
| **Compliance artifacts** | Workspace | clawsc | Local — generates per-workspace evidence | Each workspace has its own compliance posture |
| **Audit verify** | Workspace | clawsc | Local — verifies this workspace's audit chain | Audit chain is per-workspace |
| **Audit export** | Workspace | clawsc | Local — exports this workspace's events | Events are per-workspace |
| **Risk classification** | Workspace | clawsc | Local — classifies this agent | Risk tier is per-agent |
| **Amendment (add/remove/modify)** | Workspace | clawsc | Always local — modifies source files + FormaIR | Amendments are file-level operations |
| **Watch mode** | Workspace | clawsc | Always local — watches filesystem, recompiles | File watcher is per-directory |
| **Session mode** | Workspace | clawsc | Always local — stdin protocol drives one forest | Session binds to one process |
| **Dependency graph** | Workspace | *(internal)* | Always local — tracks file references within workspace | Graph is per-workspace |
| **Targeted invalidation** | Workspace | *(internal)* | Always local — marks files dirty in one host | Host is workspace-singleton |
| **Workspace snapshot save** | Workspace | clawsc | Local — captures this workspace's three-tier cache | Cache is per-workspace |
| **Workspace snapshot restore** | Workspace | clawsc | Local — restores this workspace's cache | Restores local state only |
| **Workspace snapshot diff** | Workspace | clawsc | Local — compares two snapshots of same workspace | Diffs are workspace-scoped |
| **Workspace snapshot deploy** | Workspace | clawsc | Local — materializes artifacts from cache | Artifacts are workspace-local |
| **Init governance** | Workspace | clawsc | Local — scaffolds .craft/policies/ in one workspace | Policy files are workspace-local |
| --- | --- | --- | --- | --- |
| **Fleet policy broadcast** | Fleet | clawops | Always fleet — pushes policies to N workspaces | Requires cross-workspace coordination |
| **Drift detection** | Fleet | clawops | Always fleet — compares N workspaces against policy | Compares fleet-wide state |
| **Compliance report** | Fleet | clawops | Always fleet — aggregates per-workspace compliance | Aggregation requires fleet view |
| **Compliance history** | Fleet | clawops | Always fleet — tracks trend across time | Historical data is fleet-level |
| **Workspace discovery (scan)** | Fleet | clawops | Always fleet — enumerates all OC workspaces in org | Discovery spans the organization |
| **AIBOM generation** | Fleet | clawops | Always fleet — inventory of all agents in org | Bill of materials is org-scoped |
| **Agent status** | Fleet | clawops | Always fleet — shows running agent instances | Runtime status is fleet-level |
| **Emergency kill** | Fleet | clawops | Always fleet — stops agent execution | Kill must be centrally authorized |
| **Token budget management** | Fleet | clawops | Fleet — budgets are hierarchical (org→team→workspace) | Budget hierarchy is fleet-level |
| **Secret vault** | Fleet | clawops | Fleet — secrets apply across workspaces | Vault is shared infrastructure |
| **SSO/RBAC config** | Fleet | clawops | Fleet — identity spans the organization | Identity is org-scoped |
| **Fleet snapshot save** | Fleet | clawops | Fleet — captures ALL workspace cache states | Forest-level snapshot |
| **Fleet snapshot restore** | Fleet | clawops | Fleet — restores ALL workspace caches | Forest-level rollback |
| --- | --- | --- | --- | --- |
| **Snapshot promote** | Transitional | clawops | Promotes workspace snapshot to fleet tier | Crosses boundary: local → fleet |
| **Fleet push** | Transitional | clawops | Broadcasts compiled artifacts from fleet snapshot | Takes fleet snapshot and deploys |
| **Fleet rollback** | Transitional | clawops | Restores fleet snapshot + re-deploys | Reverses a fleet push |

---

## The Six Open Design Questions — Resolved

### Q1: Can a workspace snapshot become a fleet snapshot?

**Answer: Yes, via explicit promotion.**

```
clawsc snapshot save "my-v2"         # save workspace snapshot
clawops promote "my-v2" --workspace ./my-agent  # promote to fleet tier
```

Promotion copies the workspace's three-tier cache state into the fleet snapshot manifest. The fleet snapshot can then be combined with other workspace snapshots to form a complete fleet state.

**Why explicit**: Implicit promotion would blur the boundary. The developer shouldn't accidentally make their local snapshot fleet-visible. Promotion is an ops action.

### Q2: When clawsc watch detects a change and recompiles, does it auto-deploy?

**Answer: No. Watch recompiles. Deploy is always explicit.**

```
clawsc watch                # auto-recompile on change
                            # developer sees diagnostics in real-time
                            # output stays in .craft/cache/
clawsc build                # explicit: compile + emit to output
clawsc snapshot save "v1"   # explicit: checkpoint the state
```

**Why**: Auto-deploy on file save is dangerous. A typo in SOUL.md would immediately deploy a broken agent. Watch mode gives feedback; deployment is a deliberate action.

**Exception**: `clawsc watch --deploy` flag for development environments where auto-deploy is desired. Requires explicit opt-in. Emits a warning: "Auto-deploy enabled. Changes will be emitted on save."

### Q3: Can clawops rollback one workspace in a fleet?

**Answer: Yes. Fleet rollback supports workspace-level granularity.**

```
clawops rollback                        # rollback entire fleet to previous snapshot
clawops rollback --workspace ./my-agent # rollback just this workspace
clawops rollback --team platform-team   # rollback all workspaces owned by team
```

**Why**: Fleet-wide rollback is a blunt instrument. If one team's agent breaks, you don't want to roll back every team. Granular rollback is the common case.

**Implementation**: Fleet snapshot manifest is `Record<string, TieredCacheKeys>` (per-workspace). Restoring a subset means cherry-picking workspace entries from the manifest.

### Q4: If a workspace is amended via clawsc, does clawops drift detect that?

**Answer: Local amendments are NOT drift violations. External policy relaxation IS.**

```
clawsc amend add Skill "research-tool"  # local amendment — workspace evolved
clawops drift                           # DOES NOT flag this as drift
```

vs.

```
# Developer manually edits .craft/policies/local.yaml to remove a rule
clawops drift                           # FLAGS this as drift (policy weakened)
```

**Rule**: Drift = workspace policy is weaker than fleet floor. Content amendments (adding skills, modifying roles) don't affect policy strength. Policy file edits that relax rules DO trigger drift.

**Implementation**: Drift detection compares policy hashes, not content hashes. `detectDrift()` checks `.craft/policies/*.yaml` hashes against fleet baseline, not workspace source files.

### Q5: Can a remote clawops session control a local clawsc compilation host?

**Answer: Not in Phase 1. Future capability via session delegation.**

Phase 1: clawops operates on workspace files via filesystem access. It reads `.craft/` directories, runs `guard check` / `fleet guard`, and manages fleet state. It does NOT connect to running clawsc processes.

Future (Phase 3 Bridge): Session delegation protocol where clawops can request a workspace recompile from a running clawsc session. This requires:
- Session registry (advertise running sessions)
- RPC channel (clawops → clawsc)
- Auth (only authorized ops can trigger remote recompile)

This is the "live push" capability — clawops pushes a policy change, and all clawsc watch sessions pick it up and recompile automatically. But this is Phase 3, not Phase 1.

### Q6: Fleet-wide snapshot integrity — forest hash or fleet-level hash?

**Answer: Fleet-level hash that covers all workspace snapshot hashes.**

```
FleetSnapshotManifest = {
  name: string;
  createdAt: number;
  workspaces: Record<string, {
    workspaceRef: string;
    snapshotName: string;
    integrityHash: string;       // per-workspace SHA-256
  }>;
  fleetIntegrityHash: string;    // SHA-256 over sorted workspace integrity hashes
}
```

**Why two levels**: Per-workspace hash enables cherry-pick restore (Q3). Fleet-level hash enables whole-fleet verification. If any workspace snapshot is corrupted, the fleet hash breaks. If only one workspace needs rollback, its individual hash verifies independently.

---

## Boundary Diagram

```
                    WORKSPACE SCOPE                     FLEET SCOPE
                    (clawsc)                            (clawops)
                    ─────────────                       ──────────
    Source Files ──► Compile ──► IR ──► Emit            Fleet Policies
         │              │         │       │                   │
         │          Dep Graph  Optimize  Build            Broadcast
         │              │                  │                   │
         ▼              ▼                  ▼                   ▼
    Watch Mode     Invalidate         Snapshot    ──►    Fleet Snapshot
         │              │              (local)     promote   (fleet)
         │              ▼                  │                   │
    Auto-recompile  Amend              Save/Restore      Push/Rollback
         │              │              Diff/Deploy        Report/Drift
         │              │                                     │
         ▼              ▼                                     ▼
    Diagnostics     Guard Check                        Compliance Dash
    (real-time)     (local policy)                     (fleet-wide)
         │              │
         │              ▼
         │          Comply / Audit
         │          (evidence gen)
         │
         ▼
    [explicit] ──► Build / Deploy
                   (developer decides)
```

---

## Key Findings

1. **The boundary is scope, not lifecycle stage** — build/govern/operate all exist at both workspace and fleet level
2. **20 capabilities are workspace-local, 13 are fleet-wide, 3 are transitional** — clean split
3. **Watch mode does NOT auto-deploy** — feedback is instant, deployment is deliberate
4. **Amendments are NOT drift violations** — drift measures policy strength, not content change
5. **Snapshot promotion is the bridge** — explicit `clawops promote` crosses the workspace→fleet boundary
6. **Fleet rollback supports workspace-level granularity** — cherry-pick from manifest
7. **Remote session control is Phase 3** — Phase 1 operates via filesystem, not process-to-process
8. **Two-level integrity hashing** — per-workspace for granular restore, fleet-level for whole-fleet verification
