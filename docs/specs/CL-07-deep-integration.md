# CL-07: Deep Integration

> **Status: Retired** — Succeeded by the per-package spec scheme in
> `c:\src\claws\docs\`. Successor: `guardrails/specs/GRG-guardrail-provider.md`
> + `GRD-host-adapter.md` + `GRF-file-ingest.md`. Amendments A and B
> from the Horus wave are ALSO merged into `snap/specs/SNP-promote.md`.
> Content preserved for historical reference. Do not amend.

**Source**: Q12p, Q12b
**Reviewers**: compiler-architect, enterprise-architect, open-source-strategist

---

## Overview

This spec defines how claws integrates deeply with Craftworks' existing infrastructure (atoms, IRs, readers) and how Craftworks contributes governance primitives upstream to the OpenClaw ecosystem. These are the two sides of the same coin: deep reuse internally enables lightweight contribution externally.

48 Craftworks atoms are directly reusable by claws. The CREST-to-OC file mapping shows 7 of 12 OC file types benefit from CREST pattern reuse. The tension model (atom:tension) powers cross-file conflict detection, auto-resolving 5 of 7 conflict categories through cluster priority. The eval framework provides a 4-tier governance testing architecture (G0-G3) that requires no modification -- only governance-specific rubrics and scenarios.

The upstream contribution roadmap delivers 5 runtime packages + 1 spec PR across 3 waves (16 weeks). The boundary is architectural: contribute the runtime governance layer (audit, identity, budgets, secrets, SIEM) that anyone could build; keep the compile-time engine (policy IR, guard passes, fence enforcement, RELAX evaluation, cross-compilation) that only Craftworks can build.

## Scope

**In scope**:
- 48 atoms reused from Craftworks (DIRECT, EXTEND, INSPIRE classifications)
- CREST-to-OC file mapping (7/12 reuse, 5 standalone)
- Tension analysis for cross-file governance conflicts
- Eval framework for `claws test` (G0-G3 tiers)
- Upstream contribution roadmap (3 waves, 16 weeks)
- Contribute/keep boundary (18 capabilities contributed, 8 kept, 4 spec-only)
- @openclaw/ npm scope and packaging strategy
- GuardrailProvider spec PR

**Out of scope**:
- Specific @claws/* package APIs (CL-06)
- Compilation pipeline phases (CL-04)
- Runtime enforcement mechanics (CL-03)

**Depends on**: CL-04 (compilation pipeline), CL-06 (package ecosystem)

## Conformance References

This spec's reuse claims trace to the following governing specifications:

| Reuse Claim | Governing Spec | Conformance Note |
|-------------|---------------|------------------|
| FORMA dual-path parsing | **Spec 109 (FormaIR)** — `design/astro/SPECIFICATIONS.md` | claws reuses `readOCWorkspaceViaFORMA()` and `projectFormaToOCWorkspace()` directly. FormaIR is the intermediate representation; CREST is the input format. |
| RELAX typed expressions | **Spec 139 (RELAX)** — `design/astro/SPECIFICATIONS.md` | claws uses RELAX for zero-token-cost policy evaluation. **Open question**: Spec 139 defines tiered bindings (compile-time, runtime, hybrid). claws's compile-time-only model may conflict with the runtime binding tier. See Open Questions #7. |
| PRESS module reuse | **PRESS** — `compiler-sdk/src/astro/press/` | 5 of 7 PRESS modules reused via generic interfaces. Backward-compatible generalization. |
| Eval framework (G0-G3) | **Eval framework** — `agent-sdk/src/eval/` | claws adds governance YAML rubrics and scenarios. The eval engine itself (EvalTierResult, judge execution, pass^k) is unmodified. |
| FE5 trust-tier resolution | **Guard passes** — `compiler-sdk/src/astro/guard/` | FE5 resolves trust tiers through role hierarchies. Used by claws for workspace trust tier enforcement. |
| Tension model (7 clusters) | **atom:tension (A192)** — `docs/ATOMS.md` | 7-cluster model with configurable priority ordering. claws uses clusters A-G for cross-file governance conflict detection. |

## Design

### CREST-to-OC File Mapping

7 of 12 OC file types benefit from CREST reader pattern reuse:

```
OC File Types (12)
  |
  +-- DIRECT (3): AGENTS.md, skills/, lobster.yaml
  |     Uses: read-agents-md.ts, read-skill-dir.ts, StageTaskIR
  |
  +-- EXTEND (3): SOUL.md, TOOLS.md, MEMORY.md
  |     Uses: ROLE.md reader patterns, tool-list parser, memory-list parser
  |
  +-- INSPIRE (1): HEARTBEAT.md/BOOT.md
  |     Uses: TASK.md reader stage/gate/graph model
  |
  +-- STANDALONE (5): IDENTITY.md, USER.md, BOOTSTRAP.md, openclaw.json, canvas/
        Uses: shared FORMA infrastructure (extractFrontmatter, parseSections, Zod)
