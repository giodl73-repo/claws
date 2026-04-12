# Experiment a: Capability-to-Command Mapping

**Method**: design analysis
**Date**: 2026-04-11
**Sources**: docs/concepts/compiler/ (cache-snapshots, forest-sessions, incremental-compilation, amendments, three-tier-cache), design/suite/COMMAND-MAP.md, design/suite/specs/SU-01-architecture.md

---

## Mapping Table

Each row maps a codebase capability to its proposed clawsc or clawops command, the underlying craft/guard/fleet call, and the implementation status.

### Build Capabilities → clawsc

| Capability | clawsc Command | Maps to | Implementation | Key File |
|-----------|---------------|---------|----------------|----------|
| **OC workspace compilation** | `clawsc compile` | `craft compile` (auto-detect OC) | Reader: implemented; FORMA: implemented | openclaw-reader.ts, oc-*.ts primitives |
| **Compile + emit** | `clawsc build` | `craft build` (auto-detect OC) | Implemented | openclaw-emitter.ts |
| **Cross-compile to target** | `clawsc build <target>` | `craft build <target>` | 29 targets live | emit/platforms/ |
| **Boost passes** | `clawsc optimize` | `craft optimize` | Implemented | optimizer/ |
| **Semantic diff** | `clawsc diff` | `craft diff` | Implemented | - |
| **Reverse-compile** | `clawsc import` | `craft import` | Implemented | - |
| **Show compiled IR** | `clawsc inspect` | `craft inspect` | Implemented | - |
| **Scenario validation** | `clawsc test` | `craft test` | Implemented | - |
| **Health check** | `clawsc doctor` | `craft doctor` | Planned | - |

### Incremental Compilation → clawsc

| Capability | clawsc Command | Maps to | Implementation | Key File |
|-----------|---------------|---------|----------------|----------|
| **Dependency graph** | *(internal — no direct command)* | Used by compile/build | Implemented | dependency-graph.ts |
| **Targeted invalidation** | *(internal — triggered by watch/amend)* | Used by session | Implemented | compilation-host.ts |
| **Watch mode** | `clawsc watch` | `craft build --session` (watch) | Planned | forest-sessions.md |
| **Session mode** | `clawsc session` | `craft build --session` | Planned | forest-sessions.md |

### Amendments → clawsc

| Capability | clawsc Command | Maps to | Implementation | Key File |
|-----------|---------------|---------|----------------|----------|
| **Add concept** | `clawsc amend add <type> <name>` | FORMA amendment (add) | Implemented | amendment.ts |
| **Remove concept** | `clawsc amend remove <type> <name>` | FORMA amendment (remove) | Implemented | amendment.ts |
| **Modify concept** | `clawsc amend modify <type> <name>` | FORMA amendment (modify) | Implemented | amendment.ts |
| **Batch amendments** | `clawsc amend --batch <file>` | FORMA batch pipeline | Implemented | amendment.ts |
| **Dry-run** | `clawsc amend --dry-run` | FORMA dry-run | Implemented | amendment.ts |

### Snapshots → clawsc (workspace-local) AND clawops (fleet-wide)

| Capability | clawsc Command | clawops Command | Maps to | Implementation | Key File |
|-----------|---------------|----------------|---------|----------------|----------|
| **Save snapshot** | `clawsc snapshot save <name>` | `clawops snapshot save <name>` | cache snapshot save | Planned (Spec 122) | cache-snapshot.ts |
| **Restore snapshot** | `clawsc snapshot restore <name>` | `clawops snapshot restore <name>` | cache snapshot restore | Planned (Spec 122) | cache-snapshot.ts |
| **Diff snapshots** | `clawsc snapshot diff <a> <b>` | `clawops snapshot diff <a> <b>` | cache snapshot diff | Planned (Spec 122) | cache-snapshot.ts |
| **Deploy from snapshot** | `clawsc snapshot deploy <name>` | `clawops snapshot deploy <name>` | cache snapshot deploy | Planned (Spec 122) | cache-snapshot.ts |
| **Prune old snapshots** | `clawsc snapshot prune --keep N` | `clawops snapshot prune --keep N` | cache snapshot prune | Planned (Spec 122) | cache-snapshot.ts |
| **Verify integrity** | `clawsc snapshot verify <name>` | `clawops snapshot verify <name>` | SHA-256 manifest check | Planned (Spec 122) | cache-snapshot.ts |

