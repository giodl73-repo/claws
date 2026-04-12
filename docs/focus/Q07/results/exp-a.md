# Experiment a: Platform Detection Matrix

**Question**: Q12g — What is the right glint.json schema for cross-platform governance?
**Experiment**: For each of the 7 supported platforms, document workspace markers, config locations, governance needs, and build output format.
**Method**: Design analysis
**Result**: Complete detection matrix with per-platform governance needs and build output specifications.

---

## Platform Detection Matrix

### 1. OpenClaw

| Aspect | Detail |
|--------|--------|
| **Marker files** | `SOUL.md` (primary), `AGENTS.md`, `IDENTITY.md`, `TOOLS.md`, `USER.md`, `MEMORY.md`, `lobster.yaml` |
| **Detection confidence** | `SOUL.md` alone = high confidence. `SOUL.md` + `AGENTS.md` = definitive. |
| **Platform config** | `~/.openclaw/openclaw.json` (global, NOT per-workspace) |
| **Per-workspace config** | None natively -- workspace is a flat file directory |
| **Build output** | `SOUL.md` amendments, `skills/glint-governance/SKILL.md`, `before_tool_call` hooks |

**Compilation needs**:
- Governance policies compile to OC skill format (`SKILL.md` in `skills/` directory)
- FE5 trust-tier rules emit as Gateway `before_tool_call` hooks
- FORMA amendments inject behavioral constraints into `AGENTS.md`
- Skill governance: validate skill trust tiers, tool permissions

**Governance concerns**:
- Skill trust classification (which skills get T0-T4 access)
- Tool hook enforcement via Gateway exec approval
- Memory governance (what gets persisted, retention policies)
- Channel security (which channels can trigger agent actions)
- Lobster workflow validation (cron job safety)

**Doctor checks**:
- OpenClaw Gateway running and reachable
- Gateway version compatibility
- Skill directory structure valid
- `openclaw.json` provider configuration present
- Memory backend accessible

---

### 2. Cursor

| Aspect | Detail |
|--------|--------|
| **Marker files** | `.cursorrules` (primary), `.cursor/` directory |
| **Detection confidence** | `.cursorrules` = definitive |
| **Platform config** | `.cursorrules` IS the config (single Markdown file) |
| **Per-workspace config** | `.cursorrules` (per-project rules for Cursor AI) |
| **Build output** | `.cursorrules` file (Markdown with rules sections) |

**Compilation needs**:
- Governance policies compile to Cursor rules format (Markdown prose)
- Rules are appended/merged into existing `.cursorrules` content
- Glint-managed section must be clearly delimited (e.g., `<!-- glint:start -->` / `<!-- glint:end -->`)
- No programmatic hook system -- all governance is instruction-based

**Governance concerns**:
- Rule conflict detection (user rules vs governance rules)
- Rule ordering (Cursor processes rules sequentially)
- No runtime enforcement -- governance is advisory (instruction-following)
- File access patterns (which files the AI can read/modify)
- No built-in trust tier system -- must be expressed as behavioral rules

**Doctor checks**:
- `.cursorrules` file exists and is parseable
- Glint-managed section intact (not manually corrupted)
- Cursor IDE installed and accessible
- No conflicting rule directives

---

### 3. Claude Code

| Aspect | Detail |
|--------|--------|
| **Marker files** | `CLAUDE.md` (primary), `.claude/` directory, `.claude/settings.json` |
| **Detection confidence** | `CLAUDE.md` = definitive. `.claude/` directory reinforces. |
| **Platform config** | `CLAUDE.md` (project instructions), `.claude/settings.json` (tool permissions) |
| **Per-workspace config** | `CLAUDE.md` + `.claude/settings.json` + `.claude/settings.local.json` |
| **Build output** | `CLAUDE.md` section + `.claude/settings.json` permissions |

**Compilation needs**:
- Governance policies compile to CLAUDE.md instruction sections
- Tool permissions map to `.claude/settings.json` allow/deny lists
- Trust tiers map to tool permission levels (Bash, Write, etc.)
- Glint-managed section delimited in CLAUDE.md
- MCP server configurations for governance tooling

**Governance concerns**:
- Tool permission governance (which tools are allowed: Bash, Write, Edit, etc.)
- Settings.json allow-list enforcement
- Hook configurations (pre-commit, custom hooks)
- MCP server trust (which MCP servers can be used)
- Memory/context governance (what persists across sessions)

**Doctor checks**:
- `CLAUDE.md` exists and is parseable
- `.claude/settings.json` permissions are consistent with trust tier
- Glint-managed sections intact
- Claude Code CLI installed
- No conflicting permission directives

---