```

The OCWorkspaceIR is already the bridge. `readOCWorkspaceViaFORMA()` runs FORMA as primary parser with heuristic shadow comparison. `projectFormaToOCWorkspace()` type-safely projects FormaIR to OCWorkspaceIR. claws's parser reuses this entire infrastructure by defining `openclaw.format.yaml` and projecting FormaIR to GovernanceIR.

### Tension Analysis for Governance Conflicts

The tension model (atom:tension, A192) with 7 clusters (A-G) maps directly to claws's cross-file conflict detection:

```
Q12j Conflicts              Tension Clusters       Resolution
-------------------        -----------------      ------------------
DENY-vs-TOOL          -->  A(gov) vs D(exec)  --> A wins (auto)
TRUST-ESCALATION      -->  B(auth) vs D(exec) --> B wins (auto)
OBO-WITHOUT-ELICIT    -->  A(gov) vs F(soc)   --> A wins (auto)
DATA-LABEL-MISMATCH   -->  A(gov) vs D(exec)  --> A wins (auto)
SCHEDULE-NO-APPROVAL  -->  B(auth) vs D(exec) --> B wins (auto)
CIRCULAR-DELEGATION   -->  E(exp) vs E(exp)   --> Escalate (human)
SKILL-TOOL-GHOST      -->  ref integrity       --> G1 assertion
```

5 of 7 conflict categories auto-resolve via cross-cluster priority ordering (A > C > B > D > F > E > G). The priority ordering is configurable via `claws.json` for enterprises that want different governance hierarchies. The tension model is dual-use: compile-time lint (`claws check`) and runtime agent-agent conflict resolution.

Existing infrastructure reused: synonym detection (10 curated pairs), duplicate rejection, schema validation from `role-md-reader.ts`, and `negotiateTension()` with custom `priorityOverride`.

### Eval Framework for `claws test` (G0-G3 Tiers)

The existing 4-tier eval architecture maps to governance testing:

| Tier | Name | What It Tests | Cost | Speed | When |
|------|------|-------------|------|-------|------|
| G0 | Schema Validation | Workspace files parse, required files present, frontmatter valid | Free | <10ms | Pre-commit |
| G1 | Cross-File Integrity | 7 conflict categories, referential integrity, trust tier consistency | Free | <100ms | Pre-commit |
| G2 | Semantic Governance | Boundary specificity, tool coverage, boundary-tool alignment (LLM-as-judge) | LLM call | <10s | CI |
| G3 | Runtime Enforcement | Mock Gateway executes compiled governance, verifies blocking/approval/audit | Mock setup | <30s | CD |

**Progressive disclosure**: `claws test` defaults to `--max-tier G1` (fast, free). `claws test --ci` runs G0-G2. `claws test --full` runs G0-G3.

**Framework reuse**: The type system (EvalTierResult, EvalAssertionResult, EvalJudgeCriterionScore), judge execution, pass^k consistency, baseline comparison, section ablation, and JSON output envelope all transfer directly from the existing eval framework. Adding governance evaluation means writing YAML rubrics and scenario files, not modifying the eval engine.

**G2 governance rubrics** (LLM-as-judge):
- Boundary specificity: "Are SOUL.md constraints specific enough to be mechanically extracted?"
- Tool coverage: "Do governance rules cover all declared tools?"
- Boundary-tool alignment: "Do SOUL.md deny intents match actual tool restrictions?"

**G3 Mock Gateway**:
- MockGateway simulates OC runtime (tool calls, agent messages, exec-approvals)
- Verifies: "Is postgres-cli actually blocked?", "Was an approval event emitted?", "Did the audit chain record the decision?"
- CI output: SARIF format for GitHub Code Scanning integration

### Upstream Contribution Roadmap (3 Waves, 16 Weeks)

```
Wave 1 (weeks 1-4): FOUNDATION STRIKE
+-- GuardrailProvider spec PR -> openclaw/openclaw
+-- @openclaw/identity-bridge   (RBAC + OIDC/SAML)
+-- @openclaw/budget-meter      (token counting + throttle)
+-- @openclaw/audit-chain       (hash-chained JSONL)

Wave 2 (weeks 5-8): ECOSYSTEM EXPANSION
+-- @openclaw/siem-emitter      (CEF, NDJSON, syslog)
+-- @openclaw/secret-scanner    (regex + entropy)
+-- @openclaw/governance-types  (Zod schemas, T0-T4 types)
+-- Policy templates (EU AI Act, SOC2, minimal)
+-- fence-runtime (FE1+FE2 as GuardrailProvider impl)
+-- Audit chain format spec (docs site)

Wave 3 (weeks 9-16): ENTERPRISE ECOSYSTEM
+-- @openclaw/fleet-governance  (drift + compliance + registry)
+-- @openclaw/artifact-signer   (HMAC-SHA256 manifest)
+-- @openclaw/governance-composition (scope algebra)
+-- @openclaw/governance-context (cross-host trust)
+-- @openclaw/governance-rule-loader (YAML parser, RELAX injection point)
+-- Trust tier specification (docs site)
```

### Contribute/Keep Boundary

```
CONTRIBUTE (runtime, 18 capabilities)     KEEP (compile-time moat, 8 capabilities)
  Audit trail (hash-chained)                Policy compiler (YAML -> PolicySet)
  Budget enforcement + charter              Guard passes G1-G6 (skill hardening)
  Identity/RBAC                             Guard CLI (6 commands)
  SIEM/audit event emission                 RELAX governance evaluator
  Secret detection patterns                 Expression policy enforcement
  Artifact signer (HMAC-SHA256)             Cross-format compilation (29 targets)
  Fleet drift detector                      CGR emitter
  Fleet compliance report                   Risk classification engine
  Governance composition algebra
  Fence FE1 + FE2 stubs
  CGR type schemas
  Policy templates
  Governance context
  Rule loader (core, sans RELAX)
  Fleet policy registry
  Write-ahead log
  FE6 section locks
  Governance rule loader