**Key distinction**: clawsc snapshot operates on ONE workspace. clawops snapshot operates on ALL workspaces in the fleet (forest-level snapshot).

### Governance → clawsc

| Capability | clawsc Command | Maps to | Implementation | Key File |
|-----------|---------------|---------|----------------|----------|
| **Policy validation** | `clawsc check` | `guard check` | Shipped (CP-2) | policy-validation-pass.ts |
| **Policy with template** | `clawsc check --template soc2` | `guard check --policy soc2` | Shipped (CP-2) | templates/policies/ |
| **Compliance artifacts** | `clawsc comply` | `guard comply` | Shipped (CP-2) | artifact-signer.ts |
| **Risk classification** | `clawsc assess` | `guard assess` | Planned | - |
| **Audit verify** | `clawsc audit verify` | `guard audit verify` | Shipped (CP-2) | audit-chain.ts |
| **Audit export** | `clawsc audit export` | `guard audit export` | Shipped (CP-2) | siem-emitter.ts |
| **Init governance** | `clawsc init` | `guard init` | Shipped (CP-2) | guard-cli/init.ts |
| **Budget check** | `clawsc budget` | `guard budget` | Planned | - |

### Fleet / Ops → clawops

| Capability | clawops Command | Maps to | Implementation | Key File |
|-----------|----------------|---------|----------------|----------|
| **Discover workspaces** | `clawops scan` | `guard scan` | Planned | - |
| **AI Bill of Materials** | `clawops scan --aibom` | `guard scan --aibom` | Planned | - |
| **Drift detection** | `clawops drift` | `fleet guard --drift` | Planned (CP-3) | - |
| **Policy broadcast** | `clawops broadcast` | `fleet guard --scan` | Planned (CP-3) | - |
| **Compliance report** | `clawops report` | `fleet guard --report` | Planned (CP-3) | - |
| **Compliance history** | `clawops history` | `fleet guard --history` | Planned (CP-3) | - |
| **Agent status** | `clawops status` | `fleet status` | Planned | - |
| **Emergency stop** | `clawops kill` | `fleet kill` | Planned | - |
| **Token budgets** | `clawops budget` | `guard budget` (fleet-scoped) | Planned | - |
| **Secret vault init** | `clawops secrets init` | `guard secrets init` | Planned (CP-4a) | - |
| **Secret set/rotate** | `clawops secrets set` | `guard secrets set` | Planned (CP-4a) | - |
| **SSO/RBAC config** | `clawops identity` | identity-bridge | Planned (CP-4a) | - |

### Live Push / Rollback → clawops

| Capability | clawops Command | Maps to | Implementation | Key File |
|-----------|----------------|---------|----------------|----------|
| **Fleet-wide push** | `clawops push` | broadcast compiled artifacts | NEW — needs design | - |
| **Fleet-wide rollback** | `clawops rollback` | restore fleet snapshot + re-deploy | NEW — needs design | - |
| **Promote workspace snapshot** | `clawops promote <name>` | copy ws snapshot to fleet tier | NEW — needs design | - |

---

## Coverage Analysis

| Source | Total capabilities | Mapped to clawsc | Mapped to clawops | Unmapped |
|--------|-------------------|-----------------|-------------------|----------|
| Build (craft) | 9 | 9 | 0 | 0 |
| Incremental | 4 | 2 explicit + 2 internal | 0 | 0 |
| Amendments | 5 | 5 | 0 | 0 |
| Snapshots | 6 | 6 (workspace) | 6 (fleet) + 3 new | 0 |
| Governance (guard) | 8 | 8 | 0 | 0 |
| Fleet (fleet) | 12 | 0 | 12 | 0 |
| Live push/rollback | 3 | 0 | 3 | 0 |
| **Total** | **47** | **30** | **24** | **0** |

Note: Snapshots appear in both because they exist at two scopes (workspace and fleet).

---

## Key Findings

1. **47 capabilities map cleanly to 30 clawsc + 24 clawops commands** — no orphan capabilities
2. **Snapshots are the only capability that spans both CLIs** — workspace scope (clawsc) and fleet scope (clawops)
3. **3 new capabilities needed** for clawops that don't exist yet: fleet push, fleet rollback, snapshot promote
4. **Amendments are purely workspace-local** — no fleet-level amendment concept exists (nor should it)
5. **Watch/session modes are clawsc-only** — interactive compilation is always workspace-local
6. **The dependency graph and targeted invalidation are internal** — no user-facing command, they power watch/amend