### 4. GitHub Copilot

| Aspect | Detail |
|--------|--------|
| **Marker files** | `.github/copilot-instructions.md` (primary), `.github/` directory |
| **Detection confidence** | `.github/copilot-instructions.md` = definitive. `.github/` alone = low (many repos have `.github/`). |
| **Platform config** | `.github/copilot-instructions.md` (repo-level instructions) |
| **Per-workspace config** | `.github/copilot-instructions.md` + VS Code settings for Copilot |
| **Build output** | `.github/copilot-instructions.md` file |

**Compilation needs**:
- Governance policies compile to Copilot instruction format (Markdown)
- Instructions are repo-scoped (no per-directory override)
- Must coexist with existing Copilot instructions
- Glint-managed section delimited
- No programmatic enforcement -- instruction-based only

**Governance concerns**:
- Instruction-only governance (no runtime hooks)
- Organization-level vs repo-level policy inheritance
- Copilot Chat vs Copilot completions (different instruction surfaces)
- Secret detection (Copilot can see all repo files)
- No trust tier enforcement mechanism -- purely advisory

**Doctor checks**:
- `.github/copilot-instructions.md` exists
- Glint-managed section intact
- GitHub repo configured for Copilot
- Organization Copilot policies accessible (if fleet-managed)

---

### 5. AWS Bedrock

| Aspect | Detail |
|--------|--------|
| **Marker files** | `bedrock-guardrails.json` or `bedrock.json` (proposed), AWS CDK/SAM/CloudFormation templates referencing Bedrock |
| **Detection confidence** | No strong single marker. Detection heuristic: presence of `bedrock` in `*.json`/`*.yaml` configs + AWS SDK imports. |
| **Platform config** | AWS config (`~/.aws/config`, `~/.aws/credentials`), Bedrock guardrail API config |
| **Per-workspace config** | Infrastructure-as-code templates (CDK, SAM, CloudFormation) |
| **Build output** | Bedrock Guardrail policy JSON (API-compatible) |

**Compilation needs**:
- Governance policies compile to Bedrock Guardrail API JSON format
- Guardrail policies: content filters, denied topics, word filters, sensitive info filters
- Trust tiers map to Bedrock guardrail strength levels
- Output can be deployed via AWS CLI/SDK or IaC templates
- Must handle guardrail versioning (Bedrock supports guardrail versions)

**Governance concerns**:
- Content filtering policies (toxicity, PII, custom denied topics)
- Model access governance (which foundation models are allowed)
- Prompt injection protection
- Token budget enforcement via Bedrock provisioned throughput
- CloudTrail integration for audit
- Cross-region governance consistency
- IAM role trust boundaries

**Doctor checks**:
- AWS credentials configured and valid
- Bedrock API accessible in target region
- Existing guardrails queryable
- IAM permissions sufficient for guardrail management
- CloudTrail logging enabled

---

### 6. LangGraph

| Aspect | Detail |
|--------|--------|
| **Marker files** | `langgraph.json` (primary), Python files importing `langgraph` |
| **Detection confidence** | `langgraph.json` = definitive. Python imports = medium confidence. |
| **Platform config** | `langgraph.json` (graph definition + deployment config) |
| **Per-workspace config** | `langgraph.json` + Python graph definition files |
| **Build output** | Python guard decorator module + `langgraph.json` amendments |

**Compilation needs**:
- Governance policies compile to Python guard decorators
- Decorators wrap graph nodes with governance checks
- Trust tiers map to node-level permission scoping
- Human-in-the-loop checkpoints map to governance approval gates
- Output is a Python module importable by graph definitions

**Governance concerns**:
- Node-level tool access governance
- State mutation governance (what can be written to graph state)
- Human-in-the-loop enforcement at governance boundaries
- Subgraph trust delegation
- Thread-level budget tracking
- Checkpoint/persistence governance

**Doctor checks**:
- `langgraph.json` exists and is valid JSON
- Python environment has `langgraph` installed
- Graph definition files importable
- LangSmith API key configured (if tracing enabled)
- Guard decorator module importable

---

### 7. CrewAI

| Aspect | Detail |
|--------|--------|
| **Marker files** | `crewai.yaml` or `agents.yaml` (primary), Python files importing `crewai` |
| **Detection confidence** | `crewai.yaml` = definitive. `agents.yaml` = medium (ambiguous). Python imports = medium. |
| **Platform config** | `crewai.yaml` (crew + agent definitions) |
| **Per-workspace config** | `crewai.yaml` + `tasks.yaml` + agent Python files |
| **Build output** | YAML guard config appended to `crewai.yaml` + Python guardrail module |