```

**The moat** is guard passes analyzing skill IR, FE5 trust-tier resolution through role hierarchies, RELAX-evaluated policies at zero token cost, and CGR emission integrated with the full compilation pipeline.

### First PR: GuardrailProvider Spec

Highest-leverage first contribution -- define the governance interface before implementing it:
- `GuardrailProvider` interface (preAuthorize, postAudit, getCapabilities)
- `AuthorizationDecision` type (allow, deny, review, modify)
- Chain-of-responsibility provider registry
- Reference `ShellExecProvider` wrapping existing OC exec approvals
- Zero code extraction, zero npm infrastructure required
- Positions Craftworks as the governance architect before any package ships

### Package Strategy

| Decision | Choice |
|----------|--------|
| npm scope | `@openclaw/` with foundation agreement; `@craftworks/` fallback |
| Vehicle | Standalone monorepo (`craftworks/openclaw-governance`) |
| License | MIT for contributed (matches OC); Apache 2.0 for proprietary |
| Versioning | Changesets for independent package versioning |
| Telemetry | Anonymous, opt-in (installs, daily active workspaces) |

### Community Demand Alignment

| Rank | Demand | Package | Evidence |
|------|--------|---------|----------|
| 1 | RBAC / permissions | identity-bridge | 28+ reactions on #8081 |
| 2 | Cost control / budgets | budget-meter | Commercial product exists (OC Firewall) |
| 3 | Audit / compliance | audit-chain | Third-party tool (Clawprint) exists |
| 4 | SIEM integration | siem-emitter | Enterprise SOC requirement |
| 5 | Secret detection | secret-scanner | 1.5M tokens exposed in breach |

### 48 Atoms Reused

Categories of reuse across the Craftworks atom registry:

| Category | Count | Examples |
|----------|-------|---------|
| DIRECT (unchanged) | 48 | PolicyIR, GovernanceIR, ToolIR, TierIR, audit chain, RELAX engine, format readers, PRESS modules |
| INVESTIGATE (this spec) | 32 | CREST file mapping (6), tension analysis (5), eval framework (5), compilation host (6), runtime contracts (6), remaining (4) |
| SKIP (irrelevant) | 83 | Craftworks-specific atoms (waves, plans, reviews, disciplines) |

## FORMA Sidecar Registration: `.claws`

claws registers `.claws` as a FORMA sidecar target in the compiler-sdk format registry. This is NOT a parallel implementation — it is a format registration alongside `.craft`, reusing the same sidecar abstraction that the compiler-sdk already provides.

### FORMA Format Registration

```typescript
{
  sidecar: '.claws',
  config: 'claws.json',
  layout: {
    compiled:   '.claws/compiled/',      // governance-ir.json, rules.json, handler-registry.json
    staging:    '.claws/staging/',        // atomic write staging area
    keys:       '.claws/keys/',          // signing keys (audit, approval, archive)
    audit:      '.claws/audit/',         // hash-chained audit (chain.jsonl, receipts/)
    cache:      '.claws/cache/',         // incremental compile, boost, snapshots
    policies:   '.claws/policies/',      // enterprise policy YAML files
    secrets:    '.claws/secrets/',       // credential escrow (vault.enc, vault.salt)
    config:     '.claws/config/',        // siem.yaml, audit.yaml, keys.yaml, url-allowlist.yaml
    snapshots:  '.claws/snapshots/',     // governance snapshots (save/restore)
    runtime:    '.claws/runtime/',       // gateway.pid
    fleet:      '.claws/fleet/',         // broadcast-manifest.json, fleet-template.yaml
    compliance: '.claws/compliance/',    // signed compliance artifacts (SOC2, HIPAA, EU AI Act)
    supply:     '.claws/supply/',        // blocklist.json
  }
}
```

### Workspace File Inventory

claws reads 9 OpenClaw workspace files (NOT `.claws-*` prefixed files):

| File | Content | Governance role |
|------|---------|----------------|
| `SOUL.md` | Persona, boundaries, deny rules | G-CLASS, G-INPUT source of truth |
| `TOOLS.md` | Tool declarations with risk levels | G-CLASS risk assignment |
| `AGENTS.md` | Agent declarations, delegation, trust | G-A2A-*, delegation graph |
| `MEMORY.md` | Memory config, data sensitivity labels | G-DATA, G-CONTEXT |
| `IDENTITY.md` | Identity configuration | G-A2A-IDENTITY |
| `USER.md` | User preferences, pre-authorizations | G-ELICIT standing approvals |
| `HEARTBEAT.md` | Scheduled tasks, cron | G-BOUND scheduling |
| `claws.json` | Compiler config, inputs, targets | Pipeline configuration |
| `exec-approvals.json` | Tool approval state | G-ELICIT approval records |

### Sidecar Root Files

| File | Purpose |
|------|---------|
| `.claws/KILL` | Kill switch flag — deny-all enforcement |
| `.claws/build.lock` | Build mutex |
| `.claws/broadcast.lock` | Fleet broadcast mutex |
| `.claws/watcher.pid` | Inner ring watcher process ID |
| `.claws/watcher-pause.lock` | Pause inner ring during middle-ring ops |
| `.claws/scan-result.json` | Fleet scan state cache |

### External Directories (survive `rm -rf .claws`)

| Directory | Purpose |
|-----------|---------|
| `.claws-backups/` | Pre-upgrade and pre-uninstall backups |
| `.claws-audit-archive/` | Archived audit trails post-uninstall |

### Workspace Root Files (not in sidecar)

| File | Purpose |
|------|---------|
| `claws.json` | Main compiler config (inputs, targets, policies) |
| `.claws-manifest.json` | Package manifest for publishing |

### Coexistence

`.claws/` and `.craft/` can coexist in the same workspace. A developer using both the craft plugin and claws governance compiler sees both sidecars independently. No collision — each registered FORMA format owns its own directory.

### Design Constraints

- **`.claws` is a FORMA registration, not custom code**: The sidecar abstraction in compiler-sdk handles all path resolution. claws never calls `join(workspace, '.claws')` directly.
- **All SDK paths resolve through the format layout**: Any compiler-sdk code that currently does `join(workspace, '.craft')` uses the format's `sidecar` field instead when operating in claws context.
- **No `.craft` in customer workspace**: A claws-only customer never sees `.craft`. The internal delegation from `claws publish` to `craft package` is invisible.
- **9 workspace files are OC-native**: claws reads standard OpenClaw files (SOUL.md, TOOLS.md, etc.), NOT `.claws-*` prefixed files. The workspace looks like any OC workspace.

---

## Praetor Infrastructure Integration

This section defines how claws connects to six Praetor enterprise infrastructure systems. Each subsection maps a Praetor capability to a claws integration point, showing the before/after architecture and listing design constraints that govern the boundary.

### InputResolver Integration (Praetor Part 7)

The `claws.json` `inputs` section uses the InputResolver source format to declare where workspace content originates. InputResolver supports three source types -- `file` (local paths), `package` (npm packages like `@corp/soc2-policies`), and `url` (remote policy endpoints). The 9 default workspace files (SOUL.md, TOOLS.md, MEMORY.md, IDENTITY.md, USER.md, BOOTSTRAP.md, AGENTS.md, HEARTBEAT.md, openclaw.json) are implicit `file` sources. Enterprise governance additionally flows from packages and URLs, enabling centrally managed policy distribution.

During the PARSE phase, `InputResolver.resolve()` is called for each declared source, producing a unified stream of workspace content regardless of origin. Provenance is tracked through the CGR (Compilation Governance Record), so every governance rule can be traced back to its source -- whether a local file, an npm package version, or a URL fetch timestamp.

**Before**: claws reads workspace files directly from the filesystem. Governance policies must be copied into the workspace manually. No provenance tracking for external content.

**After**: claws delegates source resolution to InputResolver. Governance can originate from any combination of local files, npm packages, and URLs. Every resolved input carries provenance metadata in the CGR.

- **InputResolver is the single entry point for all workspace content**: claws never reads files directly during PARSE; all content flows through `InputResolver.resolve()`.
- **The 9 default workspace files are implicit file sources**: If `claws.json` omits an `inputs` section, the 9 files are resolved as local `file` sources with default paths.
- **Package sources must declare version ranges**: `@corp/soc2-policies@^2.0` is valid; unversioned package sources are rejected at parse time.
- **URL sources are cached with TTL**: Remote policies are fetched once per compilation and cached. TTL defaults to 1 hour, configurable via `claws.json`.
- **CGR provenance is mandatory**: Every resolved input produces a provenance entry (source type, version/hash, timestamp) in the CGR. Missing provenance fails compilation.

Cross-references: CL-01 (CLI surface, `claws.json` schema), CL-04 (PARSE phase), Praetor Part 7 (InputResolver specification).

### Package Output Integration (Praetor Part 8)

The `claws publish` command delegates to `craft package build` followed by `craft package publish`, reusing the existing Craftworks package infrastructure rather than building a parallel publishing pipeline. Badge metadata (governance tier, compilation hash, rule count) is injected into the package via the artifact slicer before publish. Incremental publish compares the current compilation hash against the last published version and skips unchanged packages.

This closes the ecosystem loop: governance packages published via npm can be consumed as InputResolver `package` sources by other workspaces, creating a governance supply chain where compiled policies flow from producers to consumers through the standard npm registry.

**Before**: `claws publish` would need its own build/publish infrastructure. Badge metadata would require a separate injection step. No incremental publish support.

**After**: `claws publish` delegates to `craft package build` + `craft package publish`. Badge metadata is injected by the artifact slicer during build. Incremental publish skips unchanged packages automatically.

- **claws publish is a thin wrapper**: All build and publish logic lives in `craft package`; claws adds only badge metadata injection and incremental hash comparison.
- **Badge metadata is injected before publish, not after**: The artifact slicer injects badges during `craft package build`, ensuring they are part of the published artifact.
- **Incremental publish uses compilation hash**: The CGR compilation hash determines whether a publish is needed. Hash match = skip.
- **Published packages are valid InputResolver sources**: Any package published via `claws publish` can be consumed as a `package` source in another workspace's `claws.json`.

Cross-references: CL-05 (developer experience, publish workflow), CL-06 (platform ecosystem, npm packaging), Praetor Part 8 (package infrastructure).

### OntologyIR Integration (Praetor Part 6)

Compliance frameworks such as SOC2 controls and HIPAA safeguards compile through OntologyIR into governance rules, extending claws's existing governance compilation with ontology-driven rule generation. This is a new capability: rather than manually authoring governance rules for each compliance requirement, enterprises declare compliance ontologies and claws generates the corresponding rules. The command `claws compile --ontology compliance/soc2.onto.yaml` triggers this path.

OntologyIR provides the semantic layer that maps compliance concepts (controls, safeguards, evidence requirements) to claws's GovernanceIR rule format. The mapping is declarative -- each ontology node specifies which governance rule template to instantiate and what parameters to bind.

**Before**: Compliance rules must be hand-authored as governance YAML. Each SOC2 control requires a separate rule definition. No semantic relationship between compliance concepts and governance rules.

**After**: Compliance frameworks are declared as ontology YAML files. OntologyIR compiles them into GovernanceIR rules automatically. Semantic relationships between controls are preserved, enabling cross-control conflict detection.

- **OntologyIR is an input format, not a replacement for GovernanceIR**: Ontology files compile down to standard GovernanceIR rules. The rest of the pipeline is unchanged.
- **Ontology-generated rules carry provenance**: Each generated rule traces back to the originating ontology node and compliance control ID.
- **Ontology compilation is optional**: Workspaces without `--ontology` flag compile normally. OntologyIR is additive.
- **Cross-control conflicts use tension analysis**: When two ontology-generated rules conflict, the existing tension model (7 clusters) resolves them.
- **Ontology schemas are versioned independently**: `soc2.onto.yaml` version 2.0 may generate different rules than 1.0. Version is tracked in CGR.

Cross-references: CL-04 (compilation pipeline, GovernanceIR), CL-02 (security model, compliance evidence), Praetor Part 6 (OntologyIR specification).

### Compiled Context Integration (Praetor Part 9)

Fleet broadcast uses context collections to distribute compiled governance across workspaces. A fleet policy is a governance layer marked as `protected`, meaning downstream workspaces cannot weaken it -- only extend. A fleet of 100 workspaces consists of 1 root context (the fleet policy) and 100 fork contexts (per-workspace customizations), with structural sharing ensuring unchanged rules are not duplicated.

Monotonic tightening is enforced at the context layer level: a fork context can add rules or increase restriction levels but cannot remove rules or decrease restriction levels from its parent. Fleet drift is computed as a context diff between the root and each fork, surfacing workspaces that have diverged from the fleet baseline.

**Before**: Fleet governance is distributed as static files. No structural sharing. Drift detection requires full re-compilation of each workspace. No monotonic tightening guarantee.

**After**: Fleet governance uses compiled context collections with structural sharing. Drift is a context diff operation. Monotonic tightening is enforced by the context layer, not by convention.

- **Fleet policy is a protected context layer**: The `protected` flag prevents downstream weakening. Only the fleet owner can modify protected layers.
- **Structural sharing minimizes broadcast payload**: Unchanged rules reference the root context by hash. Only delta rules are transmitted per fork.
- **Monotonic tightening is enforced, not advisory**: A fork that attempts to weaken a root rule fails compilation with a tightening violation error.
- **Fleet drift is a context diff**: `claws fleet drift` computes the diff between root and fork contexts, not between full compilations.
- **Context collections are versioned**: Each broadcast increments the context version. Forks track which root version they extend.

Cross-references: CL-05 (developer experience, fleet operations), CL-07 (upstream contribution, fleet-governance package), Praetor Part 9 (compiled context specification).

### Loss-Aware Routing for Platform Emission (Praetor Part 1)

The 7 target platforms (OpenClaw, Cursor, Claude Code, GitHub Copilot, Amazon Bedrock, LangGraph, CrewAI) have different enforcement capabilities, creating a loss matrix where some governance rules cannot be natively enforced on some platforms. `claws build --target cursor` uses the path enumerator to find the lowest-loss emission path for each rule. R5 tools (non-negotiable security) default to `--strict-loss`, which fails the build if any R5 rule would incur loss on the target platform.

The loss scoring model assigns: native enforcement = 0.0 (no loss), advisory-only enforcement = 0.5 (degraded), no enforcement capability = 1.0 (full loss). The total loss score for a build is the weighted sum across all rules, with R5 rules weighted at infinity (any loss = build failure in strict mode).

**Before**: Platform emission is best-effort. Rules that cannot be enforced on a target platform are silently dropped or downgraded to comments. No loss visibility.

**After**: Every rule has a per-platform loss score. The path enumerator selects the lowest-loss emission strategy. R5 strict mode guarantees zero loss for security-critical rules. Loss reports are part of the CGR.

- **Loss matrix is static per platform version**: Each platform version has a fixed capability matrix. The loss matrix is updated when platforms release new governance features.
- **R5 strict-loss is non-configurable**: `--strict-loss` is always enabled for R5 rules. There is no flag to disable it. This is the fail-closed guarantee.
- **Path enumerator selects per-rule, not per-build**: Different rules in the same build may use different emission strategies for the same platform.
- **Loss reports are CGR artifacts**: The CGR includes a per-rule loss breakdown so enterprises can audit what was degraded and why.
- **Advisory-only emission includes runtime warning hooks**: Rules emitted as advisory (0.5 loss) inject warning hooks that log enforcement gaps at runtime.

Cross-references: CL-04 (compilation pipeline, emission phase), CL-01 (CLI surface, `--target` flag), Praetor Part 1 (loss-aware routing specification).

### Identity Bridge for OBO (Praetor Part 5)

OBO (On Behalf Of) approval tokens use the identity bridge for OIDC/SAML verification, mapping enterprise identity providers to claws's trust tier system. The identity bridge translates external identity assertions (OIDC claims, SAML attributes) into trust tier assignments (T0-T4), enabling governance rules to reference enterprise roles rather than platform-specific identities. Fleet identity maps to trust tiers through a configurable mapping table in `claws.json`.

Approval key management uses credential escrow: OBO approval keys are stored in an escrow service rather than in workspace files, with time-limited retrieval tokens. Section locks (FE6) protect SOUL.md and other governance-critical files from unauthorized modification, using the identity bridge to verify that the modifier has the required trust tier.

**Before**: OBO approvals use platform-native identity. No mapping to enterprise identity providers. Approval keys stored in workspace files. No section-level protection for governance files.

**After**: OBO approvals flow through the identity bridge for OIDC/SAML verification. Trust tiers map to enterprise roles. Approval keys use credential escrow. Section locks protect governance-critical files.

- **Identity bridge is the sole trust-tier assignment mechanism**: claws never assigns trust tiers directly. All tier assignments flow through identity bridge verification.
- **OIDC and SAML are both supported**: The identity bridge abstracts over both protocols. Enterprises configure one or both in `claws.json`.
- **Credential escrow is required for R4+ approval keys**: Approval keys for R4 and R5 rules must use escrow. Inline keys in workspace files are rejected at compile time.
- **Section locks use FE6 fence enforcement**: SOUL.md section locks are FE6 instances. Unlocking requires identity bridge verification at the configured trust tier.
- **Fleet identity mapping is centrally managed**: The fleet owner defines the identity-to-tier mapping. Forks inherit the mapping and cannot weaken it (monotonic tightening).

Cross-references: CL-02 (security model, trust tiers), CL-03 (runtime enforcement, OBO approvals), Praetor Part 5 (identity bridge specification).

## Integration Scenario Amendments

This section consolidates 35 integration scenarios across the six Praetor infrastructure subsystems. Each entry summarizes CL-07-relevant findings that amend or refine the integration design above.

### InputResolver (6 scenarios)

**IR-S01: Default File Resolution Ownership** *(Sources: IR-S01-F01, F02, F03)*: The 9 default workspace files (SOUL.md, TOOLS.md, MEMORY.md, IDENTITY.md, USER.md, BOOTSTRAP.md, AGENTS.md, HEARTBEAT.md, openclaw.json) must be owned exclusively by InputResolver during the PARSE phase. No other subsystem may read these files directly; all access routes through `InputResolver.resolve()`. This prevents race conditions where the compiler and a fleet sync operation both attempt to read the same file, and ensures provenance entries are generated for every file access regardless of origin.

**IR-S02: Package ESM Handling** *(Sources: IR-S02-F01, F02)*: Package sources declared in `claws.json` must resolve ESM exports correctly, including `exports` map lookups, conditional exports (`import` vs `require`), and subpath patterns. InputResolver delegates ESM resolution to Node's native `import.meta.resolve` algorithm rather than reimplementing it, ensuring forward compatibility with future ESM specification changes. Packages that lack an `exports` field fall back to `main` field resolution with a deprecation warning in the CGR.

**IR-S03: URL SRI Integrity** *(Sources: IR-S03-F01, F02, F03)*: URL sources support Subresource Integrity (SRI) hashes declared inline in `claws.json` (e.g., `"integrity": "sha384-..."`). When an SRI hash is present, InputResolver verifies the fetched content against the declared hash before accepting it. SRI verification failure is a hard compilation error -- there is no fallback to unverified content. This closes the supply chain attack vector where a remote endpoint serves modified governance policies.

**IR-S04: Cross-Source Conflict Resolution** *(Sources: IR-S04-F01, F02, F03, F04)*: When multiple sources declare overlapping governance rules (e.g., a local SOUL.md and a package `@corp/soc2-policies` both define tool restrictions), InputResolver emits conflict markers rather than silently merging. Conflict resolution is deferred to the tension analysis phase, where cross-cluster priority ordering determines the winning rule. The CGR records both the conflict and its resolution, providing an audit trail for compliance reviews.

**IR-S05: Collect-All-Errors Diagnostics** *(Sources: IR-S05-F01, F02)*: InputResolver operates in collect-all-errors mode during resolution: a failure to resolve one source does not abort resolution of remaining sources. All resolution errors are accumulated into a structured diagnostic array, enabling the developer to fix all source issues in a single iteration rather than chasing them one at a time. The diagnostic array is both displayed in the CLI and serialized into the CGR for CI integration.

**IR-S06: Provenance Audit Trail for SOC2 Traceability** *(Sources: IR-S06-F01, F02, F03)*: Every resolved input produces a provenance record containing source type, version or content hash, resolution timestamp, and the identity of the resolver (local filesystem, npm registry endpoint, URL). These records form the provenance audit trail required for SOC2 Type II evidence. The trail is immutable once written to the CGR -- subsequent compilation phases may read provenance but never modify it. Auditors can reconstruct the exact inputs to any historical compilation from the CGR alone.

### Package Output (6 scenarios)

**PO-S01: Delegation to Craft Package** *(Sources: PO-S01-F01, F02)*: `claws publish` delegates all build and publish mechanics to `craft package build` and `craft package publish`, adding only governance-specific metadata injection. This means claws inherits craft's workspace protocol support, npm authentication, registry configuration, and error handling without reimplementation. If craft package evolves (e.g., adding provenance attestation to npm), claws gains the capability automatically.

**PO-S02: Badge Schema Registration** *(Sources: PO-S02-F01, F02, F03)*: Badge metadata (governance tier T0-T4, compilation hash, rule count, loss score) follows a registered schema stored in `@openclaw/governance-types`. The schema is versioned independently from the package content, allowing badge format evolution without breaking consumers. Badge validation runs at both publish time (producer) and resolve time (consumer via InputResolver), ensuring that malformed badge data never silently propagates through the governance supply chain.

**PO-S03: Post-Publish Version Handling** *(Sources: PO-S03-F01, F02)*: After a successful publish, `claws publish` writes the published version and compilation hash back into the local `claws.json` as a `lastPublished` record. This enables incremental publish: subsequent compilations compare the current hash against `lastPublished.hash` and skip publish when unchanged. The `lastPublished` record also serves as a rollback reference -- `claws publish --rollback` can unpublish and restore the prior version using this data.

**PO-S04: Transitive Provenance Chains** *(Sources: PO-S04-F01, F02, F03)*: When a published governance package is consumed as an InputResolver source by a downstream workspace, the downstream CGR includes the upstream package's CGR provenance as a nested record. This creates a transitive provenance chain: an auditor reviewing the downstream workspace can trace governance rules through the upstream package back to the original source files. Chain depth is unbounded but practically limited by npm dependency depth conventions.

**PO-S05: Two-Phase Atomicity** *(Sources: PO-S05-F01, F02)*: The `claws publish` pipeline uses two-phase commit semantics: phase 1 builds the package and validates all badges and provenance, phase 2 publishes to the registry. If phase 1 fails, no registry write occurs. If phase 2 fails (e.g., network timeout), the local `lastPublished` record is not updated, ensuring the next run retries the publish. This prevents the inconsistent state where the registry has a package that the local workspace does not know about.

**PO-S06: Multi-Artifact Dependency Limits** *(Sources: PO-S06-F01, F02, F03)*: Governance packages may declare dependencies on other governance packages, but `claws publish` enforces a maximum transitive dependency depth of 5 to prevent governance supply chain sprawl. Packages exceeding this depth fail the publish validation with a structured diagnostic explaining the dependency chain. This limit is configurable in `claws.json` for enterprises that require deeper chains, but the default of 5 is intentionally conservative.

### Ontology Governance (6 scenarios)

**OG-S01: Hierarchical Control Dissolution** *(Sources: OG-S01-F01, F02, F03)*: Compliance frameworks are hierarchical (SOC2 has trust service criteria containing controls containing sub-controls), and OntologyIR preserves this hierarchy during compilation. Dissolution is the process of flattening the hierarchy into individual GovernanceIR rules while retaining parent-child traceability. Each dissolved rule carries a breadcrumb trail (e.g., `SOC2 > CC6 > CC6.1 > CC6.1.3`) in its provenance metadata, enabling auditors to navigate from a governance rule back to the originating compliance control.

**OG-S02: HIPAA Data Label Hierarchy** *(Sources: OG-S02-F01, F02)*: HIPAA safeguards introduce data classification labels (PHI, ePHI, de-identified, limited data set) that form a hierarchy of restrictiveness. OntologyIR maps these labels to GovernanceIR data handling rules, where the hierarchy determines which rules subsume which. A rule restricting PHI access automatically covers ePHI access because ePHI is a subset of PHI. The ontology compiler uses the label hierarchy to eliminate redundant rules during dissolution, reducing the compiled rule count without weakening governance.

**OG-S03: One-to-Many Concept Mapping** *(Sources: OG-S03-F01, F02, F03)*: A single ontology concept may map to multiple GovernanceIR rules. For example, the SOC2 CC6.1 control ("logical and physical access controls") generates separate rules for tool access restrictions, data access restrictions, and approval workflow requirements. The ontology mapping table declares these one-to-many relationships explicitly, and the dissolution pipeline validates that every ontology leaf node produces at least one GovernanceIR rule. Unmapped leaf nodes are flagged as coverage gaps.

**OG-S04: Zero-Runtime-Footprint Guarantee** *(Sources: OG-S04-F01, F02)*: OntologyIR compilation produces standard GovernanceIR rules that are indistinguishable from hand-authored rules at runtime. The ontology compiler is a build-time tool only -- no ontology data structures, resolution logic, or metadata survive into the compiled output. This zero-runtime-footprint guarantee means that workspaces consuming ontology-generated governance packages pay no performance penalty compared to hand-authored packages. The guarantee is enforced by a post-compilation assertion that scans the output for ontology-specific type markers.

**OG-S05: SkillIR Dissolution Pipeline** *(Sources: OG-S05-F01, F02, F03)*: When ontology nodes map to skill-level governance (e.g., "this control requires a specific audit skill"), the dissolution pipeline produces SkillIR fragments alongside GovernanceIR rules. These SkillIR fragments are compiled through the standard skill compilation path, ensuring that ontology-driven skills receive the same guard pass analysis, fence enforcement, and trust tier validation as manually declared skills. The SkillIR dissolution step runs after GovernanceIR dissolution and before the ANALYZE phase.

**OG-S06: Data-Driven Dissolution** *(Sources: OG-S06-F01, F02)*: The dissolution pipeline is data-driven: mapping tables, label hierarchies, and rule templates are all declared in YAML files, not hard-coded in the compiler. Adding a new compliance framework (e.g., NIST 800-53) requires authoring a new ontology YAML file and mapping table, with no changes to the OntologyIR compiler itself. This data-driven design enables enterprise customers to bring their own compliance frameworks without forking or extending the compiler codebase.

### Compiled Context (6 scenarios)

**CC-S01: Protected Flag Preservation in Forks** *(Sources: CC-S01-F01, F02, F03)*: When a fork context is created from a root context, all `protected` flags on root-level rules are preserved immutably in the fork. The fork cannot clear, downgrade, or override protected flags -- attempting to do so produces a compilation error with the specific rule and protection source identified. Protected flags propagate transitively: if a root context inherits a protected rule from a grandparent fleet policy, the fork also inherits the protection. This ensures that fleet-level security guarantees survive any depth of context forking.

**CC-S02: Reference-Based Storage Verification** *(Sources: CC-S02-F01, F02)*: Structural sharing between root and fork contexts uses content-addressed references (SHA-256 hashes of serialized rule content). When a fork is loaded, the runtime verifies each reference by recomputing the hash from the referenced content. Hash mismatch indicates either corruption or tampering and produces a hard compilation failure. This verification runs once per fork load, not per rule access, keeping the performance overhead constant regardless of the number of shared rules.

**CC-S03: Restrictiveness-Based Tightening** *(Sources: CC-S03-F01, F02, F03)*: Monotonic tightening is defined in terms of restrictiveness: a fork rule is more restrictive than a root rule if it blocks a strict superset of the behaviors that the root rule blocks. The tightening validator computes restrictiveness by comparing rule action sets (deny > review > audit > allow) and scope sets (narrower scope = more restrictive). A fork that attempts to widen scope or relax action level fails the tightening check with a structured diff showing exactly which dimension was weakened.

**CC-S04: Structural Diff Normalization** *(Sources: CC-S04-F01, F02)*: Fleet drift computation uses normalized structural diffs that are independent of rule ordering, whitespace, and comment differences. Normalization canonicalizes each rule into a deterministic form (sorted keys, stripped comments, normalized whitespace) before diffing. This prevents false-positive drift reports caused by reformatting or reordering that does not change governance semantics. The diff output includes a `semanticDrift` flag that distinguishes meaningful governance changes from cosmetic differences.

**CC-S05: Streaming Tree Loading** *(Sources: CC-S05-F01, F02, F03)*: Large fleet context collections (100+ forks) are loaded using streaming tree traversal rather than materializing the entire collection in memory. The context loader reads the root context first, then lazily loads fork contexts on demand as drift analysis or compilation requires them. This keeps memory usage proportional to the number of forks actively being processed rather than the total fleet size. Streaming loading is transparent to the compilation pipeline -- the context API presents the same interface regardless of loading strategy.

**CC-S06: Trust Boundary Serialization** *(Sources: CC-S06-F01, F02)*: When compiled contexts cross trust boundaries (e.g., fleet broadcast from a central governance team to workspace owners), the serialization format includes a signed envelope containing the context hash, the signer identity, and a timestamp. Receivers verify the signature against the fleet owner's public key before accepting the context. Unsigned or expired contexts are rejected. This prevents man-in-the-middle modification of governance policies during fleet broadcast, complementing the reference-based storage verification within a single trust boundary.

### Loss-Aware Emission (5 scenarios)

**LA-S01: Spec 108 Field Alignment** *(Sources: LA-S01-F01, F02, F03)*: The loss matrix for each target platform must align with Spec 108's field catalog, which defines the canonical set of governance fields that can appear in compiled output. Each cell in the loss matrix maps a Spec 108 field to a platform capability level (native, advisory, none). When Spec 108 is updated with new fields, the loss matrix must be regenerated -- stale matrices that reference removed fields or miss new fields fail the compilation pre-check. This alignment guarantee ensures that loss scoring reflects the current state of the governance field catalog.

**LA-S02: Multi-Hop Union Semantics** *(Sources: LA-S02-F01, F02)*: When a governance rule requires multiple platform capabilities to enforce (e.g., a tool restriction that needs both exec-approval and audit-logging), the loss score uses union semantics: the rule's loss is the maximum loss across all required capabilities, not the sum. This prevents double-counting when capabilities are partially overlapping. For multi-target builds (`claws build --target cursor,copilot`), the path enumerator selects the per-rule target with the lowest union loss, enabling cross-platform optimization.

**LA-S03: Non-Configurable R5 Strict-Loss** *(Sources: LA-S03-F01, F02, F03)*: R5 rules (non-negotiable security) always run in strict-loss mode where any loss score above 0.0 fails the build. This is not configurable -- there is no CLI flag, `claws.json` setting, or environment variable to override it. The rationale is fail-closed security: if a platform cannot natively enforce an R5 rule, the build must fail rather than silently degrading to advisory-only enforcement. The compilation error message for R5 strict-loss failure includes the specific platform capability gap and suggests alternative platforms that support the rule natively.

**LA-S04: Structured JSON Loss Reports** *(Sources: LA-S04-F01, F02)*: The CGR includes a structured JSON loss report containing per-rule loss breakdowns, per-platform capability matrices, and aggregate loss statistics (total loss, weighted loss, R5 violation count). The report format is defined in `@openclaw/governance-types` and is stable across claws versions. CI integrations consume the JSON report to enforce organizational loss budgets (e.g., "no build with aggregate loss > 2.5 may be deployed to production"). The report also includes remediation suggestions for high-loss rules.

**LA-S05: Semver Version Resolution** *(Sources: LA-S05-F01, F02, F03)*: Platform capability matrices are versioned using semver, and `claws build --target cursor@1.2` resolves to the capability matrix for Cursor version 1.2.x. When no version is specified, claws uses the latest known capability matrix. Version resolution follows npm semver range semantics, so `--target cursor@^1.0` resolves to the highest 1.x capability matrix available. This versioning enables enterprises to pin their builds to a known platform version, ensuring reproducible loss scores across compilation runs.

### Identity Bridge (6 scenarios)

**IB-S01: IdentityRoleMappingSchema Conformance** *(Sources: IB-S01-F01, F02, F03)*: The identity-to-trust-tier mapping in `claws.json` must conform to the IdentityRoleMappingSchema defined in `@openclaw/governance-types`. The schema validates that every declared identity provider (OIDC issuer URL or SAML entity ID) maps to exactly one trust tier (T0-T4), that no two providers map to the same tier without explicit `allowSharedTier: true`, and that the mapping covers all tiers referenced by governance rules. Schema violations are compilation errors, not warnings, ensuring that identity misconfiguration is caught before deployment.

**IB-S02: Escrow-Only Secret Resolution** *(Sources: IB-S02-F01, F02)*: OBO approval keys for R4 and R5 rules must be resolved through credential escrow -- inline keys in workspace files, environment variables, or CLI arguments are rejected at compile time. The escrow client authenticates via the identity bridge before retrieving keys, creating a two-factor verification chain: the identity bridge verifies the requester's trust tier, and the escrow service verifies the requester's key retrieval authorization. This separation prevents a compromised identity from directly accessing approval keys.

**IB-S03: Separation of Duties** *(Sources: IB-S03-F01, F02, F03)*: The identity bridge enforces separation of duties for governance-critical operations: the identity that authors a governance rule cannot be the same identity that approves its deployment. This is implemented as a compile-time check that compares the CGR provenance author identity against the OBO approval identity. Violations produce a structured error identifying both identities and the rule in question. Enterprises can configure exemptions for specific roles (e.g., a security team lead who both authors and approves emergency patches) via `claws.json`.

**IB-S04: Section Lock Fingerprinting** *(Sources: IB-S04-F01, F02)*: Section locks (FE6) on governance-critical files (SOUL.md, IDENTITY.md) include a fingerprint of the locked section's content at lock time. When a modification attempt is made, the identity bridge verifies both the modifier's trust tier and the section fingerprint. If the section content has been modified outside of the lock mechanism (e.g., direct file edit), the lock is invalidated and must be re-acquired. This prevents stale locks from protecting content that no longer matches the locked version.

**IB-S05: Fleet Identity Scoping** *(Sources: IB-S05-F01, F02, F03)*: Fleet identity mappings are scoped: the fleet owner defines a root identity mapping, and fork workspaces inherit it. Forks may add workspace-local identity providers but cannot modify or remove fleet-level mappings (monotonic tightening). When a fork adds a local provider, it must map to a trust tier equal to or lower than the highest fleet-level tier, preventing workspace-local identities from claiming fleet-level authority. The scoping rules are evaluated during context loading, before any compilation begins.

**IB-S06: Two-Phase OBO Verification** *(Sources: IB-S06-F01, F02)*: OBO approval verification runs in two phases: phase 1 verifies the approval token's cryptographic signature and expiration against the identity bridge, confirming that the approval was issued by a valid identity provider and has not expired. Phase 2 verifies the approval's scope -- that the approved operation matches the operation being attempted and that the approver's trust tier is sufficient for the rule's restriction level. Both phases must pass; a failure in either phase produces a structured error identifying the failing check. This two-phase design allows caching phase 1 results while always re-evaluating phase 2 scope checks.

## Constraints

- **The FORMA dual-path architecture is the reuse mechanism**: OC readers are FORMA-aware through `readOCWorkspaceViaFORMA()`. claws reuses FORMA, not individual readers.
- **Tension clusters encode governance priority**: The 7-cluster model with configurable ordering directly expresses enterprise governance hierarchy.
- **The eval framework is content-driven**: Adding governance evaluation means writing YAML rubrics and scenarios, not modifying the eval engine.
- **Contribute what anyone could build; keep what only you can build**: Runtime primitives (hash chains, OIDC, state machines) are standard patterns. Compile-time enforcement through the IR is the 18-month head start.
- **Define the interface before shipping the implementation**: The GuardrailProvider spec PR frames the conversation; packages prove execution.
- **Control release cadence for security-critical code**: Standalone packages (not PRs to OC core) let Craftworks hotfix audit-chain in hours, not weeks.
- **Never fork OpenClaw**: Maintenance tax and community hostility make forking catastrophically worse than any alternative.
- **InputResolver is the universal source abstraction**: All workspace content -- local files, packages, and URLs -- enters through InputResolver. No direct filesystem reads during PARSE.
- **Package output closes the ecosystem loop**: Published governance packages are consumable as InputResolver sources. The publish pipeline is not a separate system; it reuses `craft package`.
- **OntologyIR extends, never replaces, GovernanceIR**: Ontology compilation is an optional input path that generates standard GovernanceIR rules. Downstream phases are unaware of the origin.
- **Compiled context enforces monotonic tightening structurally**: Fork contexts cannot weaken root context rules. This is a compile-time guarantee, not a runtime check.
- **Loss-aware routing is per-rule, not per-build**: Each rule independently selects its lowest-loss emission path. R5 strict-loss is non-negotiable and non-configurable.
- **Identity bridge is the sole trust-tier authority**: Trust tier assignments always flow through identity bridge verification. No shortcut paths for tier assignment.

## Open Questions

1. Should claws ship `openclaw.format.yaml` as a FORMA mapping file for out-of-the-box CREST reuse?
2. Should the tension priority ordering be governance-specific or reuse the default A>C>B>D>F>E>G?
3. Should G2 governance rubrics be bundled with claws or maintained separately?
4. What is the right granularity for governance scenarios -- per conflict category (7) or per tool/boundary combination (hundreds)?
5. Should @openclaw/ scope registration be pursued immediately, or should Craftworks ship under @craftworks/ first?
6. How should the RELAX parser-injection pattern work in governance-rule-loader for enterprises that want RELAX policy expressions?
7. **RELAX tiered bindings conflict (flagged by dragon review)**: Spec 139 defines three binding tiers: compile-time, runtime, and hybrid. claws uses RELAX exclusively at compile time for zero-token-cost policy evaluation. However, Spec 139's runtime binding tier expects RELAX expressions to be evaluated against live agent state (current tool call context, session variables). If an enterprise policy requires runtime RELAX evaluation (e.g., "deny if session.tokenCount > budget.ceiling"), claws's compile-time-only model cannot express this. Options: (a) extend claws to support runtime RELAX evaluation via Gateway plugin hooks, (b) define a compile-time approximation that is conservative (over-deny), (c) document the limitation and defer to runtime-tier enforcement. This is an open architectural question that affects CL-03 (runtime enforcement) and CL-04 (compilation pipeline).
8. Should InputResolver support a fourth source type (`git`) for governance policies versioned in Git repositories without npm packaging?
9. How should `claws publish` handle badge metadata for packages that contain both governance rules and non-governance content?
10. Should OntologyIR support composition (importing one ontology into another), or should composition happen at the GovernanceIR level after compilation?
11. What is the maximum fleet size for compiled context structural sharing before broadcast payload becomes impractical? Is 1000 forks the ceiling?
12. Should the loss matrix be extensible by enterprises for custom/internal platforms, or is the 7-platform list fixed?
13. How should the identity bridge handle identity provider outages -- fail-closed (deny all OBO) or use cached tier assignments with a TTL?

## Research References

| Source | What it contributed |
|--------|-------------------|
| Q12p | 48 atoms reused, CREST-to-OC file mapping (7/12 reuse), tension-to-conflict mapping (5/7 auto-resolve), eval-to-test framework (G0-G3 tiers), FORMA dual-path as reuse mechanism |
| Q12b | Upstream contribution roadmap (3 waves, 16 weeks), contribute/keep boundary (18/8/4 split), GuardrailProvider spec PR, package strategy (@openclaw/ scope, MIT license, standalone monorepo), community demand alignment, ecosystem contribution model |

---

## Amendments (Horus wave, 2026-04-22 deploy)

### Amendment A — Peer Interfaces: GuardrailProvider + FileIngestProvider (§1a)

*Source: `.craft/waves/260416+horus-the-heir+clawc-migration/specs/drafts/CL-07-amendment-file-ingest-provider.md`. Adds `FileIngestProvider` as peer interface to `GuardrailProvider`; defines ProviderLifecycle.init(ctx) once-per-registration + HostContext field contract; declares the `HostAdapter` 4-method contract (extractIdentity / routePolicy / getApprovalSink / shapeResponse); declares the `ApprovalSink` interface. Landed via CP-5 (harness) and CP-6 (scenarios).*

### Amendment B — Snapshot-Switch Semantics (§1a Rules 1-4)

*Source: `.craft/waves/260416+horus-the-heir+clawc-migration/specs/drafts/CL-07-amendment-snapshot-switch-semantics.md`. Formalizes the 4 snapshot-switch rules: decision-start capture (Rule 1), admission gate on N+1 (Rule 2), hung/throw tolerance with `hookTimeoutMs` default 5s (Rule 3), per-provider audit via `OnSnapshotPromotedTimeoutEntry` (Rule 4). `DrainWindowEntry` emitted only when `inflightAtStart >= 1`. Implemented in harness pulse 41 and audit-types pulse 43.*

Both amendments landed in-repo as harness code + scenarios; canonical spec text in the drafts is preserved in the wave tree for provenance. Version: CL-07 bumps to v1.3 at deploy.
