# Trace: Init, Config, and Compile

> Covers: `atom:claws-init`, `atom:claws-json`, `atom:claws-compiler`

How a workspace goes from zero governance to compiled enforcement artifacts.

---

## Init Flow

```
  Empty workspace (or existing OC workspace)
       │
       ▼
  claws init
       │
       ├── [1. Detect workspace type]
       │       Is this CREST, OpenClaw, or bare?
       │       Read existing files to determine format
       │
       ├── [2. Scaffold governance files]
       │       Create SOUL.md (empty deny/require/limit/elicit sections)
       │       Create IDENTITY.md (default L0)
       │       Create USER.md (default authority scope)
       │       Existing files are NOT modified (lossless guarantee)
       │
       ├── [3. Generate claws.json]
       │       Default configuration for compilation
       │       Target platform: auto-detected
       │       Output directory: .claws/
       │
       └── [4. Initial compile]
              Run claws build to produce baseline artifacts
              Emit governance SKILL.md, plugin, exec-approvals
```

After init, the workspace has governance. It may be permissive (no deny rules, no gates), but the infrastructure is in place. Every subsequent `claws build` compiles the source files into enforcement artifacts.

---

## claws.json Configuration

```json
{
  "version": "0.9.0",
  "target": "claude-code",
  "output": ".claws/",
  "pinch": {
    "budget": 2000,
    "strategy": "semantic"
  },
  "enforcement": {
    "level": "standard",
    "elicitation": true,
    "sidecar": false
  },
  "diagnostics": {
    "level": "warning",
    "format": "terminal"
  }
}
```

Key fields:
- **target**: which platform the compiled plugin targets (claude-code, cursor, langchain, etc.)
- **pinch.budget**: token budget for the compressed SKILL.md
- **enforcement.level**: minimal (L1 only), standard (L1-L4), enterprise (L1-L5 with sidecar)
- **enforcement.sidecar**: enable L5 sidecar process

---

## Compile Pipeline

```
  claws build
       │
       ▼
  Phase 1: PARSE
       │   Read 9 source files (SOUL.md, AGENTS.md, TOOLS.md, ...)
       │   Strip BOMs, normalize line endings
       │   Parse each file independently (per-file error isolation)
       │   Produce per-file ASTs
       ▼
  Phase 2: EXTRACT
       │   Merge per-file ASTs into GovernanceIR
       │   Resolve cross-file references (SOUL deny → TOOLS tool name)
       │   Build CapabilityManifest
       ▼
  Phase 3: ANALYZE
       │   Evaluate 29 governance rules against GovernanceIR
       │   Classify tools (R1-R5)
       │   Detect delegation cycles, privilege escalation
       │   Produce GovAnalysis with per-rule verdicts
       ▼
  Phase 4: OPTIMIZE
       │   Dead-code elimination (unreachable governance paths)
       │   Pinch compression for SKILL.md
       │   Merge redundant rules
       │   Produce OptimizedPlan
       ▼
  Phase 5: EMIT
       │   Generate 4 artifacts:
       │   ├── skills/claws-governance/SKILL.md    (L1: advisory)
       │   ├── plugins/claws-governance/index.ts   (L2+L3: hooks)
       │   ├── exec-approvals.json                 (L4: host backup)
       │   └── lobster.compiled.yaml               (workflow: injected DAG)
       ▼
  Done (diagnostics summary)
```

The pipeline runs in under 2 seconds for typical workspaces. The 50ms latency budget applies to individual hook invocations at runtime, not to compilation.

---

## Related

- [claws init](../concepts/claws-init.md) -- getting started guide
- [claws.json](../concepts/claws-json.md) -- configuration reference
- [Compiler](../concepts/compiler.md) -- the 5-phase pipeline in depth