**Compilation needs**:
- Governance policies compile to CrewAI YAML guard configuration
- Guard config extends `crewai.yaml` with governance section
- Trust tiers map to agent delegation boundaries
- Tool governance maps to CrewAI tool allow-lists per agent
- Python guardrail callbacks for runtime enforcement

**Governance concerns**:
- Agent delegation governance (which agents can delegate to which)
- Tool access per agent (CrewAI agents have individual tool lists)
- Task-level budget allocation
- Memory governance (shared vs agent-private memory)
- Process type governance (sequential vs hierarchical crew safety)
- Output validation (task output format enforcement)

**Doctor checks**:
- `crewai.yaml` exists and is valid YAML
- Python environment has `crewai` installed
- Agent definitions valid
- Tool imports resolvable
- API keys configured for underlying LLM providers

---

## Detection Priority and Conflict Resolution

When multiple platform markers are present (e.g., `SOUL.md` + `CLAUDE.md`), glint must resolve which platform(s) to target.

### Detection Algorithm

```
1. Scan workspace for all known marker files
2. Score each platform by marker confidence:
   - Primary marker present: +10
   - Secondary marker present: +3
   - Config file present: +5
3. If exactly one platform scores > 0: auto-detect that platform
4. If multiple platforms score > 0: list all detected, require explicit --target or targets in glint.json
5. If no platform detected: proceed with platform-agnostic governance only
```

### Conflict Resolution Rules

| Scenario | Resolution |
|----------|-----------|
| Single platform detected | Auto-select, `glint build` uses it |
| Multiple platforms detected | `glint build` fails with "multiple platforms detected, specify --target" unless `targets` configured in glint.json |
| No platform detected | `glint build` emits platform-agnostic IR only; `glint pinch` still works (policies are universal) |
| Explicit `platform` field in glint.json | Overrides auto-detection for `glint build` default |
| `targets` map in glint.json | Each target builds independently; `glint build` builds all configured targets |

---

## Build Output Summary

| Platform | Output format | Output location | Runtime enforcement |
|----------|---------------|-----------------|---------------------|
| OpenClaw | SOUL.md amendments + governance skill + tool hooks | `build/openclaw/` | Runtime (Gateway hooks) |
| Cursor | `.cursorrules` section | `build/cursor/` | Advisory (instruction-following) |
| Claude Code | `CLAUDE.md` section + `.claude/settings.json` | `build/claude/` | Semi-enforced (tool permissions) |
| GitHub Copilot | `.github/copilot-instructions.md` section | `build/github/` | Advisory (instruction-following) |
| AWS Bedrock | Guardrail policy JSON | `build/bedrock/` | Runtime (API-level guardrails) |
| LangGraph | Python guard decorators + langgraph.json | `build/langgraph/` | Runtime (decorator enforcement) |
| CrewAI | YAML guard config + Python guardrail module | `build/crewai/` | Semi-enforced (config + callbacks) |

### Enforcement Tiers

The platforms fall into three enforcement categories:

1. **Runtime-enforced** (OpenClaw, Bedrock): Platform has built-in enforcement mechanisms. Governance is programmatically enforced.
2. **Semi-enforced** (Claude Code, CrewAI): Platform has some permission/config mechanisms. Governance is partially enforced, partially advisory.
3. **Advisory-only** (Cursor, GitHub Copilot): Platform relies on instruction-following. Governance is expressed as rules/instructions with no programmatic enforcement.

This distinction matters for trust tier mapping: T3-T4 (critical/maximum trust) governance on advisory-only platforms requires additional compensating controls (e.g., pre-commit hooks via `glint pinch --staged`).

---

## Findings

1. **No universal marker**: Unlike build tools (package.json, Cargo.toml), agent platforms have heterogeneous workspace formats. Auto-detection must be heuristic, not deterministic.

2. **Enforcement asymmetry**: OpenClaw and Bedrock support runtime enforcement. Cursor and GitHub Copilot are instruction-only. This means the same governance policy compiles to fundamentally different output -- some enforceable, some advisory. The schema must track this.

3. **Bedrock is the outlier**: No local workspace files. Detection relies on IaC templates or explicit configuration. Bedrock workspaces are API-driven, not file-driven. The `platform` field in glint.json is essential for Bedrock (auto-detection won't work reliably).

4. **Multi-platform is real**: A monorepo might have `CLAUDE.md` for developers and deploy to Bedrock for production. The schema must support multiple simultaneous targets with independent build outputs.

5. **Platform-specific config is narrow**: Most governance (trust tiers, policies, audit, budget, compliance) is platform-agnostic. Platform-specific config is primarily about build output format and runtime integration points. This validates the core/targets split in the schema hypothesis.
