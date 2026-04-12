# exp-a: CREST-to-OC File Mapping

**Status**: Complete
**Method**: Design analysis — read actual OC reader source files (`compiler-sdk/src/astro/readers/oc-*.ts`) and CREST format mapping (`compiler-sdk/src/astro/forma/mappings/crest.format.yaml`), CREST readers (`role-md-reader.ts`, `task-md-reader.ts`, `agents-md-reader.ts`)

---

## Per-File Mapping Table

| OC File | OC Reader | Output Type | Lines | CREST Equivalent | CREST Pattern Reuse | Reuse Classification |
|---------|-----------|-------------|-------|------------------|---------------------|---------------------|
| **SOUL.md** | `oc-soul.ts` | `OCSoulResult` (persona + boundaries + frontmatter) | 97 | ROLE.md (via `role-md-reader.ts`) + CHARTERS.md | **HIGH** — both extract persona/orientation from frontmatter + sections, both parse boundaries. ROLE.md reader has richer structured extraction (orientation, workflow, lens, expertise, tension). SOUL.md is a simplified subset. | REUSE-EXTEND |
| **TOOLS.md** | `oc-tools.ts` | `ToolGuidanceNode[]` | 87 | TOOLS.md in CREST (tool-list parse mode) | **MEDIUM** — CREST has `TOOLS.md` in `crest.format.yaml` mapped to `tool-list` parser. OC reader does heuristic table extraction. Could share the FORMA tool-list parser. | REUSE-EXTEND |
| **AGENTS.md** | `oc-agents.ts` | `AgentFrontmatter[]` | 159 | AGENTS.md (via `agents-md-reader.ts`) | **HIGH** — shared meta-format adapter already exists (`read-agents-md.ts` in Pulse 6a). The `agents-md-reader.ts` wraps this for CREST. OC reader does its own section-per-agent parsing but could delegate to the same meta adapter. | REUSE-DIRECT |
| **IDENTITY.md** | `oc-identity.ts` | `IdentityMeta` | 59 | *(no CREST equivalent)* | **NONE** — OC-specific concept (display_name, emoji, creature_type, tagline). Pure frontmatter extraction through Zod schema. Simple, standalone. | OC-STANDALONE |
| **USER.md** | `oc-user.ts` | `UserProfileNode` | 149 | *(no CREST equivalent)* | **LOW** — CREST has no user profile concept. OC reader uses heuristic section extraction (Preferences, Expertise, Communication Style). The section-parsing utilities (`parseSections`, `findSection`) are shared infrastructure from `formats/openclaw/index.js`. | OC-STANDALONE |
| **MEMORY.md** | `oc-memory.ts` | `OCMemoryEntry[]` | 86 | MEMORIES.md in CREST (memory-list parse mode) | **MEDIUM** — CREST has `MEMORIES.md` in `crest.format.yaml` mapped to `memory-list` parser. OC reader extracts section-per-entry with 5-tier scope system. CREST uses MemoryIR (M0-M6). The scope tier mapping (`projectMemoryScope`) bridges them. | REUSE-EXTEND |
| **HEARTBEAT.md** / **BOOT.md** | `oc-heartbeat.ts` | `OCStageLifecycle` (boot + heartbeat entries + TTL) | 183 | TASK.md (via `task-md-reader.ts`) / SCHEDULES.md in CREST | **MEDIUM** — CREST has both `TASKS.md` and `SCHEDULES.md`. OC HEARTBEAT.md maps to scheduled recurring tasks; BOOT.md maps to initialization tasks. The `task-md-reader.ts` is much richer (stages, gates, graph edges, dispatch config, port schema). OC lifecycle reader is simpler but could be enhanced with CREST task patterns for governance workflow steps. | REUSE-INSPIRE |
| **skills/** | `oc-skill.ts` | `OCSkillEntry[]` | 201 | SKILLS.md in CREST (skill-list parse mode) + shared `read-skill-dir.ts` | **HIGH** — shared skill directory reader (`read-skill-dir.ts`) already bridges both. OC reader produces `OCSkillEntry` which is a lightweight pre-SkillIR. CREST skill parsing is richer (from `crest.format.yaml` skill-list mode). The `readOCSkills` function delegates through the shared adapter. | REUSE-DIRECT |
| **lobster.yaml** | `oc-lobster.ts` | `StageTaskIR` | 465 | WORKFLOWS.md / PLAYBOOKS.md in CREST | **HIGH** — Lobster YAML compiles to the same `StageTaskIR` that CREST TASK.md produces. The `oc-lobster.ts` reader produces `CompiledStage[]`, `CompiledTask[]`, `TaskEdge[]` — the exact same IR types as `task-md-reader.ts` → `stagetask-ir-adapter.ts`. Bidirectional: includes `emitLobster()` for IR-to-YAML. | REUSE-DIRECT |
| **BOOTSTRAP.md** | `oc-bootstrap.ts` | `BootstrapConfig` | 44 | *(no CREST equivalent)* | **LOW** — OC-specific interview script concept. Thin wrapper: extracts frontmatter, re-serializes to YAML, feeds through FORMA `parseBootstrap()`. The FORMA parser is shared infrastructure. | OC-STANDALONE |
| **openclaw.json** | `oc-config.ts` | `OCProjectConfig` | 106 | *(no CREST equivalent — CREST uses `.craft/` namespace)* | **NONE** — OC-specific JSON config (project name, model, routing, security, runtime). Pure JSON extraction with passthrough for unknown fields. | OC-STANDALONE |
| **canvas/** | `oc-canvas.ts` | `OCCanvasManifest` | 83 | *(no CREST equivalent)* | **NONE** — OC-specific opaque file passthrough. Simple manifest builder, no parsing of contents. | OC-STANDALONE |

---

## Reuse Summary

| Classification | Count | Files |
|----------------|-------|-------|
| **REUSE-DIRECT** | 3 | AGENTS.md, skills/, lobster.yaml |
| **REUSE-EXTEND** | 3 | SOUL.md, TOOLS.md, MEMORY.md |
| **REUSE-INSPIRE** | 1 | HEARTBEAT.md/BOOT.md |
| **OC-STANDALONE** | 5 | IDENTITY.md, USER.md, BOOTSTRAP.md, openclaw.json, canvas/ |

**Verdict**: 7 of 12 OC file types benefit from CREST pattern reuse (3 direct, 3 extend, 1 inspire). 5 are OC-standalone but still use shared infrastructure (FORMA parser framework, `extractFrontmatter`, `parseSections`, Zod schemas).

---

## Shared Infrastructure Layer

All OC readers depend on shared infrastructure that IS the CREST pattern reuse:

| Module | What it provides | Used by (OC) | Used by (CREST) |
|--------|-----------------|--------------|-----------------|
| `formats/openclaw/index.js` | `extractFrontmatter`, `parseSections`, `findSection`, `parseMarkdownTable` | All 9 OC readers | Via FORMA parser |
| `forma/parse-boundaries.js` | `parseBoundaries` — dedup, structured boundary extraction | `oc-soul.ts` | ROLE.md reader, CHARTERS.md |
| `forma/parse-bootstrap.js` | `parseBootstrap` — interview config parsing | `oc-bootstrap.ts` | *(none)* |
| `meta/read-agents-md.ts` | Shared AGENTS.md meta-format adapter | `agents-md-reader.ts` | `agents-md-reader.ts` |
| `meta/read-skill-dir.ts` | Shared skill directory reader | `openclaw-reader.ts` | SKILLS.md parsing |
| `forma/index.js` | FORMA parser engine | `readOCWorkspaceViaFORMA` | All CREST files |
| `types/stage-task-ir.ts` | StageTaskIR, CompiledStage, CompiledTask, TaskEdge | `oc-lobster.ts` | `task-md-reader.ts` |

---

## CREST Atoms that Power OC Readers

| Atom | How it helps OC |
|------|----------------|
| A133 `atom:forma` | FORMA parser engine reads all 9 OC file types into FormaIR. The `readOCWorkspaceViaFORMA` dual-path uses FORMA as primary parser with heuristic shadow. |
| A134 `atom:forma-ir` | FormaIR is the intermediate representation that OC files parse into before lowering to ProgramIR. The `projectFormaToOCWorkspace()` function type-safely projects FormaIR to OCWorkspaceIR. |
| A135 `atom:format-mapping` | `crest.format.yaml` defines the vocabulary and file mappings. OC would need its own `openclaw.format.yaml` following the same schema. |
| A162 `atom:role-md-reader` | ROLE.md reader patterns (frontmatter + structured sections + tension validation) directly inform SOUL.md reader enhancement. |
| A161 `atom:task-md-reader` | TASK.md reader patterns (stages, gates, graph edges, dispatch) could enhance HEARTBEAT.md for governed lifecycle tasks. |
| A131 `atom:crest-yaml-reader` | YAML alternative format (`ROLES.yaml` shadows `ROLES.md`). OC files could support YAML alternatives for CI/CD-generated governance. |
| A111 `atom:crest-compact` | Single-file compact format. Could enable `OPENCLAW.md` for simple agents (like CREST.md for simple workspaces). |
| A126 `atom:body-file` | External file references for large policy definitions. Enterprise governance policies may exceed inline Markdown limits. |

---

## Key Finding: The OCWorkspaceIR is Already the Bridge

The `openclaw-reader.ts` file (209 lines) is the orchestrator that calls all individual OC readers and produces `OCWorkspaceIR`. Critically, it also includes:

1. **`readOCWorkspaceViaFORMA()`** — a dual-path adapter that runs FORMA as primary parser with heuristic shadow comparison
2. **`projectFormaToOCWorkspace()`** — type-safe projection from FormaIR to OCWorkspaceIR (no `as` casts per Spec 103 Amendment)
3. **`detectDivergence()`** — lightweight structural comparison between FORMA and heuristic paths

This means the CREST reuse is already architecturally present. The FORMA pipeline can parse OC files, the projection function bridges the IR gap, and divergence detection catches parser mismatches. claws's parser can reuse this entire infrastructure by:

1. Defining `openclaw.format.yaml` (like `crest.format.yaml`)
2. Running the FORMA pipeline with OC-specific vocabulary
3. Projecting FormaIR to GovernanceIR (extending the existing projection pattern)

**The OC readers are not just standalone parsers -- they are already FORMA-aware through the dual-path architecture.**
